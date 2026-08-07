'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import {
  fetchMyProfile,
  fetchMyHostEvents,
  fetchApplicationsForEvent,
  updateApplicationStatus,
  fetchSellerHistory,
  fetchRatingSummary,
  fetchMyMenus,
  fetchMyDocumentSlots,
} from '@/lib/supabase/queries';
import type {
  Profile, EventRow, ApplicationWithRelations, ApplicationStatus,
  SellerHistory, RatingSummary, Menu, ShareFlags, DocumentSlot,
} from '@/lib/types';

/**
 * 신청자 관리 (행사 주최)
 * 내 모든 행사의 신청을 한 큐에서 확인 · 승인/반려
 */

const STATUS_META: Record<ApplicationStatus, { label: string; cls: string }> = {
  pending: { label: '대기', cls: 'badge-warning' },
  approved: { label: '승인', cls: 'badge-success' },
  rejected: { label: '반려', cls: 'badge-danger' },
  canceled: { label: '취소', cls: 'badge-info' },
};

export default function HostApplicantsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [apps, setApps] = useState<ApplicationWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('pending');
  const [actionOn, setActionOn] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchMyProfile();
        setProfile(p);
        if (p) {
          const evs = await fetchMyHostEvents(p.id);
          setEvents(evs);
          const lists = await Promise.all(evs.map((e) => fetchApplicationsForEvent(e.id)));
          setApps(lists.flat());
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(
    () =>
      apps.filter(
        (a) =>
          (eventFilter === 'all' || a.event_id === eventFilter) &&
          (statusFilter === 'all' || a.status === statusFilter)
      ),
    [apps, eventFilter, statusFilter]
  );
  const pendingTotal = apps.filter((a) => a.status === 'pending').length;

  async function act(appId: string, status: 'approved' | 'rejected') {
    if (!profile) return;
    setActionOn(appId);
    try {
      await updateApplicationStatus(appId, status, profile.id);
      setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, status } : a)));
    } catch (e) {
      alert('상태 변경 실패: ' + (e as Error).message);
    } finally {
      setActionOn(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="host" />
        <div className="container-app py-12">
          <div className="animate-pulse space-y-4 max-w-[720px]">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-20 bg-muted rounded w-full" />
            <div className="h-20 bg-muted rounded w-full" />
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
          <div className="card max-w-[640px]">
            <div className="text-[16px] font-bold text-ink mb-2">행사 주최 계정으로 로그인이 필요합니다</div>
            <Link href="/login" className="btn-primary inline-flex mt-2">로그인</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="host" />
      <div className="container-app py-8 max-w-[860px]">
        <div className="mb-6">
          <div className="t-section text-[20px]">신청자 관리</div>
          <div className="t-sub mt-1">대기 중 {pendingTotal}건 · 전체 {apps.length}건</div>
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-2 mb-3">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`chip ${statusFilter === s ? 'selected' : ''}`}>
              {s === 'all' ? '전체' : STATUS_META[s].label}
            </button>
          ))}
        </div>
        {events.length > 1 && (
          <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} className="input mb-5 max-w-[360px]">
            <option value="all">모든 행사</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        )}

        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-[15px] font-bold text-ink mb-1">해당 조건의 신청이 없습니다</div>
            <div className="t-sub">필터를 바꾸거나 새 행사를 등록해 신청을 받아보세요.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => (
              <ApplicantCard key={a.id} app={a} actionOn={actionOn} onAct={act} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

/** share_flags 기본 공개(true) · 명시적 false만 비공개 */
function shareOn(flags: ShareFlags | undefined, key: string): boolean {
  return flags?.[key] !== false;
}

function ApplicantCard({
  app: a, actionOn, onAct,
}: {
  app: ApplicationWithRelations;
  actionOn: string | null;
  onAct: (id: string, status: 'approved' | 'rejected') => void;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [history, setHistory] = useState<SellerHistory[]>([]);
  const [rating, setRating] = useState<RatingSummary | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [docs, setDocs] = useState<DocumentSlot[]>([]);

  const seller = a.seller;
  const meta = STATUS_META[a.status];
  const name = seller?.business_name || seller?.name || '(익명 파트너)';
  const flags = seller?.share_flags;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded && seller) {
      setLoadingDetail(true);
      const [h, r, m, d] = await Promise.all([
        fetchSellerHistory(seller.id).catch(() => [] as SellerHistory[]),
        fetchRatingSummary(seller.id).catch(() => null),
        fetchMyMenus(seller.id).catch(() => [] as Menu[]), // RLS 미허용 시 빈 배열
        fetchMyDocumentSlots(seller.id).catch(() => [] as DocumentSlot[]), // v9 정책 후 열람
      ]);
      setHistory(h);
      setRating(r);
      setMenus(m);
      setDocs(d);
      setLoaded(true);
      setLoadingDetail(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`badge ${meta.cls}`}>{meta.label}</span>
            <span className="text-[12px] text-text-tertiary truncate">{a.event?.name}</span>
          </div>
          <div className="text-[15px] font-extrabold text-ink truncate">{name}</div>
          <div className="text-[12px] text-text-secondary mt-1">
            {seller?.category ?? '업종 미기재'}{seller?.region ? ` · ${seller.region}` : ''}
            {seller?.affiliation ? ` · ${seller.affiliation}` : ''}
          </div>
        </div>
        <button onClick={toggle} className="text-[12px] font-bold text-info shrink-0" style={{ color: 'var(--info, #2B4B9B)' }}>
          {open ? '접기 ▲' : '세부정보 ▼'}
        </button>
      </div>

      {open && (
        <div className="mt-4 pt-4 border-t border-line-faint animate-fh-up">
          {loadingDetail ? (
            <div className="text-[13px] text-text-tertiary py-4 text-center">불러오는 중…</div>
          ) : (
            <div className="space-y-4">
              {/* 매장 정보 */}
              <div>
                <div className="text-[12px] font-bold text-ink-soft mb-2">매장 정보</div>
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                  <DetailRow label="대표자" value={seller?.name} />
                  {shareOn(flags, 'biz_no') && <DetailRow label="사업자번호" value={seller?.business_no} />}
                  {shareOn(flags, 'phone') && <DetailRow label="연락처" value={seller?.phone} />}
                  <DetailRow label="평점" value={rating ? `${rating.avg_score} (${rating.review_count}건)` : '평가 없음'} />
                  {shareOn(flags, 'sales_revenue') && (() => {
                    const rev = history.filter((h) => (h.revenue ?? 0) > 0);
                    const avg = rev.length ? Math.round(rev.reduce((s, h) => s + (h.revenue || 0), 0) / rev.length) : 0;
                    return <DetailRow label="지난 행사 평균 매출" value={avg ? `₩${avg.toLocaleString()}` : '기록 없음'} />;
                  })()}
                  {shareOn(flags, 'hygiene_gear') && <DetailRow label="위생 관리" value={seller?.hygiene_gear} />}
                  {shareOn(flags, 'vehicle') && seller?.vehicle && <DetailRow label="차량·부스 규격" value={seller.vehicle} />}
                  {shareOn(flags, 'power') && seller?.power && <DetailRow label="전기 사용량" value={seller.power} />}
                  {shareOn(flags, 'cooking') && seller?.cooking && <DetailRow label="조리 설비" value={seller.cooking} />}
                  {shareOn(flags, 'crew') && seller?.crew && <DetailRow label="운영 인원" value={seller.crew} />}
                  {shareOn(flags, 'sns') && seller?.sns && <DetailRow label="SNS" value={seller.sns} />}
                </div>
                {seller?.intro && <div className="text-[12px] text-text-secondary mt-2 leading-relaxed">{seller.intro}</div>}
              </div>

              {/* 제출 서류 */}
              <div>
                <div className="text-[12px] font-bold text-ink-soft mb-2">
                  제출 서류 {docs.length > 0 && `${docs.filter((d) => d.urgency === 'verified' || d.urgency === 'expiring').length}/${docs.length}`}
                </div>
                {docs.length === 0 ? (
                  <div className="text-[12px] text-text-tertiary">서류 정보를 불러올 수 없습니다.</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {docs.map((d) => {
                      const ok = d.urgency === 'verified' || d.urgency === 'expiring';
                      const pending = d.urgency === 'pending';
                      return (
                        <span
                          key={d.kind}
                          className={`text-[12px] px-2 py-1 rounded-[7px] font-semibold ${ok ? 'badge-success' : pending ? 'badge-info' : 'badge-danger'}`}
                        >
                          {ok ? '✓ ' : pending ? '· ' : '✕ '}{d.label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 판매 메뉴 */}
              {menus.length > 0 && (
                <div>
                  <div className="text-[12px] font-bold text-ink-soft mb-2">판매 메뉴 {menus.length}개</div>
                  <div className="flex flex-wrap gap-1.5">
                    {menus.map((m) => (
                      <span key={m.id} className="text-[12px] px-2 py-1 rounded-[7px] bg-surface-sunken text-ink-soft">
                        {m.signature ? '★ ' : ''}{m.name} ₩{m.price.toLocaleString()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 참여 이력 */}
              <div>
                <div className="text-[12px] font-bold text-ink-soft mb-2">참여 이력 {history.length}건</div>
                {history.length === 0 ? (
                  <div className="text-[12px] text-text-tertiary">등록된 참여 이력이 없습니다.</div>
                ) : (
                  <div className="space-y-1.5">
                    {history.slice(0, 6).map((h) => (
                      <div key={h.id} className="flex items-center justify-between gap-3 text-[12px] py-1.5 border-b border-line-faint last:border-0">
                        <div className="min-w-0">
                          <span className="font-semibold text-ink truncate">{h.event_name}</span>
                          {h.event_date && <span className="text-text-tertiary"> · {h.event_date.slice(0, 10).replace(/-/g, '.')}</span>}
                        </div>
                        <div className="text-text-secondary shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {shareOn(flags, 'sales_count') && h.orders ? `${h.orders.toLocaleString()}건` : ''}
                          {shareOn(flags, 'sales_revenue') && h.revenue ? `  ₩${h.revenue.toLocaleString()}` : ''}
                          {!shareOn(flags, 'sales_revenue') && !shareOn(flags, 'sales_count') ? '비공개' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {a.status === 'pending' && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-line-faint">
          <button onClick={() => onAct(a.id, 'approved')} disabled={actionOn === a.id} className="btn-primary flex-1">
            {actionOn === a.id ? '처리 중…' : '승인'}
          </button>
          <button onClick={() => onAct(a.id, 'rejected')} disabled={actionOn === a.id} className="btn-secondary flex-1">
            반려
          </button>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="p-2.5 rounded-input" style={{ background: 'var(--bg-surface-sunken, #FDFBF6)' }}>
      <div className="text-[10.5px] text-text-tertiary mb-0.5">{label}</div>
      <div className="text-[13px] font-semibold text-ink break-words">{value || '—'}</div>
    </div>
  );
}
