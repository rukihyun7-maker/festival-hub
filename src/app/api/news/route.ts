import { NextResponse } from 'next/server';
import { NEWS_KEYWORDS, type NewsFeedItem } from '@/lib/types';

/**
 * 뉴스레터 자동 피드 · Google 뉴스 RSS 검색(키/비용 없음)
 *  - 검색어 5종(페스티벌·행사·축제·푸드트럭·플리마켓)을 각각 조회해 병합·중복제거·최신순
 *  - 제목·출처·발행일·원문 링크만 전달(원문은 출처로 링크아웃)
 * 외부 Google 뉴스 fetch만 30분 캐시(next.revalidate), 라우트 자체는 매 요청 실행(응답 전체 캐시 방지).
 */
export const dynamic = 'force-dynamic';

function rss(keyword: string): string {
  const q = encodeURIComponent(`${keyword} when:30d`);
  return `https://news.google.com/rss/search?q=${q}&hl=ko&gl=KR&ceid=KR:ko`;
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();
}

function pick(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? decodeEntities(m[1]) : null;
}

// 모집공고 유입 훅: 지자체·행사·프로구단(K리그 등) 모집 공고를 뉴스에서 수집(category=모집공고 태깅)
const RECRUIT_QUERIES = [
  '푸드트럭 모집', '플리마켓 셀러 모집', '행사 부스 모집',
  'K리그 푸드트럭 모집', '경기장 푸드트럭 모집', // 프로축구 구단 홈경기장 모집(연초 공고)
];

async function fetchKeyword(query: string, label: string = query): Promise<NewsFeedItem[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(rss(query), { signal: ctrl.signal, next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const xml = await res.text();
    const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    const out: NewsFeedItem[] = [];
    for (const b of blocks.slice(0, 10)) {
      const rawTitle = pick(b, 'title');
      const link = pick(b, 'link');
      if (!rawTitle || !link) continue;
      const source = pick(b, 'source');
      const pub = pick(b, 'pubDate');
      // Google 뉴스 제목은 "헤드라인 - 출처" → 출처 접미사 제거
      const title = source && rawTitle.endsWith(` - ${source}`)
        ? rawTitle.slice(0, -(` - ${source}`).length)
        : rawTitle;
      out.push({
        title,
        link,
        source,
        pubDate: pub ? new Date(pub).toISOString() : null,
        keyword: label,
      });
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: Request) {
  const allQueries: { q: string; label: string }[] = [
    ...RECRUIT_QUERIES.map((q) => ({ q, label: '모집공고' })), // 모집공고 우선 태깅(중복 시 유지)
    ...NEWS_KEYWORDS.map((k) => ({ q: k, label: k })),
  ];
  const results = await Promise.all(allQueries.map(({ q, label }) => fetchKeyword(q, label)));

  if (new URL(req.url).searchParams.get('debug')) {
    return NextResponse.json({
      perQuery: allQueries.map(({ q }, i) => ({ q, count: results[i].length, first: results[i][0]?.title?.slice(0, 40) ?? null })),
    });
  }
  const seen = new Set<string>();
  const merged: NewsFeedItem[] = [];
  for (const item of results.flat()) {
    const key = item.link;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  const byDate = (a: NewsFeedItem, b: NewsFeedItem) => (b.pubDate ?? '').localeCompare(a.pubDate ?? '');
  // 모집공고는 최신순에 밀려 사라지지 않도록 별도 슬롯 보장(모집 15 + 일반 35)
  const recruit = merged.filter((i) => i.keyword === '모집공고').sort(byDate).slice(0, 15);
  const others = merged.filter((i) => i.keyword !== '모집공고').sort(byDate).slice(0, 35);
  const items = [...recruit, ...others].sort(byDate);
  return NextResponse.json({ items, keywords: [...NEWS_KEYWORDS, '모집공고'] });
}
