'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import {
  deleteEvent,
  fetchAllEventsAdmin,
  fetchMyProfile,
  updateEventStatus,
  fetchPendingEvents,
  approveEvent,
  rejectEvent,
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
  const [pending, setPending] = useState<EventRow[]>([]);

  useEffect(() => {
    (async () => {
      const p = await fetchMyProfile();
      setMe(p);
      try { setPending(await fetchPendingEvents()); } catch { /* 컬럼 미생성 등 무시 */ }
    })();
  }, []);

  async function handleApprove(id: string) {
    setActionId(id);
    try {
      await approveEvent(id);
      setPending((prev) => prev.filter((e) => e.id !== id));
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, review_status: 'approved' } : e)));
    } catch (e) { alert('승인 실패: ' + (e as Error).message); }
    finally { setActionId(null); }
  }

  async function handleReject(id: string) {
    const note = prompt('반려 사유를 입력하세요 (주최에게 표시됩니다)');
    if (note === null) return;
    setActionId(id);
    try {
      await rejectEvent(id, note);
      setPending((prev) => prev.filter((e) => e.id !== id));
    } catch (e) { alert('반려 실패: ' + (e as Error).message); }
    finally { setActionId(null); }
  }

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

        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="t-title mb-1">행사 등록 심사</h1>
            <p className="t-sub">주최사가 올린 등록 요청을 승인하면 셀러의 자리 찾기 목록에 노출됩니다.</p>
          </div>
        </div>

        {/* 관리자 직접 등록 */}
        <Link
          href="/host/create-event"
          className="block rounded-card p-6 mb-6 transition-transform hover:-translate-y-0.5"
          style={{ background: 'var(--ink, #14120E)' }}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[12px] font-extrabold tracking-[0.04em] mb-1.5" style={{ color: 'var(--accent, #FFC800)' }}>관리자 직접 등록</div>
              <div className="text-[17px] font-extrabold" style={{ color: '#fff' }}>주최사 요청 없이 바로 등록</div>
              <div className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>관리자가 올리면 승인 없이 즉시 셀러에게 공개됩니다.</div>
            </div>
            <span className="text-[22px] shrink-0 ml-3" style={{ color: 'var(--accent, #FFC800)' }}>+</span>
          </div>
        </Link>

        {/* 주최사 등록 요청 (승인 대기) */}
        <section className="mb-10">
          <div className="t-section mb-3">주최사 등록 요청 {pending.length > 0 && <span className="text-accent-warm">{pending.length}</span>}</div>
          {pending.length === 0 ? (
            <div className="card text-center py-10">
              <div className="text-[14px] font-semibold text-ink mb-1">대기 중인 등록 요청이 없습니다</div>
              <div className="t-sub">주최사가 행사를 등록하면 여기서 승인·반려할 수 있어요.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((e) => (
                <div key={e.id} className="card">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge badge-warning">심사 중</span>
                        <span className="badge">{e.category}</span>
                      </div>
                      <div className="text-[15px] font-extrabold text-ink truncate">{e.name}</div>
                      <div className="text-[12px] text-text-secondary mt-1">{e.organizer} · {periodLabel(e.start_date, e.end_date)} · {e.region}</div>
                      <div className="text-[12px] text-text-tertiary mt-0.5">참가비 {feeLabel(e.fee, e.fee_rate)}{e.capacity ? ` · 정원 ${e.capacity}` : ''}</div>
                      {e.description && <div className="text-[12px] text-text-secondary mt-2 leading-relaxed">{e.description}</div>}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-line-faint">
                    <button onClick={() => handleApprove(e.id)} disabled={actionId === e.id} className="btn-primary flex-1">
                      {actionId === e.id ? '처리 중…' : '승인하고 공개'}
                    </button>
                    <button onClick={() => handleReject(e.id)} disabled={actionId === e.id} className="btn-secondary flex-1">반려</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="t-section mb-3">전체 행사 관리</div>

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
