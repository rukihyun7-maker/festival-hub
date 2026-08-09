'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { fetchMyProfile, fetchMyHostEvents, fetchMyApplications } from '@/lib/supabase/queries';
import { periodLabel } from '@/lib/types';
import type { Profile } from '@/lib/types';

/**
 * 일정 캘린더
 * 입점 파트너: 신청 승인/대기 행사 · 행사 주최: 내가 등록한 행사
 */

type CalEvent = { id: string; name: string; start: string; end: string; tone: 'approved' | 'pending' | 'own' };

const pad = (n: number) => String(n).padStart(2, '0');
const dstr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const TONE: Record<CalEvent['tone'], { bg: string; fg: string; label: string }> = {
  approved: { bg: '#E2F3E4', fg: '#1D6B2A', label: '승인' },
  pending: { bg: '#FFF3C4', fg: '#7A5B00', label: '대기' },
  own: { bg: '#E9EEFB', fg: '#2B4B9B', label: '등록' },
};

export default function CalendarPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchMyProfile();
        setProfile(p);
        if (!p) return;
        if (p.role === 'host' || p.role === 'admin') {
          const evs = await fetchMyHostEvents(p.id);
          setEvents(evs.filter((e) => e.start_date && e.end_date).map((e) => ({ id: e.id, name: e.name, start: e.start_date, end: e.end_date, tone: 'own' as const })));
        } else {
          const apps = await fetchMyApplications(p.id);
          setEvents(
            apps
              .filter((a) => a.event && (a.status === 'approved' || a.status === 'pending'))
              .map((a) => ({ id: a.event!.id, name: a.event!.name, start: a.event!.start_date, end: a.event!.end_date, tone: a.status === 'approved' ? 'approved' as const : 'pending' as const }))
          );
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }
  const isToday = (day: number) => cursor.y === now.getFullYear() && cursor.m === now.getMonth() && day === now.getDate();

  return (
    <main className="min-h-screen bg-page">
      <AppNav role={profile?.role === 'host' ? 'host' : profile?.role === 'admin' ? 'admin' : 'seller'} />
      <div className="container-app py-8 max-w-[860px]">
        <div className="mb-5">
          <h1 className="t-title mb-1">일정</h1>
          <p className="t-sub">
            {profile?.role === 'host' || profile?.role === 'admin' ? '내가 등록한 행사 일정입니다.' : '신청 승인·대기 중인 행사 일정입니다.'}
          </p>
        </div>

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
            {/* 캘린더 */}
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
                            <Link key={e.id} href={`/events/${e.id}`} className="block truncate text-[10px] font-semibold px-1 py-0.5 rounded" style={{ background: TONE[e.tone].bg, color: TONE[e.tone].fg }}>
                              {e.name}
                            </Link>
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
                  <div className="t-sub">{profile?.role === 'host' || profile?.role === 'admin' ? '행사를 등록해보세요.' : '행사를 찾아 신청해보세요.'}</div>
                </div>
              ) : (
                <div className="card p-0 overflow-hidden">
                  {monthEvents.sort((a, b) => a.start.localeCompare(b.start)).map((e, i) => (
                    <Link key={e.id} href={`/events/${e.id}`} className={`flex items-center justify-between gap-3 p-4 ${i !== monthEvents.length - 1 ? 'border-b border-line-faint' : ''} hover:bg-surface-sunken transition-colors`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold text-ink truncate">{e.name}</span>
                          <span className="badge shrink-0" style={{ background: TONE[e.tone].bg, color: TONE[e.tone].fg }}>{TONE[e.tone].label}</span>
                        </div>
                        <div className="text-[12px] text-text-secondary mt-0.5">{periodLabel(e.start, e.end)}</div>
                      </div>
                      <span className="text-[12px] font-bold text-info shrink-0">상세 →</span>
                    </Link>
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
