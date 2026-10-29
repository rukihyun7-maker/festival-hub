import { NextResponse } from 'next/server';
import { NEWS_KEYWORDS, type NewsFeedItem } from '@/lib/types';

/**
 * 뉴스레터 자동 피드 · Google 뉴스 RSS 검색(키/비용 없음)
 *  - 검색어 5종(페스티벌·행사·축제·푸드트럭·플리마켓)을 각각 조회해 병합·중복제거·최신순
 *  - 제목·출처·발행일·원문 링크만 전달(원문은 출처로 링크아웃)
 * 30분 캐시.
 */
export const revalidate = 1800;

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

async function fetchKeyword(keyword: string): Promise<NewsFeedItem[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(rss(keyword), { signal: ctrl.signal, next: { revalidate: 1800 } });
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
        keyword,
      });
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const results = await Promise.all(NEWS_KEYWORDS.map(fetchKeyword));
  const seen = new Set<string>();
  const merged: NewsFeedItem[] = [];
  for (const item of results.flat()) {
    const key = item.link;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  merged.sort((a, b) => (b.pubDate ?? '').localeCompare(a.pubDate ?? ''));
  return NextResponse.json({ items: merged.slice(0, 30), keywords: NEWS_KEYWORDS });
}
