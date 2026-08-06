'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import {
  fetchMyProfile,
  fetchMyHostEvents,
  fetchApplicationsForEvent,
  updateApplicationStatus,
} from '@/lib/supabase/queries';
import type { Profile, EventRow, ApplicationWithRelations, ApplicationStatus } from '@/lib/types';

/**
 * 신청자 관리 (행사 주최)
 * 내 모든 행사의 신청을 한 큐에서 확인 · 승인/반려
 */

const STATUS_META: Record<ApplicationStatus, { label: string; cls: string }> = {
  pending: { label: '대기', cls: 'badge-warning' },
  approved: { label: '승인', cls: 'badge-success' },
  rejected: { label: '반려', cls: 'badge-danger' },
  canceled: { label: '취소', cls: 'badge-info' },
};

export default function HostApplicantsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [apps, setApps] = useState<ApplicationWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('pending');
  const [actionOn, setActionOn] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchMyProfile();
        setProfile(p);
        if (p) {
          const evs = await fetchMyHostEvents(p.id);
          setEvents(evs);
          const lists = await Promise.all(evs.map((e) => fetchApplicationsForEvent(e.id)));
          setApps(lists.flat());
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(
    () =>
      apps.filter(
        (a) =>
          (eventFilter === 'all' || a.event_id === eventFilter) &&
          (statusFilter === 'all' || a.status === statusFilter)
      ),
    [apps, eventFilter, statusFilter]
  );
  const pendingTotal = apps.filter((a) => a.status === 'pending').length;

  async function act(appId: string, status: 'approved' | 'rejected') {
    if (!profile) return;
    setActionOn(appId);
    try {
      await updateApplicationStatus(appId, status, profile.id);
      setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, status } : a)));
    } catch (e) {
      alert('상태 변경 실패: ' + (e as Error).message);
    } finally {
      setActionOn(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="host" />
        <div className="container-app py-12">
          <div className="animate-pulse space-y-4 max-w-[720px]">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-20 bg-muted rounded w-full" />
            <div className="h-20 bg-muted rounded w-full" />
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
        <div className="mb-6">
          <div className="t-section text-[20px]">신청자 관리</div>
          <div className="t-sub mt-1">대기 중 {pendingTotal}건 · 전체 {apps.length}건</div>
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-2 mb-3">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`chip ${statusFilter === s ? 'selected' : ''}`}>
              {s === 'all' ? '전체' : STATUS_META[s].label}
            </button>
          ))}
        </div>
        {events.length > 1 && (
          <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} className="input mb-5 max-w-[360px]">
            <option value="all">모든 행사</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        )}

        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-[15px] font-bold text-ink mb-1">해당 조건의 신청이 없습니다</div>
            <div className="t-sub">필터를 바꾸거나 새 행사를 등록해 신청을 받아보세요.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => {
              const meta = STATUS_META[a.status];
              const name = a.seller?.business_name || a.seller?.name || '(익명 파트너)';
              return (
                <div key={a.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge ${meta.cls}`}>{meta.label}</span>
                        <span className="text-[12px] text-text-tertiary truncate">{a.event?.name}</span>
                      </div>
                      <div className="text-[15px] font-extrabold text-ink truncate">{name}</div>
                      <div className="text-[12px] text-text-secondary mt-1">
                        {a.seller?.category ?? '업종 미기재'}{a.seller?.region ? ` · ${a.seller.region}` : ''}
                      </div>
                    </div>
                    <Link href={`/events/${a.event_id}`} className="text-[12px] font-semibold text-text-tertiary hover:text-ink shrink-0">
                      행사 보기
                    </Link>
                  </div>
                  {a.status === 'pending' && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-line-faint">
                      <button
                        onClick={() => act(a.id, 'approved')}
                        disabled={actionOn === a.id}
                        className="btn-primary flex-1"
                      >
                        {actionOn === a.id ? '처리 중…' : '승인'}
                      </button>
                      <button
                        onClick={() => act(a.id, 'rejected')}
                        disabled={actionOn === a.id}
                        className="btn-secondary flex-1"
                      >
                        반려
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
