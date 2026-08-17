'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import {
  fetchApplicationsForEvent,
  fetchMyHostEvents,
  fetchMyProfile,
  flushPendingBusinessCard,
} from '@/lib/supabase/queries';
import { deadlineLabel, periodLabel, daysUntil, wonCompact } from '@/lib/types';
import type { ApplicationWithRelations, EventRow, Profile } from '@/lib/types';

/**
 * 주최사 대시보드 · Supabase 연동
 * 자기 행사 목록 → 선택 → 신청자 승인/거절 실행
 */

export default function HostDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [applications, setApplications] = useState<ApplicationWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingApps, setLoadingApps] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchMyProfile();
        setProfile(p);
        if (p) {
          // 가입 시 임시 보관한 명함을 첫 로그인에 업로드 (이메일 인증 ON 대응)
          if (p.role === 'host' && !p.business_card_url) {
            const url = await flushPendingBusinessCard(p.id).catch(() => null);
            if (url) setProfile({ ...p, business_card_url: url });
          }
          const list = await fetchMyHostEvents(p.id);
          setEvents(list);
          if (list.length > 0) setSelectedEventId(list[0].id);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setApplications([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingApps(true);
      try {
        const apps = await fetchApplicationsForEvent(selectedEventId);
        if (!cancelled) setApplications(apps);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoadingApps(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedEventId]);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length;

  const days = selectedEvent
    ? Math.max(1, Math.ceil((new Date(selectedEvent.end_date).getTime() - new Date(selectedEvent.start_date).getTime()) / 86400000) + 1)
    : 0;
  const dday = selectedEvent ? daysUntil(selectedEvent.start_date) : null;
  const expectedRevenue = selectedEvent ? selectedEvent.fee * days * approvedCount : 0;
  const platformFee = Math.round(expectedRevenue * 0.05);

  if (loading) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="host" />
        <div className="container-app py-12">
          <div className="animate-pulse space-y-4 max-w-[720px]">
            <div className="h-4 bg-muted rounded w-32" />
            <div className="h-8 bg-muted rounded w-2/3" />
            <div className="h-4 bg-muted rounded w-full" />
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
          <div className="card">
            <div className="text-[16px] font-bold text-ink mb-2">행사 주최 계정으로 로그인이 필요합니다</div>
            <div className="text-[13px] text-text-secondary mb-4">현재 계정으로는 이 페이지에 접근할 수 없습니다.</div>
            <Link href="/login" className="btn-primary">로그인 →</Link>
          </div>
        </div>
      </main>
    );
  }

  if (events.length === 0) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="host" />
        <div className="container-app py-12">
          <div className="card text-center py-16">
            <div className="text-[16px] font-bold text-ink mb-2">등록된 행사가 없습니다</div>
            <div className="t-sub mb-6">첫 행사를 등록해서 파트너 신청을 받아보세요</div>
            <Link href="/host/create-event" className="btn-primary">+ 새 행사 등록</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="host" />

      <div className="container-app py-8 md:py-12">
        {/* 인사 */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[22px] font-extrabold text-ink tracking-[-0.02em]">
            안녕하세요, {profile.business_name ?? profile.name}님
          </h1>
          <Link href="/host/create-event" className="btn-primary hidden sm:inline-flex">+ 새 행사</Link>
        </div>

        {/* 행사 선택 */}
        <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className="input mb-3">
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} · {periodLabel(e.start_date, e.end_date)} · {deadlineLabel(e.deadline)}
            </option>
          ))}
        </select>

        {error && (
          <div className="card mb-6" style={{ borderColor: '#E0DACB' }}>
            <div className="text-[13px] font-bold text-warning mb-1">데이터 로드 오류</div>
            <div className="text-[12px] text-text-secondary">{error}</div>
          </div>
        )}

        {/* 선택 행사 상태 카드 */}
        <div className="card mb-8">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <div className="text-[16px] font-extrabold text-ink truncate">{selectedEvent?.name ?? '행사를 선택하세요'}</div>
              {selectedEvent && (
                <div className="text-[12px] text-text-secondary mt-0.5">
                  {periodLabel(selectedEvent.start_date, selectedEvent.end_date)} · {days}일간 · {dday !== null && dday > 0 ? `D-${dday}` : dday === 0 ? '오늘' : '종료'}
                </div>
              )}
            </div>
            {selectedEvent && (
              <Link href={`/host/events/${selectedEvent.id}/edit`} className="text-[12px] font-bold text-text-tertiary hover:text-ink shrink-0">수정</Link>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <HostMetric label="신청 파트너" value={`${applications.length}${selectedEvent?.capacity ? `/${selectedEvent.capacity}` : ''}`} sub={`${approvedCount}자리 확정`} />
            <HostMetric label="승인 대기" value={String(pendingCount)} sub={pendingCount > 0 ? '검토 필요' : '없음'} warn={pendingCount > 0} />
            <HostMetric label="예상 수익" value={wonCompact(expectedRevenue)} sub={`확정 ${approvedCount}자리`} />
            <HostMetric label="D-day" value={dday !== null && dday > 0 ? `${dday}일` : dday === 0 ? '오늘' : '종료'} sub={dday !== null && dday <= 7 && dday >= 0 ? '임박' : ''} warn={dday !== null && dday <= 7 && dday >= 0} />
          </div>
        </div>

        {/* 신청 파트너 요약 → 심사는 신청자 관리에서 */}
        <div className="mb-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="t-section">신청 파트너</div>
              <div className="t-sub mt-1">이 행사 신청 {applications.length}건 · 심사는 신청자 관리에서</div>
            </div>
            <Link href="/host/applicants" className="btn-primary text-[13px] shrink-0">신청자 관리 →</Link>
          </div>

          {/* 상태별 수 */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <StatTile label="승인 대기" n={pendingCount} tone="warning" />
            <StatTile label="승인" n={approvedCount} tone="success" />
            <StatTile label="거절" n={rejectedCount} tone="danger" />
          </div>

          {/* 읽기 전용 목록 (심사·정보열람은 신청자 관리 페이지) */}
          <div className="card p-0 overflow-hidden">
            {loadingApps ? (
              <div className="p-8">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </div>
              </div>
            ) : applications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-[14px] font-semibold text-ink mb-1">아직 신청이 없습니다</div>
                <div className="t-sub">공고를 공유하거나 마감일을 늘려보세요</div>
              </div>
            ) : (
              applications.map((a, i) => {
                const seller = a.seller;
                const name = seller?.business_name || seller?.name || '(익명 파트너)';
                return (
                  <Link
                    key={a.id}
                    href="/host/applicants"
                    className={`flex items-center justify-between gap-3 p-4 ${i !== applications.length - 1 ? 'border-b border-line-faint' : ''} hover:bg-surface-sunken transition-colors`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-ink truncate">{name}</span>
                        {a.status === 'approved' && <span className="badge badge-success">승인</span>}
                        {a.status === 'rejected' && <span className="badge badge-danger">거절</span>}
                        {a.status === 'pending' && <span className="badge badge-warning">대기</span>}
                      </div>
                      <div className="text-[11px] text-text-tertiary mt-0.5 truncate">
                        {seller?.category ?? '업종 미기재'}{seller?.region ? ` · ${seller.region}` : ''} · 신청 {new Date(a.applied_at).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                    <span className="text-[12px] font-bold text-info shrink-0">세부정보 →</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* QR 발급 · 정산 요약 */}
        {selectedEvent && (
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            <div className="card">
              <div className="t-section">입점 확인 QR</div>
              <div className="t-sub mt-1 mb-4">승인 파트너에게 발급 · 현장 스캔으로 입점 자격 확인 (결제 아님)</div>
              <div className="grid gap-2 text-[13px] mb-4">
                <div className="flex justify-between p-3 rounded-input bg-surface-sunken">
                  <span className="text-text-secondary">발급 완료 (승인)</span>
                  <span className="font-extrabold text-ink">{approvedCount}건</span>
                </div>
                <div className="flex justify-between p-3 rounded-input bg-warning-bg">
                  <span className="text-warning font-semibold">심사 대기</span>
                  <span className="font-extrabold text-warning">{pendingCount}건</span>
                </div>
              </div>
              <ApprovedQrList applications={applications.filter((a) => a.status === 'approved')} />
            </div>

            <div className="card">
              <div className="t-section mb-4">정산 요약 (예상)</div>
              <div className="space-y-3 text-[13px]">
                <div className="flex justify-between"><span className="text-text-secondary">참가비 합계</span><span className="font-semibold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>₩{expectedRevenue.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">플랫폼 수수료 (5%)</span><span className="font-semibold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>-₩{platformFee.toLocaleString()}</span></div>
                <div className="border-t border-line-faint pt-3 flex justify-between items-baseline">
                  <span className="font-bold text-ink">정산 예정액</span>
                  <span className="text-[20px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>₩{(expectedRevenue - platformFee).toLocaleString()}</span>
                </div>
                <div className="mt-1 text-[11px] text-text-tertiary">행사 종료 후 3영업일 예정</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function ApprovedQrList({ applications }: { applications: ApplicationWithRelations[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  if (applications.length === 0) {
    return <div className="text-[12px] text-text-tertiary text-center py-2">승인된 파트너가 없습니다</div>;
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  async function copy(token: string, id: string) {
    try {
      await navigator.clipboard.writeText(`${origin}/verify/${token}`);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  return (
    <div className="space-y-2">
      <div className="t-sub">승인 파트너 입점 확인 링크</div>
      {applications.map((a) => {
        const name = a.seller?.business_name || a.seller?.name || '(파트너)';
        return (
          <div key={a.id} className="flex items-center gap-2 p-2.5 rounded-input bg-surface-sunken">
            <span className="flex-1 min-w-0 text-[13px] font-semibold text-ink truncate">{name}</span>
            {a.qr_token ? (
              <button onClick={() => copy(a.qr_token!, a.id)} className="btn-secondary text-[12px] py-1.5 px-2.5 shrink-0">
                {copied === a.id ? '복사됨 ✓' : '확인 링크 복사'}
              </button>
            ) : (
              <span className="text-[11px] text-text-tertiary shrink-0">발급 대기</span>
            )}
          </div>
        );
      })}
      <div className="text-[11px] text-text-tertiary mt-1">복사한 링크를 QR로 만들면 현장에서 스캔 확인할 수 있습니다.</div>
    </div>
  );
}

function StatTile({ label, n, tone }: { label: string; n: number; tone: 'warning' | 'success' | 'danger' }) {
  const color = tone === 'success' ? 'var(--success,#1D6B2A)' : tone === 'danger' ? 'var(--danger,#9B2C22)' : 'var(--warning,#7A5B00)';
  return (
    <div className="rounded-input p-3 text-center" style={{ background: 'var(--bg-surface-sunken, #FDFBF6)' }}>
      <div className="text-[22px] font-extrabold leading-none" style={{ color, fontVariantNumeric: 'tabular-nums' }}>{n}</div>
      <div className="text-[11px] text-text-secondary mt-1">{label}</div>
    </div>
  );
}

function HostMetric({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="rounded-input p-3" style={{ background: 'var(--bg-surface-sunken, #FDFBF6)' }}>
      <div className="text-[11px] text-text-tertiary mb-1 truncate">{label}</div>
      <div className="text-[17px] font-extrabold text-ink leading-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div className={`text-[10.5px] mt-0.5 truncate ${warn ? 'text-warning font-semibold' : 'text-text-secondary'}`}>{sub}</div>}
    </div>
  );
}

