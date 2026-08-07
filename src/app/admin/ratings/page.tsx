'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { fetchMyProfile, fetchAllRatings, deleteRating } from '@/lib/supabase/queries';
import type { Profile, RatingWithRelations } from '@/lib/types';

/**
 * 평가 관리 (관리자 · 설계 13)
 * 전체 평가 로그 + 부적절 평가 삭제(파트너 평균에 즉시 반영)
 */
export default function AdminRatingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rows, setRows] = useState<RatingWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchMyProfile();
        setProfile(p);
        if (p?.role === 'admin') setRows(await fetchAllRatings());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function remove(id: string) {
    if (!confirm('이 평가를 삭제할까요? 파트너 평균 평점에서 즉시 제외됩니다.')) return;
    setBusy(id);
    try {
      await deleteRating(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      alert('삭제 실패: ' + (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="admin" />
        <div className="container-app py-12">
          <div className="animate-pulse space-y-4 max-w-[820px]">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-20 bg-muted rounded w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="admin" />
        <div className="container-app py-12">
          <div className="card max-w-[640px]">
            <div className="text-[16px] font-bold text-ink mb-2">관리자 계정으로 로그인이 필요합니다</div>
            <Link href="/login" className="btn-primary inline-flex mt-2">로그인</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="admin" />
      <div className="container-app py-8 max-w-[820px]">
        <div className="mb-6">
          <div className="t-section text-[20px]">평가 관리</div>
          <div className="t-sub mt-1">전체 평가 {rows.length}건. 부적절한 평가를 삭제하면 파트너 평균에서 즉시 제외됩니다.</div>
        </div>

        {rows.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-[15px] font-bold text-ink mb-1">등록된 평가가 없습니다</div>
            <div className="t-sub">주최가 파트너를 평가하면 이곳에 로그가 쌓입니다.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const seller = r.seller?.business_name || r.seller?.name || '파트너';
              const host = r.host?.business_name || r.host?.name || '주최';
              const avg = ((r.hygiene + r.punctual + r.service) / 3).toFixed(1);
              return (
                <div key={r.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[15px] font-extrabold text-ink truncate">{seller}</span>
                        <span className="badge badge-warning">평균 {avg}</span>
                      </div>
                      <div className="text-[12px] text-text-secondary">
                        {host} · {r.event?.name ?? '행사 미상'} · {r.created_at.slice(0, 10).replace(/-/g, '.')}
                      </div>
                      <div className="text-[12px] text-text-tertiary mt-1">
                        위생 {r.hygiene} · 시간 {r.punctual} · 응대 {r.service}
                      </div>
                      {r.comment && <div className="text-[13px] text-ink-soft mt-2 leading-relaxed">“{r.comment}”</div>}
                    </div>
                    <button
                      onClick={() => remove(r.id)}
                      disabled={busy === r.id}
                      className="btn-secondary shrink-0 text-[13px]"
                      style={{ color: 'var(--danger, #9B2C22)' }}
                    >
                      {busy === r.id ? '삭제 중…' : '삭제'}
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
