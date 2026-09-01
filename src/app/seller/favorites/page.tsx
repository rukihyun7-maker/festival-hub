'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { fetchMyProfile, fetchMyFavorites, removeFavorite, setFavoriteNotify } from '@/lib/supabase/queries';
import { periodLabel, feeLabel, daysUntil, deadlineLabel } from '@/lib/types';
import type { Profile, FavoriteWithEvent } from '@/lib/types';

/**
 * 찜한 행사 (입점 파트너 · 설계 10)
 * D-day 순 정렬 + 행사별 마감 알림 on/off + 찜 해제
 */
export default function FavoritesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rows, setRows] = useState<FavoriteWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchMyProfile();
        setProfile(p);
        if (p) setRows(await fetchMyFavorites(p.id));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // D-day 순 (deadline 우선, 없으면 start_date), 지난 것은 뒤로
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const da = daysUntil(a.event?.deadline ?? a.event?.start_date ?? null);
      const db = daysUntil(b.event?.deadline ?? b.event?.start_date ?? null);
      const va = da === null ? 9999 : da < 0 ? 1000 - da : da;
      const vb = db === null ? 9999 : db < 0 ? 1000 - db : db;
      return va - vb;
    });
  }, [rows]);

  async function toggleNotify(fav: FavoriteWithEvent) {
    setBusy(fav.id);
    try {
      await setFavoriteNotify(fav.id, !fav.notify);
      setRows((prev) => prev.map((r) => (r.id === fav.id ? { ...r, notify: !r.notify } : r)));
    } finally {
      setBusy(null);
    }
  }

  async function unfavorite(fav: FavoriteWithEvent) {
    if (!profile || !fav.event) return;
    setBusy(fav.id);
    try {
      await removeFavorite(profile.id, fav.event.id);
      setRows((prev) => prev.filter((r) => r.id !== fav.id));
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="seller" />
        <div className="container-app py-12">
          <div className="animate-pulse space-y-4 max-w-[720px]">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-24 bg-muted rounded w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="seller" />
        <div className="container-app py-12">
          <div className="card max-w-[640px]">
            <div className="text-[16px] font-bold text-ink mb-2">로그인이 필요합니다</div>
            <Link href="/login" className="btn-primary inline-flex mt-2">로그인</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="seller" />
      <div className="container-app py-8 max-w-[760px]">
        <div className="mb-6">
          <div className="t-section text-[20px]">관심 행사</div>
          <div className="t-sub mt-1">마감 임박 순으로 정렬됩니다. 알림을 켜면 마감 전에 미리 받아볼 수 있어요.</div>
        </div>

        {sorted.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-[15px] font-bold text-ink mb-1">관심 행사가 없습니다</div>
            <div className="t-sub mb-5">관심 있는 행사를 등록해두면 마감 알림을 받을 수 있어요.</div>
            <Link href="/events" className="btn-primary inline-flex">행사 찾기</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((f) => {
              const e = f.event;
              if (!e) return null;
              const dday = daysUntil(e.deadline ?? e.start_date);
              const urgent = dday !== null && dday >= 0 && dday <= 3;
              return (
                <div key={f.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/events/${e.id}`} className="min-w-0 group">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge ${urgent ? 'badge-danger' : 'badge-warning'}`}>{deadlineLabel(e.deadline)}</span>
                        <span className="text-[12px] text-text-tertiary">{e.category}</span>
                      </div>
                      <div className="text-[15px] font-extrabold text-ink truncate group-hover:underline">{e.name}</div>
                      <div className="text-[12px] text-text-secondary mt-1">
                        {periodLabel(e.start_date, e.end_date)} · {e.region}
                      </div>
                      <div className="text-[12px] text-text-tertiary mt-0.5">참가비 {feeLabel(e.fee, e.fee_rate)}</div>
                    </Link>
                    <button
                      onClick={() => unfavorite(f)}
                      disabled={busy === f.id}
                      aria-label="관심 해제"
                      className="text-[18px] text-accent shrink-0 leading-none"
                      title="관심 해제"
                    >
                      ★
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-line-faint">
                    <span className="text-[12px] text-text-secondary">마감 알림</span>
                    <button
                      role="switch"
                      aria-checked={f.notify}
                      onClick={() => toggleNotify(f)}
                      disabled={busy === f.id}
                      className={`relative w-[46px] h-[26px] rounded-pill shrink-0 transition-colors ${f.notify ? 'bg-accent' : 'bg-muted'}`}
                    >
                      <span className={`absolute top-[3px] w-[20px] h-[20px] rounded-full bg-white shadow-sm transition-all ${f.notify ? 'left-[23px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
