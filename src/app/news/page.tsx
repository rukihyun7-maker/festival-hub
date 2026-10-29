'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { fetchMyProfile, fetchNewsletterPosts } from '@/lib/supabase/queries';
import { NEWS_KEYWORDS } from '@/lib/types';
import type { Profile, NewsletterPost, NewsFeedItem } from '@/lib/types';

/**
 * 뉴스레터(소식) · 주최·파트너 열람
 *  - 상단: 관리자 큐레이션 게시글(수동)
 *  - 하단: 자동 뉴스피드(/api/news · Google 뉴스 RSS · 키워드 필터)
 */
export default function NewsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<NewsletterPost[]>([]);
  const [feed, setFeed] = useState<NewsFeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [kw, setKw] = useState<string>('전체');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await fetchMyProfile();
        if (cancelled) return;
        setProfile(p);
        setAuthed(!!p);
        if (p) {
          fetchNewsletterPosts(true).then((d) => { if (!cancelled) setPosts(d); }).catch(() => {});
        }
      } catch {
        if (!cancelled) setAuthed(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/news')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setFeed(d.items ?? []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setFeedLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filteredFeed = useMemo(
    () => (kw === '전체' ? feed : feed.filter((f) => f.keyword === kw)),
    [feed, kw],
  );

  if (authed === false) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav />
        <div className="container-app py-12">
          <div className="card text-center py-12">
            <div className="text-[15px] font-bold text-ink mb-1">로그인이 필요합니다</div>
            <div className="t-sub mb-4">뉴스레터는 주최·입점 파트너 회원에게 제공됩니다.</div>
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
        <header className="mb-6">
          <h1 className="t-title mb-1">뉴스레터</h1>
          <p className="t-sub">페스티벌·행사·축제·푸드트럭·플리마켓 소식을 한곳에서. 운영에 참고하세요.</p>
        </header>

        {/* 관리자 큐레이션 게시글 */}
        {posts.length > 0 && (
          <section className="mb-10">
            <h2 className="t-section mb-4">소식 · 공지</h2>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {posts.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          </section>
        )}

        {/* 자동 뉴스피드 */}
        <section>
          <div className="mb-3">
            <h2 className="t-section">실시간 뉴스</h2>
          </div>
          {/* 키워드 필터 */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {['전체', ...NEWS_KEYWORDS].map((k) => (
              <button key={k} onClick={() => setKw(k)} className={`chip ${kw === k ? 'selected' : ''}`}>{k}</button>
            ))}
          </div>

          {feedLoading ? (
            <div className="card"><div className="animate-pulse space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-5 bg-muted rounded w-5/6" />)}</div></div>
          ) : filteredFeed.length === 0 ? (
            <div className="card text-center py-10 text-[13px] text-text-tertiary">표시할 뉴스가 없습니다.</div>
          ) : (
            <div className="card divide-y divide-line-faint">
              {filteredFeed.map((f, i) => <FeedRow key={f.link + i} item={f} />)}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function PostCard({ post }: { post: NewsletterPost }) {
  const body = (
    <div className="card card-hover h-full flex flex-col">
      {post.image_url && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={post.image_url} alt="" className="w-full h-36 object-cover rounded-input mb-3" />
      )}
      <div className="t-card mb-1.5">{post.title}</div>
      {post.summary && <div className="text-[13px] text-text-secondary leading-relaxed flex-1 whitespace-pre-wrap">{post.summary}</div>}
      <div className="mt-3 flex items-center gap-2 text-[11px] text-text-tertiary">
        {post.source && <span>{post.source}</span>}
        <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
        {post.url && <span className="ml-auto text-info font-semibold">자세히 →</span>}
      </div>
    </div>
  );
  return post.url
    ? <a href={post.url} target="_blank" rel="noopener noreferrer" className="block">{body}</a>
    : <div>{body}</div>;
}

const KW_EMOJI: Record<string, string> = { 페스티벌: '🎪', 행사: '📅', 축제: '🎉', 푸드트럭: '🚚', 플리마켓: '🛍️' };
const KW_BG: Record<string, string> = { 페스티벌: '#EAF2FF', 행사: '#FFF3E0', 축제: '#FDEAF1', 푸드트럭: '#E9F7EF', 플리마켓: '#F3EEFB' };

function FeedRow({ item }: { item: NewsFeedItem }) {
  const when = item.pubDate ? relTime(item.pubDate) : '';
  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-3 px-1 hover:bg-surface-sunken transition-colors">
      {/* 키워드 색상 썸네일 타일 */}
      <span className="shrink-0 w-11 h-11 rounded-input flex items-center justify-center text-[20px]" style={{ background: KW_BG[item.keyword] ?? 'var(--bg-muted,#F0ECE1)' }} aria-hidden>
        {KW_EMOJI[item.keyword] ?? '📰'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-ink leading-snug line-clamp-2">{item.title}</div>
        <div className="text-[11.5px] text-text-tertiary mt-1 flex items-center gap-1.5">
          <span className="font-semibold text-info">{item.keyword}</span>
          {item.source && <span className="truncate">· {item.source}</span>}
          {when && <span>· {when}</span>}
        </div>
      </div>
      <span className="text-text-tertiary text-[13px] shrink-0">↗</span>
    </a>
  );
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return '방금';
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}
