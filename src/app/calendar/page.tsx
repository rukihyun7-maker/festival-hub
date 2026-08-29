'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import {
  fetchMyProfile, fetchMyHostEvents, fetchMyApplications, fetchMyFavorites,
  fetchMyPersonalEvents, addPersonalEvent, deletePersonalEvent, fetchEvents,
} from '@/lib/supabase/queries';
import { periodLabel, eventType } from '@/lib/types';
import type { Profile } from '@/lib/types';

/**
 * 일정 캘린더 · 2트랙
 *  - 내 일정: 신청 승인/대기 + 관심 + 직접추가 (개인 트랙)
 *  - 행사 달력: 전국 축제·행사(정보형) 전체 (탐색 트랙) · 날짜 클릭 시 하단 리스트
 */

type CalTone = 'approved' | 'pending' | 'own' | 'personal' | 'fav' | 'festival' | 'happening';
type CalEvent = { id: string; name: string; start: string; end: string; tone: CalTone; pid?: string; memo?: string | null };
type CalView = 'mine' | 'all';

const pad = (n: number) => String(n).padStart(2, '0');
const dstr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
// 대한민국 공휴일 (2026~2027 · 대체공휴일 포함 · 근사) — 캘린더 색상 구분용
const HOLIDAYS = new Set<string>([
  '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18', '2026-03-01', '2026-03-02',
  '2026-05-05', '2026-05-24', '2026-05-25', '2026-06-06', '2026-08-15', '2026-08-17',
  '2026-09-24', '2026-09-25', '2026-09-26', '2026-10-03', '2026-10-05', '2026-10-09', '2026-12-25',
  '2027-01-01', '2027-02-06', '2027-02-07', '2027-02-08', '2027-02-09', '2027-03-01',
  '2027-05-05', '2027-05-13', '2027-06-06', '2027-08-15', '2027-08-16', '2027-09-14', '2027-09-15', '2027-09-16',
  '2027-10-03', '2027-10-04', '2027-10-09', '2027-10-11', '2027-12-25',
]);
const TONE: Record<CalTone, { bg: string; fg: string; label: string }> = {
  approved: { bg: '#E2F3E4', fg: '#1D6B2A', label: '승인' },
  pending: { bg: '#FFF3C4', fg: '#7A5B00', label: '대기' },
  own: { bg: '#E9EEFB', fg: '#2B4B9B', label: '등록' },
  personal: { bg: '#F0ECE1', fg: '#3C3626', label: '내 일정' },
  fav: { bg: '#FBEAF1', fg: '#A83A69', label: '관심' },
  festival: { bg: '#FDEBD6', fg: '#B4651E', label: '축제' },
  happening: { bg: '#E7EEF7', fg: '#2B5A8C', label: '행사' },
};

export default function CalendarPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [platform, setPlatform] = useState<CalEvent[]>([]);
  const [personal, setPersonal] = useState<CalEvent[]>([]);
  const [allEvents, setAllEvents] = useState<CalEvent[]>([]);
  const [view, setView] = useState<CalView>('mine');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
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
          const [apps, favs] = await Promise.all([fetchMyApplications(p.id), fetchMyFavorites(p.id).catch(() => [])]);
          const appEvents: CalEvent[] = apps
            .filter((a) => a.event && (a.status === 'approved' || a.status === 'pending'))
            .map((a) => ({ id: a.event!.id, name: a.event!.name, start: a.event!.start_date, end: a.event!.end_date, tone: a.status === 'approved' ? 'approved' as const : 'pending' as const }));
          const appIds = new Set(appEvents.map((e) => e.id));
          const favEvents: CalEvent[] = favs
            .filter((f) => f.event && f.event.start_date && f.event.end_date && !appIds.has(f.event.id))
            .map((f) => ({ id: f.event!.id, name: f.event!.name, start: f.event!.start_date, end: f.event!.end_date, tone: 'fav' as const }));
          setPlatform([...appEvents, ...favEvents]);
        }
        await loadPersonal(p.id);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 행사 달력(탐색 트랙): 전국 축제·행사(정보형) 전체 — 로그인 여부와 무관하게 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const evs = await fetchEvents({});
        if (cancelled) return;
        setAllEvents(
          evs
            .filter((e) => e.start_date && e.end_date && eventType(e) === 'info')
            .map((e) => ({
              id: e.id, name: e.name, start: e.start_date, end: e.end_date,
              tone: (e.category === '축제' ? 'festival' : 'happening') as CalTone,
            }))
        );
      } catch { /* 행사 달력 로드 실패는 무시 */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // 표시 대상: 내 일정 트랙 vs 행사 달력 트랙 (겹치지 않게 분리)
  const events = useMemo(
    () => (view === 'all' ? allEvents : [...platform, ...personal]),
    [view, allEvents, platform, personal]
  );

  // 월 이동·트랙 전환 시 선택 날짜 초기화
  useEffect(() => { setSelectedDay(null); }, [cursor, view]);

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
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="t-title mb-1">일정</h1>
            <p className="t-sub">
              {view === 'all'
                ? '전국 축제·행사를 달력에서 보고, 날짜를 눌러 그날 일정을 확인하세요.'
                : `${profile?.role === 'host' || profile?.role === 'admin' ? '내가 등록한 행사' : '신청 승인·대기 + 관심 행사'} + 직접 추가한 일정을 관리합니다.`}
            </p>
          </div>
          {view === 'mine' && (
            <button onClick={() => setShowForm((v) => !v)} className="btn-primary text-[13px] shrink-0">
              {showForm ? '닫기' : '+ 일정 추가'}
            </button>
          )}
        </div>

        {/* 트랙 전환 탭 */}
        <div className="flex gap-1.5 mb-5">
          {([['mine', '내 일정'], ['all', '행사 달력']] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => { setView(v); setShowForm(false); }}
              className="text-[13px] font-bold px-4 py-2 rounded-pill border transition-colors"
              style={view === v
                ? { background: 'var(--ink,#14120E)', color: '#fff', borderColor: 'var(--ink,#14120E)' }
                : { background: 'var(--bg-surface,#fff)', color: 'var(--text-secondary,#6F675A)', borderColor: 'var(--line,#E7DFCE)' }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 수기 일정 추가 폼 (내 일정 트랙만) */}
        {view === 'mine' && showForm && (
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
                {cells.map((day, i) => {
                  if (!day) return <div key={i} className="min-h-[64px] sm:min-h-[80px] opacity-0" />;
                  const dayEv = eventsOn(day);
                  const isSel = selectedDay === day;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(isSel ? null : day)}
                      className="min-h-[64px] sm:min-h-[80px] rounded-input p-1 text-left transition-colors"
                      style={{
                        background: isSel ? 'var(--accent-soft,#FFF1D6)' : isToday(day) ? 'var(--warning-bg,#FFF3C4)' : 'var(--bg-surface-sunken,#FDFBF6)',
                        outline: isSel ? '2px solid var(--accent-warm,#C9622E)' : 'none',
                        outlineOffset: '-2px',
                      }}
                    >
                      <div className={`text-[11px] font-bold mb-0.5 ${(i % 7 === 0 || HOLIDAYS.has(dstr(cursor.y, cursor.m, day))) ? 'text-danger' : i % 7 === 6 ? 'text-info' : 'text-text-secondary'}`}>{day}</div>
                      <div className="space-y-0.5">
                        {dayEv.slice(0, 3).map((e) => (
                          <div key={e.id + (e.pid ?? '')} className="truncate text-[10px] font-semibold px-1 py-0.5 rounded" style={{ background: TONE[e.tone].bg, color: TONE[e.tone].fg }} title={e.name}>
                            {e.name}
                          </div>
                        ))}
                        {dayEv.length > 3 && (
                          <div className="text-[10px] font-bold text-text-tertiary px-1">+{dayEv.length - 3}건</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 하단 일정 목록 (선택 날짜 or 이 달 전체) */}
            {(() => {
              const listEvents = selectedDay ? eventsOn(selectedDay) : monthEvents;
              const title = selectedDay
                ? `${cursor.m + 1}월 ${selectedDay}일 · ${listEvents.length}건`
                : `${cursor.m + 1}월 ${view === 'all' ? '행사' : '일정'} ${monthEvents.length}건`;
              return (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="t-section">{title}</div>
                    {selectedDay && (
                      <button onClick={() => setSelectedDay(null)} className="text-[12px] font-semibold text-accent-warm hover:text-accent-deep">이 달 전체 보기</button>
                    )}
                  </div>
                  {listEvents.length === 0 ? (
                    <div className="card text-center py-10">
                      <div className="text-[14px] font-semibold text-ink mb-1">{selectedDay ? '이 날 일정이 없습니다' : view === 'all' ? '이 달 행사가 없습니다' : '이 달 일정이 없습니다'}</div>
                      <div className="t-sub">{view === 'all' ? '다른 날짜나 달을 확인해보세요.' : '‘+ 일정 추가’로 직접 등록하거나, 플랫폼 행사를 신청해보세요.'}</div>
                    </div>
                  ) : (
                    <div className="card p-0 overflow-hidden">
                      {listEvents.slice().sort((a, b) => a.start.localeCompare(b.start)).map((e, i, arr) => (
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
              );
            })()}
          </>
        )}
      </div>
    </main>
  );
}
