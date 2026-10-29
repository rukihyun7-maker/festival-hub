'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import { fetchMyProfile, fetchNewsletterPosts } from '@/lib/supabase/queries';
import { NEWS_CATEGORIES } from '@/lib/types';
import type { Profile, NewsletterPost, NewsFeedItem } from '@/lib/types';

/**
 * 뉴스레터(소식) · 주최·파트너 열람
 *  - 상단: 공지 배너(관리자 발행)
 *  - 단일 피드: 관리자 글(소식, 상단 고정) + 자동 뉴스(최신순), 카테고리 탭으로 필터
 */
type FeedEntry =
  | { kind: 'post'; post: NewsletterPost }
  | { kind: 'news'; item: NewsFeedItem };

const CAT_EMOJI: Record<string, string> = { 페스티벌: '🎪', 행사: '📅', 축제: '🎉', 푸드트럭: '🚚', 플리마켓: '🛍️', 기타: '📌' };
const CAT_BG: Record<string, string> = { 페스티벌: '#EAF2FF', 행사: '#FFF3E0', 축제: '#FDEAF1', 푸드트럭: '#E9F7EF', 플리마켓: '#F3EEFB', 기타: '#EEEAE1' };

export default function NewsPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<NewsletterPost[]>([]);
  const [feed, setFeed] = useState<NewsFeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [cat, setCat] = useState<string>('전체');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p: Profile | null = await fetchMyProfile();
        if (cancelled) return;
        setAuthed(!!p);
        if (p) fetchNewsletterPosts(true).then((d) => { if (!cancelled) setPosts(d); }).catch(() => {});
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

  // 통합 피드: 관리자 글 + 자동 뉴스를 날짜 내림차순으로 혼합, 카테고리 필터
  const entries = useMemo<FeedEntry[]>(() => {
    const p = (cat === '전체' ? posts : posts.filter((x) => x.category === cat));
    const n = (cat === '전체' ? feed : feed.filter((x) => x.keyword === cat));
    const merged: FeedEntry[] = [
      ...p.map((post): FeedEntry => ({ kind: 'post', post })),
      ...n.map((item): FeedEntry => ({ kind: 'news', item })),
    ];
    const dateOf = (e: FeedEntry) => (e.kind === 'post' ? e.post.created_at : (e.item.pubDate ?? ''));
    return merged.sort((a, b) => dateOf(b).localeCompare(dateOf(a)));
  }, [posts, feed, cat]);

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
        {/* 공지 배너(관리자 발행 · 대상별) */}
        <AnnouncementBanner />

        <header className="mb-5">
          <h1 className="t-title mb-1">뉴스레터</h1>
          <p className="t-sub">페스티벌·행사·축제·푸드트럭·플리마켓 소식과 뉴스를 한곳에서. 운영에 참고하세요.</p>
        </header>

        {/* 카테고리 탭 */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {['전체', ...NEWS_CATEGORIES].map((k) => (
            <button key={k} onClick={() => setCat(k)} className={`chip ${cat === k ? 'selected' : ''}`}>{k}</button>
          ))}
        </div>

        {feedLoading && entries.length === 0 ? (
          <div className="card"><div className="animate-pulse space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-5 bg-muted rounded w-5/6" />)}</div></div>
        ) : entries.length === 0 ? (
          <div className="card text-center py-10 text-[13px] text-text-tertiary">표시할 소식이 없습니다.</div>
        ) : (
          <div className="card divide-y divide-line-faint">
            {entries.map((e) => e.kind === 'post'
              ? <PostRow key={`p-${e.post.id}`} post={e.post} />
              : <NewsRow key={`n-${e.item.link}`} item={e.item} />)}
          </div>
        )}
      </div>
    </main>
  );
}

function CatTile({ cat }: { cat: string }) {
  return (
    <span className="shrink-0 w-11 h-11 rounded-input flex items-center justify-center text-[20px]" style={{ background: CAT_BG[cat] ?? 'var(--bg-muted,#F0ECE1)' }} aria-hidden>
      {CAT_EMOJI[cat] ?? '📰'}
    </span>
  );
}

/** 관리자 글(소식) — 상단 고정 · '소식' 뱃지 · 이미지/요약 지원 */
function PostRow({ post }: { post: NewsletterPost }) {
  const body = (
    <div className="flex items-start gap-3 py-3 px-1">
      {post.image_url
        /* eslint-disable-next-line @next/next/no-img-element */
        ? <img src={post.image_url} alt="" className="shrink-0 w-11 h-11 rounded-input object-cover" />
        : <CatTile cat={post.category} />}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="badge badge-warning">소식</span>
          <span className="text-[11px] font-semibold text-accent-warm">{post.category}</span>
        </div>
        <div className="text-[14px] font-bold text-ink leading-snug line-clamp-2">{post.title}</div>
        {post.summary && <div className="text-[12.5px] text-text-secondary mt-0.5 line-clamp-2">{post.summary}</div>}
        <div className="text-[11px] text-text-tertiary mt-1">
          {post.source && <span>{post.source} · </span>}{new Date(post.created_at).toLocaleDateString('ko-KR')}
          {post.url && <span className="text-info"> · 자세히 ↗</span>}
        </div>
      </div>
    </div>
  );
  return post.url
    ? <a href={post.url} target="_blank" rel="noopener noreferrer" className="block hover:bg-surface-sunken transition-colors">{body}</a>
    : <div className="hover:bg-surface-sunken transition-colors">{body}</div>;
}

/** 자동 뉴스 — 컴팩트 */
function NewsRow({ item }: { item: NewsFeedItem }) {
  const when = item.pubDate ? relTime(item.pubDate) : '';
  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-3 px-1 hover:bg-surface-sunken transition-colors">
      <CatTile cat={item.keyword} />
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
