'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { fetchMyProfile, fetchMyHostEvents } from '@/lib/supabase/queries';
import { periodLabel, feeLabel, daysUntil } from '@/lib/types';
import type { Profile, EventRow, EventStatus } from '@/lib/types';

/**
 * 내 행사 목록 (행사 주최)
 * 등록한 행사를 상태별로 확인 · 상세 편집/신청자 관리로 이동
 */

const STATUS_META: Record<EventStatus, { label: string; cls: string }> = {
  open: { label: '모집중', cls: 'badge-success' },
  upcoming: { label: '예정', cls: 'badge-info' },
  close: { label: '마감', cls: 'badge-warning' },
  canceled: { label: '취소', cls: 'badge-danger' },
};

export default function HostEventsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | EventStatus>('all');

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchMyProfile();
        setProfile(p);
        if (p) setEvents(await fetchMyHostEvents(p.id));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(
    () => events.filter((e) => filter === 'all' || e.status === filter),
    [events, filter]
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: events.length };
    for (const e of events) c[e.status] = (c[e.status] ?? 0) + 1;
    return c;
  }, [events]);

  if (loading) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="host" />
        <div className="container-app py-12">
          <div className="animate-pulse space-y-4 max-w-[720px]">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-24 bg-muted rounded w-full" />
            <div className="h-24 bg-muted rounded w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (!profile || profile.role !== 'host') {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="host" />
        <div className="container-app py-12">
          <div className="card max-w-[640px]">
            <div className="text-[16px] font-bold text-ink mb-2">행사 주최 계정으로 로그인이 필요합니다</div>
            <Link href="/login" className="btn-primary inline-flex mt-2">로그인</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="host" />
      <div className="container-app py-8 max-w-[860px]">
        <div className="flex items-end justify-between mb-6 gap-3">
          <div>
            <div className="t-section text-[20px]">내 행사</div>
            <div className="t-sub mt-1">등록한 행사 {events.length}건</div>
          </div>
          <Link href="/host/create-event" className="btn-primary shrink-0">+ 새 행사</Link>
        </div>

        <div className="flex gap-2 mb-5 overflow-x-auto">
          {(['all', 'open', 'upcoming', 'close', 'canceled'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`chip whitespace-nowrap ${filter === f ? 'selected' : ''}`}
            >
              {f === 'all' ? '전체' : STATUS_META[f].label} {counts[f] ? `(${counts[f]})` : ''}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-[15px] font-bold text-ink mb-1">
              {events.length === 0 ? '아직 등록한 행사가 없습니다' : '해당 상태의 행사가 없습니다'}
            </div>
            <div className="t-sub mb-5">첫 행사를 등록해서 파트너 신청을 받아보세요.</div>
            {events.length === 0 && <Link href="/host/create-event" className="btn-primary inline-flex">행사 등록하기</Link>}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((e) => {
              const meta = STATUS_META[e.status];
              const dday = daysUntil(e.start_date);
              return (
                <div key={e.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {e.review_status === 'pending' ? (
                          <span className="badge badge-warning">승인 대기</span>
                        ) : e.review_status === 'rejected' ? (
                          <span className="badge badge-danger">반려</span>
                        ) : (
                          <span className={`badge ${meta.cls}`}>{meta.label}</span>
                        )}
                        {dday !== null && dday >= 0 && e.status !== 'canceled' && e.review_status !== 'pending' && e.review_status !== 'rejected' && (
                          <span className="text-[12px] font-bold text-ink">D-{dday}</span>
                        )}
                      </div>
                      <div className="text-[15px] font-extrabold text-ink truncate">{e.name}</div>
                      {e.review_status === 'pending' && (
                        <div className="text-[12px] text-warning mt-1">관리자 승인 후 셀러에게 공개됩니다.</div>
                      )}
                      {e.review_status === 'rejected' && e.admin_note && (
                        <div className="text-[12px] text-danger mt-1">반려 사유: {e.admin_note}</div>
                      )}
                      <div className="text-[13px] text-text-secondary mt-1">
                        {periodLabel(e.start_date, e.end_date)} · {e.region}
                      </div>
                      <div className="text-[12px] text-text-tertiary mt-0.5">
                        참가비 {feeLabel(e.fee, e.fee_rate)}{e.capacity ? ` · 정원 ${e.capacity}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-line-faint">
                    <Link href="/host/applicants" className="btn-secondary flex-1 text-center">신청자 관리</Link>
                    <Link href={`/host/events/${e.id}/edit`} className="btn-secondary flex-1 text-center">행사 수정</Link>
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
