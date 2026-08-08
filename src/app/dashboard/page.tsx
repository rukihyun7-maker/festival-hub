'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { fetchDeadlineSoon, fetchMyApplications, fetchMyDocumentSlots, fetchMyProfile, fetchMySales, countVerified } from '@/lib/supabase/queries';
import { deadlineLabel, periodLabel, feeLabel, eventType, daysUntil } from '@/lib/types';
import type { EventRow, ApplicationWithRelations, Profile, SaleWithEvent, DocumentSlot } from '@/lib/types';

/**
 * 홈(대시보드) · Supabase 연동
 * 로그인 사용자 프로필 + 마감 임박 4건 + 내 신청 요약 + 매출 요약
 */
export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [deadlineEvents, setDeadlineEvents] = useState<EventRow[]>([]);
  const [applications, setApplications] = useState<ApplicationWithRelations[]>([]);
  const [sales, setSales] = useState<SaleWithEvent[]>([]);
  const [docSlots, setDocSlots] = useState<DocumentSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await fetchMyProfile();
        if (!cancelled) setProfile(p);
        if (p) {
          const [events, apps, s, docs] = await Promise.all([
            fetchDeadlineSoon(4),
            fetchMyApplications(p.id).catch(() => []),
            fetchMySales(p.id).catch(() => []),
            fetchMyDocumentSlots(p.id).catch(() => []),
          ]);
          if (!cancelled) {
            setDeadlineEvents(events);
            setApplications(apps);
            setSales(s);
            setDocSlots(docs);
          }
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const totalRevenue = sales.reduce((s, r) => s + r.revenue, 0);
  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const verifiedDocsCount = countVerified(docSlots);
  const docsPercent = docSlots.length > 0 ? Math.round((verifiedDocsCount / docSlots.length) * 100) : 0;
  const missingCount = docSlots.filter((s) => s.urgency === 'missing').length;
  const deadlineThisWeek = deadlineEvents.filter((e) => (daysUntil(e.deadline) ?? 99) <= 7).length;

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="seller" />

      <div className="container-app py-8 md:py-12">
        {/* 히어로 · 인사 + 상태 요약 카드 */}
        <section className="animate-fh-up">
          <h1 className="text-[22px] font-extrabold text-ink tracking-[-0.02em] mb-4">
            안녕하세요, {profile?.name ?? '게스트'}님
          </h1>
          <div className="card">
            {/* 상태 한 줄 */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              {deadlineThisWeek > 0 ? (
                <>
                  <span className="badge badge-warning">이번 주 {deadlineThisWeek}건 마감 임박</span>
                  <span className="text-[12px] text-text-secondary">서류부터 챙기세요</span>
                </>
              ) : (
                <span className="text-[12px] text-text-secondary">관심 지역 새 행사가 뜨면 알려드릴게요</span>
              )}
            </div>
            {/* 핵심 지표 3 */}
            <div className="grid grid-cols-3 mb-5">
              <Metric label="진행 중 신청" value={loading ? '—' : `${applications.length}건`} sub={`대기 ${pendingCount} · 승인 ${approvedCount}`} />
              <Metric label="누적 매출" value={loading ? '—' : fmtMoney(totalRevenue)} sub={sales.length > 0 ? `${sales.length}회 참여` : '이력 없음'} border />
              <Metric label="서류 검증" value={loading ? '—' : `${verifiedDocsCount}/${docSlots.length || 7}`} sub={docsPercent === 100 ? '완료' : missingCount > 0 ? `${missingCount}건 남음` : '진행 중'} border />
            </div>
            <Link href="/events" className="btn-primary w-full">행사 찾기</Link>
          </div>
        </section>

        {/* 핵심 도구 · 파트너 USP (손익 시뮬 · 서류 관리) */}
        <section className="grid gap-3 mt-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {/* 손익 시뮬레이터 */}
          <Link
            href="/seller/simulator"
            className="block rounded-card p-6 transition-transform hover:-translate-y-0.5"
            style={{ background: 'var(--ink, #14120E)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-extrabold tracking-[0.04em]" style={{ color: 'var(--accent, #FFC800)' }}>손익 시뮬레이터</span>
              <span className="text-[16px]" style={{ color: 'var(--accent, #FFC800)' }}>→</span>
            </div>
            <div className="text-[19px] font-extrabold leading-snug mb-2" style={{ color: '#fff' }}>
              이 행사, 나가면 얼마 남을까?
            </div>
            <div className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
              방문객·객단가만 넣으면 최악·현실·최상 3가지 순익을 즉시 계산. 나가기 전에 손익분기부터 확인하세요.
            </div>
          </Link>

          {/* 사업자 서류 관리 */}
          <Link href="/seller/documents" className="card card-hover block p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-extrabold tracking-[0.04em] text-accent-warm">사업자 서류 관리</span>
              <span className="text-[16px] text-text-tertiary">→</span>
            </div>
            <div className="text-[19px] font-extrabold leading-snug text-ink mb-2">
              서류 5종 검증 = 신청 자동 첨부
            </div>
            <div className="text-[13px] text-text-secondary leading-relaxed mb-4">
              검증된 파트너만 주최에게 우선 노출됩니다. 한 번 등록하면 행사마다 자동으로 붙습니다.
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-pill overflow-hidden" style={{ background: 'var(--bg-muted, #F0ECE1)' }}>
                <div className="h-full rounded-pill" style={{ width: `${docsPercent}%`, background: docsPercent === 100 ? 'var(--success, #1D6B2A)' : 'var(--accent, #FFC800)' }} />
              </div>
              <span className="text-[12px] font-extrabold text-ink shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {loading ? '—' : `${verifiedDocsCount}/${docSlots.length || 5}`}
              </span>
            </div>
          </Link>
        </section>

        {error && (
          <div className="card mt-8" style={{ borderColor: '#E0DACB' }}>
            <div className="text-[13px] font-bold text-warning mb-1">Supabase 연결 확인 필요</div>
            <div className="text-[12px] text-text-secondary">
              {error} · <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">SETUP.md</code> 참고
            </div>
          </div>
        )}

        {/* 진행 중 행사 */}
        <section className="mt-12">
          <div className="flex items-end justify-between mb-4">
            <h2 className="t-section">지금 신청받는 행사</h2>
            <Link href="/events" className="text-[13px] font-semibold text-accent-warm hover:text-accent-deep">전체 보기 →</Link>
          </div>
          {loading ? (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded w-16" />
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded" />
                      <div className="h-3 bg-muted rounded w-5/6" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : deadlineEvents.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-[14px] font-semibold text-ink mb-1">현재 신청받는 행사가 없습니다</div>
              <div className="t-sub">알림을 켜두면 새 공고가 뜰 때 안내드립니다</div>
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {deadlineEvents.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          )}
        </section>

        {/* 서류 알림 */}
        <section className="mt-12">
          <div className="flex items-end justify-between mb-4">
            <h2 className="t-section">필수 서류 검증</h2>
            <Link href="/seller/documents" className="text-[13px] font-semibold text-accent-warm hover:text-accent-deep">
              관리하기 →
            </Link>
          </div>
          <div className="card">
            {docSlots.length === 0 ? (
              <div className="text-[13px] text-text-tertiary text-center py-6">서류 정보가 없습니다</div>
            ) : (
              docSlots.map((s, i) => {
                const daysLeft = s.doc?.expires_at
                  ? Math.ceil((new Date(s.doc.expires_at).getTime() - Date.now()) / 86400000)
                  : null;
                const note = s.urgency === 'expiring' ? `${daysLeft}일 뒤 만료`
                  : s.urgency === 'expired' ? '만료됨'
                  : s.urgency === 'pending' ? '검토 중'
                  : s.urgency === 'rejected' ? '반려'
                  : s.urgency === 'missing' ? '미등록' : undefined;
                return <DocRow key={s.kind} name={s.label} urgency={s.urgency} note={note} isLast={i === docSlots.length - 1} />;
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

/** 상태 카드 내 핵심 지표 (큰 숫자 · 스캔용) */
function Metric({ label, value, sub, border }: { label: string; value: string; sub?: string; border?: boolean }) {
  return (
    <div className={`px-2 text-center ${border ? 'border-l border-line-faint' : ''}`}>
      <div className="text-[11px] text-text-tertiary mb-1 truncate">{label}</div>
      <div className="text-[17px] font-extrabold text-ink leading-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div className="text-[10.5px] text-text-secondary mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

/** 금액 축약 (₩234만) */
function fmtMoney(v: number): string {
  if (v >= 10000) return `₩${Math.round(v / 10000).toLocaleString()}만`;
  return `₩${v.toLocaleString()}`;
}

function EventCard({ event: e }: { event: EventRow }) {
  const t = eventType(e);
  const d = daysUntil(e.deadline);
  const urgent = d !== null && d <= 3;
  return (
    <Link href={`/events/${e.id}`} className={`card card-hover ${t === 'apply' ? 'card-apply' : 'card-info'} block`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className={`badge ${t === 'apply' ? 'badge-warning' : 'badge-info'}`}>{t === 'apply' ? '신청형' : '정보형'}</span>
        <span className={`text-[11px] font-bold ${urgent ? 'text-danger' : t === 'apply' ? 'text-warning' : 'text-info'}`}>{deadlineLabel(e.deadline)}</span>
      </div>
      <div className="t-card mb-3">{e.name}</div>
      <div className="space-y-1.5 text-[13px] text-text-secondary">
        <div className="flex gap-2"><span className="w-10 shrink-0 text-text-tertiary">일정</span><span className="text-ink font-semibold">{periodLabel(e.start_date, e.end_date)}</span></div>
        <div className="flex gap-2"><span className="w-10 shrink-0 text-text-tertiary">장소</span><span className="text-ink font-semibold">{e.region}</span></div>
        <div className="flex gap-2"><span className="w-10 shrink-0 text-text-tertiary">참가비</span><span className="text-ink font-semibold">{feeLabel(e.fee, e.fee_rate)}</span></div>
      </div>
    </Link>
  );
}

function DocRow({ name, urgency, note, isLast }: { name: string; urgency: DocumentSlot['urgency']; note?: string; isLast?: boolean }) {
  const badge = {
    verified: { text: '검증됨', cls: 'badge-success' },
    expiring: { text: '만료 임박', cls: 'badge-warning' },
    pending: { text: '검토 중', cls: 'badge-info' },
    rejected: { text: '반려', cls: 'badge-danger' },
    expired: { text: '만료됨', cls: 'badge-danger' },
    missing: { text: '미등록', cls: '' },
  }[urgency];
  const dot = {
    verified: 'bg-success', expiring: 'bg-warning', expired: 'bg-danger',
    pending: 'bg-info', rejected: 'bg-danger', missing: 'bg-text-tertiary',
  }[urgency];
  return (
    <div className={`flex items-center justify-between py-3 ${!isLast ? 'border-b border-line-faint' : ''}`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
        <span className="text-[14px] font-semibold text-ink truncate">{name}</span>
        {note && <span className="text-[12px] text-text-tertiary hidden md:inline">{note}</span>}
      </div>
      <span className={`badge ${badge.cls}`}>{badge.text}</span>
    </div>
  );
}
