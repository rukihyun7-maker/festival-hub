'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { NewsFeedItem } from '@/lib/types';

/**
 * 홈 뉴스레터 배너 · 이름과 첫 카드 사이
 * 최신 뉴스 헤드라인을 자동 롤링하고 /news로 연결(가로폭 활용).
 * 뉴스가 없으면 기본 안내 문구로 진입점만 노출.
 */
export default function NewsBanner() {
  const [items, setItems] = useState<NewsFeedItem[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/news')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setItems((d.items ?? []).slice(0, 6)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 4500);
    return () => clearInterval(t);
  }, [items]);

  const cur = items[idx];

  return (
    <Link
      href="/news"
      aria-label="뉴스레터 보기"
      className="group flex items-center gap-3 rounded-card border border-line-faint px-4 py-3"
      style={{ background: 'var(--info-soft, #F4F7FE)' }}
    >
      <span className="shrink-0 inline-flex items-center gap-1.5 text-[13px] font-extrabold text-info">
        <span className="text-[16px] leading-none">📰</span>
        <span>뉴스레터</span>
      </span>
      <span className="shrink-0 w-px h-4 bg-line-faint" aria-hidden />
      <div className="min-w-0 flex-1 overflow-hidden">
        {cur ? (
          <div key={idx} className="truncate text-[14px] font-semibold text-ink animate-fh-up">
            {cur.title}
            {cur.source && <span className="font-normal text-text-tertiary"> · {cur.source}</span>}
          </div>
        ) : (
          <div className="truncate text-[14px] font-medium text-text-secondary">
            페스티벌·행사·축제·푸드트럭·플리마켓 소식 모아보기
          </div>
        )}
      </div>
      <span className="shrink-0 text-[12.5px] font-bold text-info transition-transform group-hover:translate-x-0.5">
        더보기 →
      </span>
    </Link>
  );
}
