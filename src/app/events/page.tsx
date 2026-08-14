'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { fetchEvents, fetchMyProfile, fetchMyDocumentSlots, countVerified } from '@/lib/supabase/queries';
import { deadlineLabel, periodLabel, feeLabel, eventType, daysUntil, demandLevel, requiredDocsVerified, REQUIRED_DOC_KINDS } from '@/lib/types';
import type { EventRow, Profile } from '@/lib/types';

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
  { key: 'demand' as const, label: '입지 좋은순' },
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
  const [sort, setSort] = useState<'deadline' | 'demand' | 'recent' | 'fee'>('deadline');
  const [q, setQ] = useState('');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<{ role: string | null; status: string; docsDone: number; docsVerified: boolean } | null>(null);
  const [gateChecked, setGateChecked] = useState(false);

  // 신청형 열람 자격: 주최·관리자 OR (정상 계정 + 필수 서류 6종 검증 완료). 그 외는 정보형만.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p: Profile | null = await fetchMyProfile();
        if (cancelled) return;
        if (!p) {
          setGate({ role: null, status: '', docsDone: 0, docsVerified: false });
        } else if (p.role === 'seller') {
          let slots: Awaited<ReturnType<typeof fetchMyDocumentSlots>> = [];
          try { slots = await fetchMyDocumentSlots(p.id); } catch { /* noop */ }
          const done = REQUIRED_DOC_KINDS.filter((k) => {
            const u = slots.find((s) => s.kind === k)?.urgency;
            return u === 'verified' || u === 'expiring';
          }).length;
          if (!cancelled) setGate({ role: 'seller', status: p.status ?? '정상', docsDone: done, docsVerified: requiredDocsVerified(slots) });
        } else {
          setGate({ role: p.role, status: '정상', docsDone: 0, docsVerified: true }); // 주최·관리자
        }
      } catch { /* 오류 시 게이트 없음 */ }
      finally { if (!cancelled) setGateChecked(true); }
    })();
    return () => { cancelled = true; };
  }, []);

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

  // 자격 미충족(서류 미검증)·비로그인 → 정보형 행사만. 정지·반려는 완전 잠금(아래).
  const qualified = !!gate && (gate.role === 'host' || gate.role === 'admin' || (gate.role === 'seller' && gate.status === '정상' && gate.docsVerified));
  const suspended = gate?.role === 'seller' && (gate.status === '정지' || gate.status === '반려');
  const restrictInfo = gateChecked && !!gate && !qualified && !suspended;

  const filtered = useMemo(() => {
    let list = events;
    if (restrictInfo) list = list.filter((e) => eventType(e) === 'info');
    if (region !== '전체') list = list.filter((e) => e.region === region);
    if (type !== 'all') list = list.filter((e) => eventType(e) === type);
    if (sort === 'deadline') list = [...list].sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'));
    if (sort === 'demand') list = [...list].sort((a, b) => (b.demand_score ?? -1) - (a.demand_score ?? -1));
    if (sort === 'fee') list = [...list].sort((a, b) => a.fee - b.fee);
    if (sort === 'recent') list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return list;
  }, [events, region, type, sort, restrictInfo]);

  // 정지·반려 계정만 완전 잠금. 그 외 미검증은 정보형 열람 허용(아래 배너)
  if (gateChecked && suspended) {
    const rejected = gate?.status === '반려';
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="seller" />
        <div className="container-app py-8 md:py-12">
          <h1 className="t-title mb-6">행사 찾기</h1>
          <div className="card max-w-xl mx-auto text-center py-12">
            <div className="w-14 h-14 rounded-pill bg-muted mx-auto mb-4 flex items-center justify-center text-[24px]">🚫</div>
            <div className="text-[17px] font-extrabold text-ink mb-2">{rejected ? '가입이 반려되었습니다' : '이용이 정지된 계정입니다'}</div>
            <p className="t-sub mb-6">행사 찾기·신청이 제한되었습니다. 문의가 필요하면 운영팀(leeyhome@naver.com)에 연락해 주세요.</p>
          </div>
        </div>
      </main>
    );
  }

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

        {/* 자격 미충족 → 정보형만 열람 안내 */}
        {restrictInfo && (
          <div className="card mb-6" style={{ background: 'var(--warning-bg, #FFF9E6)', borderColor: '#E7DCA8' }}>
            <div className="text-[13px] font-bold text-ink mb-1">🔒 정보형 행사만 열람 중</div>
            <div className="text-[12px] text-text-secondary">
              {gate?.role === 'seller'
                ? <>필수 서류 6종을 관리자 검증까지 마치면 <b>신청형 행사</b> 상세와 신청이 열립니다. 서류 검증 {gate.docsDone}/{REQUIRED_DOC_KINDS.length} · <Link href="/seller/documents" className="text-info font-semibold underline">서류 등록 →</Link></>
                : <>신청형 행사는 검증된 입점 파트너만 열람할 수 있습니다. <Link href="/signup" className="text-info font-semibold underline">입점 파트너 가입 →</Link></>}
            </div>
          </div>
        )}

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
  const t = e.kind ?? eventType(e);
  const d = daysUntil(e.deadline);
  const urgent = t === 'apply' && d !== null && d >= 0 && d <= 3;
  return (
    <Link href={`/events/${e.id}`} className={`card card-hover ${t === 'apply' ? 'card-apply' : 'card-info'} block`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className={`badge ${t === 'apply' ? 'badge-warning' : 'badge-info'}`}>
          {t === 'apply' ? '신청형' : '정보형'}
        </span>
        <span className={`text-[12px] font-extrabold ${urgent ? 'text-danger' : t === 'apply' ? 'text-warning' : 'text-info'}`}>
          {deadlineLabel(e.deadline)}
        </span>
      </div>
      <div className="t-card mb-2 line-clamp-1">{e.name}</div>
      <DemandBadge score={e.demand_score} tags={e.demand_tags} />
      <div className="space-y-1.5 text-[13px] text-text-secondary">
        <Row label="일정" value={periodLabel(e.start_date, e.end_date)} />
        <Row label="장소" value={`${e.region} ${e.address.split(' ').slice(1, 3).join(' ')}`} />
        <Row label="자리" value={e.capacity ?? '공고 예정'} />
      </div>
      <div className="flex items-baseline justify-between mt-3 pt-3 border-t border-line-faint">
        <span className="text-[11px] text-text-tertiary">참가비</span>
        <span className="text-[15px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>{feeLabel(e.fee, e.fee_rate)}</span>
      </div>
    </Link>
  );
}

function DemandBadge({ score, tags }: { score?: number | null; tags?: string[] | null }) {
  const level = demandLevel(score);
  if (!level) return null; // 좌표 없어 미산출 → 표시 안 함
  const tone =
    level.tone === 'high'
      ? { bg: '#EAF3EC', fg: '#2E7D46' }
      : level.tone === 'mid'
      ? { bg: '#F4F7FE', fg: '#2B4B9B' }
      : { bg: '#F4F1EA', fg: '#8A8272' };
  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-3">
      <span
        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
        style={{ background: tone.bg, color: tone.fg }}
      >
        입지 {level.label}
      </span>
      {(tags ?? []).slice(0, 3).map((t) => (
        <span key={t} className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-text-secondary">
          {t}
        </span>
      ))}
    </div>
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
