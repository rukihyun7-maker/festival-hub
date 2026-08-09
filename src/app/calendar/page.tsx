'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import {
  fetchMyProfile, fetchMyHostEvents, fetchMyApplications,
  fetchMyPersonalEvents, addPersonalEvent, deletePersonalEvent,
} from '@/lib/supabase/queries';
import { periodLabel } from '@/lib/types';
import type { Profile } from '@/lib/types';

/**
 * 일정 캘린더
 * 플랫폼 행사(입점 파트너=신청 승인/대기, 주최=등록) + 개인(수기) 일정
 */

type CalEvent = { id: string; name: string; start: string; end: string; tone: 'approved' | 'pending' | 'own' | 'personal'; pid?: string; memo?: string | null };

const pad = (n: number) => String(n).padStart(2, '0');
const dstr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const TONE: Record<CalEvent['tone'], { bg: string; fg: string; label: string }> = {
  approved: { bg: '#E2F3E4', fg: '#1D6B2A', label: '승인' },
  pending: { bg: '#FFF3C4', fg: '#7A5B00', label: '대기' },
  own: { bg: '#E9EEFB', fg: '#2B4B9B', label: '등록' },
  personal: { bg: '#F0ECE1', fg: '#3C3626', label: '내 일정' },
};

export default function CalendarPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [platform, setPlatform] = useState<CalEvent[]>([]);
  const [personal, setPersonal] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });

  // 수기 일정 추가 폼
  const [showForm, setShowForm] = useState(false);
  const [fTitle, setFTitle] = useState('');
  const [fStart, setFStart] = useState('');
  const [fEnd, setFEnd] = useState('');
  const [fMemo, setFMemo] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadPersonal(uid: string) {
    const ps = await fetchMyPersonalEvents(uid);
    setPersonal(ps.map((p) => ({ id: p.id, pid: p.id, name: p.title, start: p.start_date, end: p.end_date, memo: p.memo, tone: 'personal' as const })));
  }

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchMyProfile();
        setProfile(p);
        if (!p) return;
        if (p.role === 'host' || p.role === 'admin') {
          const evs = await fetchMyHostEvents(p.id);
          setPlatform(evs.filter((e) => e.start_date && e.end_date).map((e) => ({ id: e.id, name: e.name, start: e.start_date, end: e.end_date, tone: 'own' as const })));
        } else {
          const apps = await fetchMyApplications(p.id);
          setPlatform(apps.filter((a) => a.event && (a.status === 'approved' || a.status === 'pending')).map((a) => ({ id: a.event!.id, name: a.event!.name, start: a.event!.start_date, end: a.event!.end_date, tone: a.status === 'approved' ? 'approved' as const : 'pending' as const })));
        }
        await loadPersonal(p.id);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const events = useMemo(() => [...platform, ...personal], [platform, personal]);

  async function submitPersonal(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !fTitle.trim() || !fStart) return;
    setSaving(true);
    try {
      await addPersonalEvent({ user_id: profile.id, title: fTitle.trim(), start_date: fStart, end_date: fEnd || fStart, memo: fMemo.trim() || null });
      await loadPersonal(profile.id);
      setFTitle(''); setFStart(''); setFEnd(''); setFMemo(''); setShowForm(false);
    } catch (err) {
      alert('저장 실패: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function removePersonal(pid: string) {
    if (!confirm('이 일정을 삭제할까요?')) return;
    try { await deletePersonalEvent(pid); if (profile) await loadPersonal(profile.id); }
    catch (err) { alert('삭제 실패: ' + (err as Error).message); }
  }

  const { cells, monthEvents } = useMemo(() => {
    const { y, m } = cursor;
    const firstWeekday = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const monthStart = dstr(y, m, 1), monthEnd = dstr(y, m, days);
    const monthEvents = events.filter((e) => e.start <= monthEnd && e.end >= monthStart);
    return { cells, monthEvents };
  }, [cursor, events]);

  function eventsOn(day: number) {
    const ds = dstr(cursor.y, cursor.m, day);
    return events.filter((e) => e.start <= ds && e.end >= ds);
  }
  function shift(delta: number) {
    setCursor((c) => { const d = new Date(c.y, c.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  }
  const isToday = (day: number) => cursor.y === now.getFullYear() && cursor.m === now.getMonth() && day === now.getDate();

  return (
    <main className="min-h-screen bg-page">
      <AppNav role={profile?.role === 'host' ? 'host' : profile?.role === 'admin' ? 'admin' : 'seller'} />
      <div className="container-app py-8 max-w-[860px]">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="t-title mb-1">일정</h1>
            <p className="t-sub">
              {profile?.role === 'host' || profile?.role === 'admin' ? '내가 등록한 행사' : '신청 승인·대기 행사'} + 직접 추가한 일정을 함께 관리합니다.
            </p>
          </div>
          <button onClick={() => setShowForm((v) => !v)} className="btn-primary text-[13px] shrink-0">
            {showForm ? '닫기' : '+ 일정 추가'}
          </button>
        </div>

        {/* 수기 일정 추가 폼 */}
        {showForm && (
          <form onSubmit={submitPersonal} className="card mb-5">
            <div className="t-section mb-3">직접 일정 추가</div>
            <div className="grid gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-ink-soft">제목</span>
                <input value={fTitle} onChange={(e) => setFTitle(e.target.value)} required className="input" placeholder="예: 사장님 미팅 / 재료 준비 / 개인 행사" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-ink-soft">시작일</span>
                  <input type="date" value={fStart} onChange={(e) => setFStart(e.target.value)} required className="input" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-ink-soft">종료일 <span className="text-text-tertiary font-normal">(하루면 비워두기)</span></span>
                  <input type="date" value={fEnd} onChange={(e) => setFEnd(e.target.value)} min={fStart} className="input" />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-ink-soft">메모 <span className="text-text-tertiary font-normal">(선택)</span></span>
                <input value={fMemo} onChange={(e) => setFMemo(e.target.value)} className="input" placeholder="간단한 메모" />
              </label>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? '저장 중…' : '일정 저장'}</button>
            </div>
          </form>
        )}

        {/* 월 네비 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => shift(-1)} className="btn-secondary py-1.5 px-3 text-[13px]">‹</button>
            <div className="text-[17px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>{cursor.y}년 {cursor.m + 1}월</div>
            <button onClick={() => shift(1)} className="btn-secondary py-1.5 px-3 text-[13px]">›</button>
          </div>
          <button onClick={() => setCursor({ y: now.getFullYear(), m: now.getMonth() })} className="text-[12px] font-semibold text-accent-warm hover:text-accent-deep">오늘</button>
        </div>

        {loading ? (
          <div className="card"><div className="animate-pulse h-64 bg-muted rounded" /></div>
        ) : (
          <>
            <div className="card p-2 sm:p-3">
              <div className="grid grid-cols-7 mb-1">
                {WEEK.map((w, i) => (
                  <div key={w} className={`text-center text-[11px] font-bold py-1 ${i === 0 ? 'text-danger' : i === 6 ? 'text-info' : 'text-text-tertiary'}`}>{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, i) => (
                  <div key={i} className={`min-h-[64px] sm:min-h-[80px] rounded-input p-1 ${day ? '' : 'opacity-0'}`} style={{ background: day && isToday(day) ? 'var(--warning-bg,#FFF3C4)' : 'var(--bg-surface-sunken,#FDFBF6)' }}>
                    {day && (
                      <>
                        <div className={`text-[11px] font-bold mb-0.5 ${i % 7 === 0 ? 'text-danger' : i % 7 === 6 ? 'text-info' : 'text-text-secondary'}`}>{day}</div>
                        <div className="space-y-0.5">
                          {eventsOn(day).slice(0, 3).map((e) => (
                            <div key={e.id + (e.pid ?? '')} className="truncate text-[10px] font-semibold px-1 py-0.5 rounded" style={{ background: TONE[e.tone].bg, color: TONE[e.tone].fg }} title={e.name}>
                              {e.name}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 이 달 일정 목록 */}
            <div className="mt-6">
              <div className="t-section mb-3">{cursor.m + 1}월 일정 {monthEvents.length}건</div>
              {monthEvents.length === 0 ? (
                <div className="card text-center py-10">
                  <div className="text-[14px] font-semibold text-ink mb-1">이 달 일정이 없습니다</div>
                  <div className="t-sub">‘+ 일정 추가’로 직접 등록하거나, 플랫폼 행사를 신청해보세요.</div>
                </div>
              ) : (
                <div className="card p-0 overflow-hidden">
                  {monthEvents.slice().sort((a, b) => a.start.localeCompare(b.start)).map((e, i, arr) => (
                    <div key={e.id + (e.pid ?? '')} className={`flex items-center justify-between gap-3 p-4 ${i !== arr.length - 1 ? 'border-b border-line-faint' : ''}`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold text-ink truncate">{e.name}</span>
                          <span className="badge shrink-0" style={{ background: TONE[e.tone].bg, color: TONE[e.tone].fg }}>{TONE[e.tone].label}</span>
                        </div>
                        <div className="text-[12px] text-text-secondary mt-0.5">
                          {periodLabel(e.start, e.end)}{e.memo ? ` · ${e.memo}` : ''}
                        </div>
                      </div>
                      {e.tone === 'personal' ? (
                        <button onClick={() => removePersonal(e.pid!)} className="text-[12px] font-semibold text-danger hover:underline shrink-0">삭제</button>
                      ) : (
                        <Link href={`/events/${e.id}`} className="text-[12px] font-bold text-info shrink-0">상세 →</Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
