'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { fetchEvents } from '@/lib/supabase/queries';
import { deadlineLabel, periodLabel, feeLabel, eventType, daysUntil } from '@/lib/types';
import type { EventRow } from '@/lib/types';

/**
 * 이벤트 목록 · Supabase 연동
 * 필터: 지역·유형·정렬은 클라 필터, 검색은 서버 ilike
 * Supabase 미설정 시 mock fallback
 */

const REGIONS = ['전체', '서울', '경기', '강원', '충북', '경남', '전남'];
const TYPES = [
  { key: 'all' as const, label: '전체' },
  { key: 'apply' as const, label: '신청형' },
  { key: 'info' as const, label: '정보형' },
];
const SORTS = [
  { key: 'deadline' as const, label: '마감 임박순' },
  { key: 'recent' as const, label: '최신 등록순' },
  { key: 'fee' as const, label: '참가비 낮은순' },
];

const MOCK_FALLBACK: EventRow[] = [
  {
    id: 'mock-1', owner_id: 'mock-owner', name: '서울숲 8월 플리마켓 (Mock)', category: '플리마켓',
    organizer: 'Mock', start_date: '2026-08-15', end_date: '2026-08-17',
    region: '서울', address: '서울 성동구', visitors: null, capacity: null,
    fee: 150000, fee_rate: 0, deadline: '2026-08-08',
    electric: true, water: true, gas: false, parking: false,
    description: null, contact: null, phone: null, status: 'open',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
];

export default function EventsListPage() {
  const [region, setRegion] = useState('전체');
  const [type, setType] = useState<'all' | 'apply' | 'info'>('all');
  const [sort, setSort] = useState<'deadline' | 'recent' | 'fee'>('deadline');
  const [q, setQ] = useState('');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchEvents({ q: q || undefined });
        if (!cancelled) setEvents(data);
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setEvents(MOCK_FALLBACK); // Supabase 미설정 시 fallback
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [q]);

  const filtered = useMemo(() => {
    let list = events;
    if (region !== '전체') list = list.filter((e) => e.region === region);
    if (type !== 'all') list = list.filter((e) => eventType(e) === type);
    if (sort === 'deadline') list = [...list].sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'));
    if (sort === 'fee') list = [...list].sort((a, b) => a.fee - b.fee);
    if (sort === 'recent') list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return list;
  }, [events, region, type, sort]);

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="seller" />

      <div className="container-app py-8 md:py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="t-title mb-1">행사 찾기</h1>
            <p className="t-sub">
              {loading ? '불러오는 중…' : `전국 ${events.length}건 · 마감 임박 ${events.filter((e) => (daysUntil(e.deadline) ?? 99) <= 7).length}건`}
            </p>
          </div>
        </div>

        {/* 검색 + 필터 */}
        <div className="card mb-6">
          <div className="flex flex-col gap-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="행사명·지역·주최 검색"
              className="input"
            />

            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <FilterGroup label="지역">
                <div className="flex flex-wrap gap-1.5">
                  {REGIONS.map((r) => (
                    <button key={r} onClick={() => setRegion(r)} className={`chip ${region === r ? 'selected' : ''}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </FilterGroup>
              <FilterGroup label="유형">
                <div className="flex flex-wrap gap-1.5">
                  {TYPES.map((t) => (
                    <button key={t.key} onClick={() => setType(t.key)} className={`chip ${type === t.key ? 'selected' : ''}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </FilterGroup>
              <FilterGroup label="정렬">
                <div className="flex flex-wrap gap-1.5">
                  {SORTS.map((s) => (
                    <button key={s.key} onClick={() => setSort(s.key)} className={`chip ${sort === s.key ? 'selected' : ''}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </FilterGroup>
            </div>
          </div>
        </div>

        {/* 에러 알림 */}
        {error && (
          <div className="card mb-6" style={{ borderColor: '#E0DACB' }}>
            <div className="text-[13px] font-bold text-warning mb-1">Supabase 연결 확인 필요</div>
            <div className="text-[12px] text-text-secondary">
              {error} · <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">SETUP.md</code> 참고
            </div>
          </div>
        )}

        {/* 결과 */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[13px] font-semibold text-text-secondary">
            {loading ? '' : `${filtered.length}건 표시 중`}
          </span>
          {filtered.length !== events.length && (
            <button
              onClick={() => { setRegion('전체'); setType('all'); setQ(''); }}
              className="text-[12px] font-semibold text-accent-warm hover:text-accent-deep"
            >
              필터 초기화
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-[15px] font-semibold text-ink mb-2">조건에 맞는 행사가 없습니다</div>
            <div className="t-sub">필터를 조정하거나 알림 신청을 등록해두세요</div>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {filtered.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </div>
    </main>
  );
}

function EventCard({ event: e }: { event: EventRow }) {
  const t = eventType(e);
  const d = daysUntil(e.deadline);
  const urgent = d !== null && d <= 3;
  return (
    <Link href={`/events/${e.id}`} className={`card card-hover ${t === 'apply' ? 'card-apply' : 'card-info'} block`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className={`badge ${t === 'apply' ? 'badge-warning' : 'badge-info'}`}>
          {t === 'apply' ? '신청형' : '정보형'}
        </span>
        <span className={`text-[11px] font-bold ${urgent ? 'text-danger' : t === 'apply' ? 'text-warning' : 'text-info'}`}>
          {deadlineLabel(e.deadline)}
        </span>
      </div>
      <div className="t-card mb-3">{e.name}</div>
      <div className="space-y-1.5 text-[13px] text-text-secondary">
        <Row label="일정" value={periodLabel(e.start_date, e.end_date)} />
        <Row label="장소" value={`${e.region} ${e.address.split(' ').slice(1, 3).join(' ')}`} />
        <Row label="자리" value={e.capacity ?? '공고 예정'} />
        <Row label="참가비" value={feeLabel(e.fee, e.fee_rate)} />
      </div>
    </Link>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-10 shrink-0 text-text-tertiary">{label}</span>
      <span className="text-ink font-semibold">{value}</span>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-text-tertiary mb-2">{label}</div>
      {children}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card">
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-muted rounded w-16" />
        <div className="h-5 bg-muted rounded w-3/4" />
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-5/6" />
          <div className="h-3 bg-muted rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}
