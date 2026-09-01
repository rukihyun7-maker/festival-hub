'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { fetchMyProfile, fetchMyApplications } from '@/lib/supabase/queries';
import { periodLabel } from '@/lib/types';
import type { Profile, ApplicationWithRelations, ApplicationStatus } from '@/lib/types';

/**
 * 내 신청 현황 (입점 파트너 · 설계 04)
 * 4단계 진행 바(접수 → 서류 검토 → 최종 심사 → 결과) + 상태 배지 + 주최 코멘트
 */

const STEPS = ['접수', '서류 검토', '최종 심사', '결과'];

function stepIndex(status: ApplicationStatus): number {
  if (status === 'approved' || status === 'rejected') return 3; // 결과 도달
  if (status === 'canceled') return 0;
  return 2; // pending: 최종 심사 진행 중
}

const STATUS_META: Record<ApplicationStatus, { label: string; cls: string }> = {
  pending: { label: '심사 중', cls: 'badge-warning' },
  approved: { label: '승인', cls: 'badge-success' },
  rejected: { label: '반려', cls: 'badge-danger' },
  canceled: { label: '취소', cls: 'badge-info' },
};

export default function SellerApplicationsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [apps, setApps] = useState<ApplicationWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | ApplicationStatus>('all');

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchMyProfile();
        setProfile(p);
        if (p) setApps(await fetchMyApplications(p.id));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(
    () => apps.filter((a) => filter === 'all' || a.status === filter),
    [apps, filter]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="seller" />
        <div className="container-app py-12">
          <div className="animate-pulse space-y-4 max-w-[720px]">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-28 bg-muted rounded w-full" />
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
          <div className="t-section text-[20px]">내 신청 현황</div>
          <div className="t-sub mt-1">신청 {apps.length}건의 심사 진행 상황입니다.</div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`chip ${filter === s ? 'selected' : ''}`}>
              {s === 'all' ? '전체' : STATUS_META[s].label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-[15px] font-bold text-ink mb-1">신청 내역이 없습니다</div>
            <div className="t-sub mb-5">행사를 찾아 신청하면 여기서 심사 진행을 확인할 수 있어요.</div>
            <Link href="/events" className="btn-primary inline-flex">행사 찾기</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((a) => {
              const meta = STATUS_META[a.status];
              const cur = stepIndex(a.status);
              return (
                <div key={a.id} className="card">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <div className="text-[15px] font-extrabold text-ink truncate">{a.event?.name ?? '행사'}</div>
                      {a.event && (
                        <div className="text-[12px] text-text-secondary mt-0.5">
                          {periodLabel(a.event.start_date, a.event.end_date)} · {a.event.region}
                        </div>
                      )}
                    </div>
                    <span className={`badge ${meta.cls} shrink-0`}>{meta.label}</span>
                  </div>

                  {/* 4단계 진행 바 */}
                  <div className="flex items-center">
                    {STEPS.map((label, i) => {
                      const done = i <= cur;
                      const isResult = i === 3;
                      const resultColor = a.status === 'rejected' ? 'var(--danger, #9B2C22)' : 'var(--success, #1D6B2A)';
                      const dotColor = done
                        ? (isResult && a.status !== 'pending' ? resultColor : 'var(--ink, #14120E)')
                        : 'var(--bg-muted, #F0ECE1)';
                      return (
                        <div key={label} className="flex items-center flex-1 last:flex-none">
                          <div className="flex flex-col items-center gap-1.5">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                              style={{ background: dotColor, color: done ? '#fff' : 'var(--text-tertiary, #756E5B)' }}
                            >
                              {done ? '✓' : i + 1}
                            </div>
                            <span className="text-[10.5px] font-semibold whitespace-nowrap" style={{ color: done ? 'var(--ink)' : 'var(--text-tertiary)' }}>
                              {label}
                            </span>
                          </div>
                          {i < STEPS.length - 1 && (
                            <div className="flex-1 h-[2px] mx-1 -mt-4" style={{ background: i < cur ? 'var(--ink, #14120E)' : 'var(--bg-muted, #F0ECE1)' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 주최 코멘트 */}
                  {a.memo && (
                    <div className="mt-4 p-3 rounded-input" style={{ background: 'var(--bg-surface-sunken, #FDFBF6)' }}>
                      <div className="text-[11px] font-bold text-text-tertiary mb-1">주최 의견</div>
                      <div className="text-[13px] text-ink-soft leading-relaxed">{a.memo}</div>
                    </div>
                  )}
                  <div className="text-[11px] text-text-tertiary mt-3">
                    신청일 {a.applied_at?.slice(0, 10).replace(/-/g, '.')}
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
