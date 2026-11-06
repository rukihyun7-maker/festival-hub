'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { fetchMyProfile, fetchNewsletterPosts } from '@/lib/supabase/queries';
import type { Profile, NewsletterPost, NewsFeedItem } from '@/lib/types';

/**
 * 모집공고 전용 페이지 · 주최·파트너 열람
 *  - 상단: 관리자 큐레이션 '모집공고' 게시글
 *  - 하단: 자동 수집 모집공고(Google 뉴스 · 푸드트럭·셀러·부스·경기장/K리그)
 */
function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return '방금';
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

export default function RecruitPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<NewsletterPost[]>([]);
  const [feed, setFeed] = useState<NewsFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p: Profile | null = await fetchMyProfile();
        if (cancelled) return;
        setAuthed(!!p);
        if (p) fetchNewsletterPosts(true).then((d) => { if (!cancelled) setPosts(d.filter((x) => x.category === '모집공고')); }).catch(() => {});
      } catch { if (!cancelled) setAuthed(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/news')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setFeed((d.items ?? []).filter((x: NewsFeedItem) => x.keyword === '모집공고')); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (authed === false) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav />
        <div className="container-app py-12">
          <div className="card text-center py-12">
            <div className="text-[15px] font-bold text-ink mb-1">로그인이 필요합니다</div>
            <div className="t-sub mb-4">모집공고는 주최·입점 파트너 회원에게 제공됩니다.</div>
            <Link href="/login" className="btn-primary inline-flex">로그인 →</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-page">
      <AppNav />
      <div className="container-app py-8 md:py-12">
        <header className="mb-5">
          <h1 className="t-title mb-1">모집공고</h1>
          <p className="t-sub">푸드트럭·플리마켓 셀러·행사 부스·경기장(K리그 등) 모집 공고를 한곳에서. 지자체·행사 공고를 자동 수집합니다.</p>
        </header>

        {/* 관리자 큐레이션 모집공고 */}
        {posts.length > 0 && (
          <section className="mb-8">
            <h2 className="t-section mb-3">공식 모집 소식</h2>
            <div className="card divide-y divide-line-faint">
              {posts.map((p) => {
                const body = (
                  <div className="py-3 px-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="badge badge-warning">소식</span>
                      <span className="text-[11px] font-semibold" style={{ color: '#C2410C' }}>모집공고</span>
                    </div>
                    <div className="text-[14px] font-bold text-ink leading-snug line-clamp-2">{p.title}</div>
                    {p.summary && <div className="text-[12.5px] text-text-secondary mt-0.5 line-clamp-2">{p.summary}</div>}
                    <div className="text-[11px] text-text-tertiary mt-1">{p.source && `${p.source} · `}{new Date(p.created_at).toLocaleDateString('ko-KR')}{p.url && <span className="text-info"> · 자세히 ↗</span>}</div>
                  </div>
                );
                return p.url
                  ? <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className="block hover:bg-surface-sunken transition-colors">{body}</a>
                  : <div key={p.id}>{body}</div>;
              })}
            </div>
          </section>
        )}

        <h2 className="t-section mb-3">자동 수집 모집공고</h2>
        {loading && feed.length === 0 ? (
          <div className="card"><div className="animate-pulse space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-5 bg-muted rounded w-5/6" />)}</div></div>
        ) : feed.length === 0 ? (
          <div className="card text-center py-10 text-[13px] text-text-tertiary">
            지금 수집된 모집공고가 없습니다. 공고가 뉴스로 보도되면 자동으로 올라옵니다.
          </div>
        ) : (
          <div className="card divide-y divide-line-faint">
            {feed.map((item) => (
              <a key={item.link} href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-3 px-1 hover:bg-surface-sunken transition-colors">
                <span className="shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#FFF0E6', color: '#C2410C' }}>모집</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-ink leading-snug line-clamp-2">{item.title}</div>
                  <div className="text-[11.5px] text-text-tertiary mt-1">
                    {item.source && <span>{item.source}</span>}
                    {item.pubDate && <span> · {relTime(item.pubDate)}</span>}
                  </div>
                </div>
                <span className="text-text-tertiary text-[13px] shrink-0">↗</span>
              </a>
            ))}
          </div>
        )}

        <p className="mt-4 text-[11px] text-text-tertiary">
          ※ 구단·지자체 홈페이지에만 올라온 공고는 자동 수집이 안 될 수 있어요. 중요한 공고는 관리자가 직접 등록해 상단에 노출합니다.
        </p>
      </div>
    </main>
  );
}
