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

// 전국 17개 시·도 (행정구역) · 행사 region 값과 1:1 일치해야 필터 동작
const REGIONS = ['전체', '서울', '경기', '인천', '강원', '충북', '충남', '대전', '세종', '전북', '전남', '광주', '경북', '경남', '대구', '부산', '울산', '제주'];
const TYPES = [
  { key: 'all' as const, label: '전체' },
  { key: 'apply' as const, label: '신청 가능' },
  { key: 'festival' as const, label: '축제' },
  { key: 'event' as const, label: '행사' },
];
type TypeKey = 'all' | 'apply' | 'festival' | 'event';
const SORTS = [
  { key: 'start' as const, label: '진행 임박순' },
  { key: 'deadline' as const, label: '마감 임박순' },
  { key: 'demand' as const, label: '입지 좋은순' },
  { key: 'recent' as const, label: '최신 등록순' },
  { key: 'fee' as const, label: '참가비 낮은순' },
];
type SortKey = 'start' | 'deadline' | 'demand' | 'recent' | 'fee';

// 진행 상태 (오늘 기준 시작·종료일 비교)
type Phase = 'ongoing' | 'upcoming' | 'ended';
const STATUSES = [
  { key: 'all' as const, label: '전체' },
  { key: 'ongoing' as const, label: '진행중' },
  { key: 'upcoming' as const, label: '진행 예정' },
  { key: 'ended' as const, label: '종료' },
];
type StatusKey = 'all' | Phase;
const PHASE_META: Record<Phase, { label: string; bg: string; fg: string }> = {
  ongoing: { label: '진행중', bg: '#EAF3EC', fg: '#2E7D46' },
  upcoming: { label: '진행 예정', bg: '#F4F7FE', fg: '#2B4B9B' },
  ended: { label: '종료', bg: '#F0ECE1', fg: '#8A8272' },
};
function phaseOf(e: EventRow, today: string): Phase {
  if (e.end_date && e.end_date < today) return 'ended';
  if (e.start_date && e.start_date > today) return 'upcoming';
  return 'ongoing';
}
/** 행사가 걸쳐 있는 월 목록 ['2026-08', ...] (시작월~종료월) */
function monthsOf(e: EventRow): string[] {
  if (!e.start_date) return [];
  const out: string[] = [];
  const s = new Date(e.start_date + 'T00:00:00');
  const end = new Date((e.end_date || e.start_date) + 'T00:00:00');
  let y = s.getFullYear(), m = s.getMonth();
  const ey = end.getFullYear(), em = end.getMonth();
  let guard = 0;
  while ((y < ey || (y === ey && m <= em)) && guard++ < 60) {
    out.push(`${y}-${String(m + 1).padStart(2, '0')}`);
    m++; if (m > 11) { m = 0; y++; }
  }
  return out;
}
const monthLabel = (ym: string) => { const [y, m] = ym.split('-'); return `${y}.${Number(m)}`; };
const PAGE_SIZE = 12; // 목록 페이지네이션(더 보기)

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
  const [type, setType] = useState<TypeKey>('all');
  const [statusFilter, setStatusFilter] = useState<StatusKey>('all');
  const [month, setMonth] = useState<string>('all'); // 'all' | 'YYYY-MM'
  const [sort, setSort] = useState<SortKey>('start');
  const [q, setQ] = useState('');
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<{ role: string | null; status: string; docsDone: number; docsVerified: boolean } | null>(null);
  const [gateChecked, setGateChecked] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

  // 필터/검색 변경 시 페이지 리셋
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [region, type, statusFilter, month, sort, q, restrictInfo]);

  // 선택 가능한 월 목록: 이번 달 ~ 최대 종료월 (최대 15개월). 장기 상시행사로 과거 월이 넘치는 것 방지.
  const availableMonths = useMemo(() => {
    const cur = today.slice(0, 7); // 'YYYY-MM'
    let maxEnd = cur;
    for (const e of events) {
      const end = (e.end_date || e.start_date || '').slice(0, 7);
      if (end && end > maxEnd) maxEnd = end;
    }
    const out: string[] = [];
    let [y, m] = cur.split('-').map(Number);
    const [ey, em] = maxEnd.split('-').map(Number);
    let guard = 0;
    while ((y < ey || (y === ey && m <= em)) && guard++ < 15) {
      out.push(`${y}-${String(m).padStart(2, '0')}`);
      m++; if (m > 12) { m = 1; y++; }
    }
    return out;
  }, [events, today]);

  // 상태(진행중/진행전/종료)·월을 제외한 기준 목록 → 상태 탭 카운트 산출용
  const base = useMemo(() => {
    let list = events;
    if (restrictInfo) list = list.filter((e) => eventType(e) === 'info');
    if (region !== '전체') list = list.filter((e) => e.region === region);
    if (type === 'apply') list = list.filter((e) => eventType(e) === 'apply');
    else if (type === 'festival') list = list.filter((e) => eventType(e) === 'info' && e.category === '축제');
    else if (type === 'event') list = list.filter((e) => eventType(e) === 'info' && e.category === '행사');
    if (month !== 'all') list = list.filter((e) => monthsOf(e).includes(month));
    return list;
  }, [events, region, type, month, restrictInfo]);

  const statusCounts = useMemo(() => {
    const c = { all: base.length, ongoing: 0, upcoming: 0, ended: 0 };
    for (const e of base) c[phaseOf(e, today)]++;
    return c;
  }, [base, today]);

  const filtered = useMemo(() => {
    let list = statusFilter === 'all' ? base : base.filter((e) => phaseOf(e, today) === statusFilter);
    if (sort === 'start') list = [...list].sort((a, b) => (a.start_date ?? '9999').localeCompare(b.start_date ?? '9999'));
    if (sort === 'deadline') list = [...list].sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'));
    if (sort === 'demand') list = [...list].sort((a, b) => (b.demand_score ?? -1) - (a.demand_score ?? -1));
    if (sort === 'fee') list = [...list].sort((a, b) => a.fee - b.fee);
    if (sort === 'recent') list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return list;
  }, [base, statusFilter, sort, today]);

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
            <p className="t-sub mb-6">행사 찾기·신청이 제한되었습니다. 문의가 필요하면 운영팀(help@festivalhub.co.kr)에 연락해 주세요.</p>
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

        {/* 상태 탭 (전체/진행중/진행전/종료) */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {STATUSES.map((s) => {
            const n = statusCounts[s.key];
            const active = statusFilter === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setStatusFilter(s.key)}
                className="text-[13px] font-bold px-3.5 py-2 rounded-pill border transition-colors"
                style={active
                  ? { background: 'var(--ink,#14120E)', color: '#fff', borderColor: 'var(--ink,#14120E)' }
                  : { background: 'var(--bg-surface,#fff)', color: 'var(--text-secondary,#6F675A)', borderColor: 'var(--line,#E7DFCE)' }}
              >
                {s.label}
                <span className="ml-1.5 text-[12px] font-extrabold" style={{ opacity: active ? 0.9 : 0.6, fontVariantNumeric: 'tabular-nums' }}>{n}</span>
              </button>
            );
          })}
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
              <FilterGroup label="월">
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setMonth('all')} className={`chip ${month === 'all' ? 'selected' : ''}`}>전체</button>
                  {availableMonths.map((m) => (
                    <button key={m} onClick={() => setMonth(m)} className={`chip ${month === m ? 'selected' : ''}`}>
                      {monthLabel(m)}
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
            <div className="text-[13px] font-bold text-ink mb-1">🔒 정보 제공 행사만 볼 수 있어요</div>
            <div className="text-[12px] text-text-secondary">
              {gate?.role === 'seller'
                ? <>필수 서류 6종을 관리자 검증까지 마치면 <b>신청 가능 행사</b>의 상세와 신청이 열립니다. 서류 검증 {gate.docsDone}/{REQUIRED_DOC_KINDS.length} · <Link href="/seller/documents" className="text-info font-semibold underline">서류 등록 →</Link></>
                : <>신청 가능 행사는 검증된 입점 파트너만 볼 수 있습니다. <Link href="/signup" className="text-info font-semibold underline">입점 파트너 가입 →</Link></>}
            </div>
          </div>
        )}

        {/* 에러 알림 */}
        {error && (
          <div className="card mb-6" style={{ borderColor: '#E0DACB' }}>
            <div className="text-[13px] font-bold text-warning mb-1">행사 목록을 불러오지 못했습니다</div>
            <div className="text-[12px] text-text-secondary">
              잠시 후 다시 시도해 주세요. 문제가 계속되면 운영팀에 알려주세요.
            </div>
          </div>
        )}

        {/* 결과 */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[13px] font-semibold text-text-secondary">
            {loading ? '' : `총 ${filtered.length}건${filtered.length > visibleCount ? ` · ${Math.min(visibleCount, filtered.length)}건 표시` : ''}`}
          </span>
          {filtered.length !== events.length && (
            <button
              onClick={() => { setRegion('전체'); setType('all'); setStatusFilter('all'); setMonth('all'); setQ(''); }}
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
            <div className="t-sub">검색어나 필터를 바꿔 다시 찾아보세요</div>
          </div>
        ) : (
          <>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {filtered.slice(0, visibleCount).map((e) => <EventCard key={e.id} event={e} phase={phaseOf(e, today)} />)}
            </div>
            {filtered.length > visibleCount && (
              <div className="text-center mt-6">
                <button onClick={() => setVisibleCount((n) => n + PAGE_SIZE)} className="btn-secondary">
                  더 보기 ({filtered.length - visibleCount}건 남음)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function EventCard({ event: e, phase }: { event: EventRow; phase: Phase }) {
  const t = e.kind ?? eventType(e);
  const d = daysUntil(e.deadline);
  const urgent = t === 'apply' && d !== null && d >= 0 && d <= 3;
  const pm = PHASE_META[phase];
  return (
    <Link href={`/events/${e.id}`} className={`card card-hover ${t === 'apply' ? 'card-apply' : 'card-info'} block`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: pm.bg, color: pm.fg }}>{pm.label}</span>
          <span className={`badge ${t === 'apply' ? 'badge-warning' : 'badge-info'}`}>
            {t === 'apply' ? '신청형' : (e.category || '정보형')}
          </span>
        </div>
        {t === 'apply' && (
          <span className={`text-[12px] font-extrabold ${urgent ? 'text-danger' : 'text-warning'}`}>
            {deadlineLabel(e.deadline)}
          </span>
        )}
      </div>
      <div className="t-card mb-2 line-clamp-1">{e.name}</div>
      <DemandBadge score={e.demand_score} tags={e.demand_tags} />
      <div className="space-y-1.5 text-[13px] text-text-secondary">
        <Row label="일정" value={periodLabel(e.start_date, e.end_date)} />
        <Row label="장소" value={`${e.region} ${e.address.split(' ').slice(1, 3).join(' ')}`} />
        <Row label="자리" value={e.capacity ?? '공고 예정'} />
      </div>
      <div className="flex items-baseline justify-between mt-3 pt-3 border-t border-line-faint">
        {t === 'apply' ? (
          <>
            <span className="text-[11px] text-text-tertiary">참가비</span>
            <span className="text-[15px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>{feeLabel(e.fee, e.fee_rate)}</span>
          </>
        ) : (
          <>
            <span className="text-[11px] text-text-tertiary">정보 제공</span>
            <span className="text-[12px] font-semibold text-text-secondary">참가·자리는 주최에 문의</span>
          </>
        )}
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
