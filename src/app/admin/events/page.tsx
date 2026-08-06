'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import {
  deleteEvent,
  fetchAllEventsAdmin,
  fetchMyProfile,
  updateEventStatus,
} from '@/lib/supabase/queries';
import { periodLabel, deadlineLabel, feeLabel } from '@/lib/types';
import type { EventRow, Profile } from '@/lib/types';

/**
 * 행사 검수 · Admin only
 * 상태 필터 + 검색 + 인라인 상태 변경 + 삭제
 */

type StatusFilter = 'all' | 'open' | 'upcoming' | 'close' | 'canceled';

export default function AdminEventsPage() {
  const [me, setMe] = useState<Profile | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const p = await fetchMyProfile();
      setMe(p);
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchAllEventsAdmin({ q, status: statusFilter });
        if (!cancelled) setEvents(data);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, statusFilter]);

  async function changeStatus(id: string, status: 'open' | 'upcoming' | 'close' | 'canceled') {
    setActionId(id);
    try {
      await updateEventStatus(id, status);
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
    } catch (e) {
      alert('변경 실패: ' + (e as Error).message);
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}"을 삭제하시겠어요?\n관련된 신청/매출도 함께 삭제됩니다 (CASCADE).\n이 작업은 되돌릴 수 없습니다.`)) return;
    setActionId(id);
    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      alert('삭제 실패: ' + (e as Error).message);
    } finally {
      setActionId(null);
    }
  }

  if (me && me.role !== 'admin') {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="admin" />
        <div className="container-app py-12">
          <div className="card">
            <div className="text-[16px] font-bold text-ink mb-2">관리자 권한이 필요합니다</div>
            <Link href="/login" className="btn-primary">관리자로 로그인 →</Link>
          </div>
        </div>
      </main>
    );
  }

  const counts = {
    open: events.filter((e) => e.status === 'open').length,
    upcoming: events.filter((e) => e.status === 'upcoming').length,
    close: events.filter((e) => e.status === 'close').length,
    canceled: events.filter((e) => e.status === 'canceled').length,
  };

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="admin" />

      <div className="container-app py-8 md:py-12">
        <nav className="text-[12px] font-semibold text-text-tertiary mb-4">
          <Link href="/admin" className="hover:text-ink">인사이트</Link>
          <span className="mx-2">/</span>
          <span className="text-ink">행사 검수</span>
        </nav>

        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="t-title mb-1">행사 검수</h1>
            <p className="t-sub">
              전체 {events.length}건 · 모집 {counts.open} · 예정 {counts.upcoming} · 종료 {counts.close} · 취소 {counts.canceled}
            </p>
          </div>
        </div>

        {/* 검색 + 필터 */}
        <div className="card mb-6">
          <div className="flex flex-col gap-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="행사명 검색"
              className="input"
            />
            <div className="flex flex-wrap gap-1.5">
              <button className={`chip ${statusFilter === 'all' ? 'selected' : ''}`} onClick={() => setStatusFilter('all')}>전체</button>
              <button className={`chip ${statusFilter === 'open' ? 'selected' : ''}`} onClick={() => setStatusFilter('open')}>모집 중</button>
              <button className={`chip ${statusFilter === 'upcoming' ? 'selected' : ''}`} onClick={() => setStatusFilter('upcoming')}>예정</button>
              <button className={`chip ${statusFilter === 'close' ? 'selected' : ''}`} onClick={() => setStatusFilter('close')}>종료</button>
              <button className={`chip ${statusFilter === 'canceled' ? 'selected' : ''}`} onClick={() => setStatusFilter('canceled')}>취소</button>
            </div>
          </div>
        </div>

        {error && (
          <div className="card mb-6" style={{ borderColor: '#E0DACB' }}>
            <div className="text-[13px] font-bold text-warning mb-1">오류</div>
            <div className="text-[12px] text-text-secondary">{error}</div>
          </div>
        )}

        {/* 리스트 */}
        {loading ? (
          <div className="card">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-[15px] font-semibold text-ink mb-2">조건에 맞는 행사가 없습니다</div>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            {events.map((e, i) => (
              <div key={e.id} className={`p-5 ${i !== events.length - 1 ? 'border-b border-line-faint' : ''} hover:bg-surface-sunken transition-colors`}>
                <div className="grid gap-4 items-start" style={{ gridTemplateColumns: 'minmax(240px, 2fr) auto' }}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Link href={`/events/${e.id}`} className="text-[15px] font-extrabold text-ink hover:underline truncate">
                        {e.name}
                      </Link>
                      <StatusBadge status={e.status} />
                      <span className="badge">{e.category}</span>
                      {e.deadline && <span className="text-[10px] font-bold text-warning">{deadlineLabel(e.deadline)}</span>}
                    </div>
                    <div className="text-[12px] text-text-secondary mb-1">
                      {e.organizer} · {periodLabel(e.start_date, e.end_date)} · {e.region}
                    </div>
                    <div className="text-[11px] text-text-tertiary">
                      참가비 {feeLabel(e.fee, e.fee_rate)} · 등록 {new Date(e.created_at).toLocaleDateString('ko-KR')}
                      {e.contact && ` · ${e.contact}`}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    <select
                      value={e.status}
                      onChange={(ev) => changeStatus(e.id, ev.target.value as 'open' | 'upcoming' | 'close' | 'canceled')}
                      disabled={actionId === e.id}
                      className="input py-2 text-[12px]"
                      style={{ minWidth: 110 }}
                    >
                      <option value="open">모집 중</option>
                      <option value="upcoming">예정</option>
                      <option value="close">종료</option>
                      <option value="canceled">취소</option>
                    </select>
                    <button
                      disabled={actionId === e.id}
                      onClick={() => handleDelete(e.id, e.name)}
                      className="text-[12px] text-danger hover:underline font-semibold px-2 disabled:opacity-30"
                    >
                      {actionId === e.id ? '…' : '삭제'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 rounded-card bg-danger-bg border border-danger/20">
          <div className="text-[12px] font-bold text-danger mb-1">주의</div>
          <div className="text-[11px] text-danger leading-[1.6]">
            행사 삭제 시 관련된 신청·매출·시뮬레이션 데이터가 함께 삭제됩니다. 부적절 공고는 우선 취소(canceled) 상태로 전환하고 실 삭제는 신중히.
          </div>
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: EventRow['status'] }) {
  const map = {
    open: { label: '모집 중', cls: 'badge-success' },
    upcoming: { label: '예정', cls: 'badge-info' },
    close: { label: '종료', cls: '' },
    canceled: { label: '취소', cls: 'badge-danger' },
  };
  const b = map[status];
  return <span className={`badge ${b.cls}`}>{b.label}</span>;
}
