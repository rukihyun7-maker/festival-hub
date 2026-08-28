'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import {
  fetchMyProfile,
  fetchMyHostEvents,
  fetchApplicationsForHost,
  updateApplicationStatus,
  fetchSellerHistory,
  fetchRatingSummary,
  fetchMyMenus,
  fetchMyDocumentSlots,
  getSignedDocumentUrl,
  fetchPlatformSettings,
  fetchPartnerReviewsPublic,
} from '@/lib/supabase/queries';
import { REHIRE_LABEL } from '@/lib/types';
import type {
  Profile, EventRow, ApplicationWithRelations, ApplicationStatus,
  SellerHistory, RatingSummary, Menu, DocumentSlot, DocKind, PartnerReviewPublic,
} from '@/lib/types';

const BOOTH_KINDS: { kind: DocKind; label: string }[] = [
  { kind: 'booth_exterior', label: '외부' },
  { kind: 'booth_interior', label: '내부' },
  { kind: 'booth_storage', label: '재료보관' },
];

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
  const [docDownload, setDocDownload] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchMyProfile();
        setProfile(p);
        if (p) {
          const [evs, settings, apps] = await Promise.all([
            fetchMyHostEvents(p.id),
            fetchPlatformSettings().catch(() => null),
            fetchApplicationsForHost(p.id), // N+1 방지: 한 번에 조회(event/seller 임베드)
          ]);
          setEvents(evs);
          setDocDownload(settings?.host_doc_download ?? false);
          setApps(apps);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statusCounts = useMemo(() => ({
    pending: apps.filter((a) => a.status === 'pending').length,
    approved: apps.filter((a) => a.status === 'approved').length,
    rejected: apps.filter((a) => a.status === 'rejected').length,
  }), [apps]);

  const filtered = useMemo(
    () =>
      apps.filter(
        (a) =>
          (eventFilter === 'all' || a.event_id === eventFilter) &&
          (statusFilter === 'all' || a.status === statusFilter)
      ),
    [apps, eventFilter, statusFilter]
  );
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
        <div className="mb-4">
          <div className="t-section text-[20px]">신청자 관리</div>
          <div className="t-sub mt-1">전체 {apps.length}건 · 신청자 카드에서 [세부정보]로 매장·메뉴·부스사진·서류를 확인한 뒤 승인하세요.</div>
        </div>

        {/* 상태별 요약 */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <CountTile label="승인 대기" n={statusCounts.pending} tone="warning" />
          <CountTile label="승인" n={statusCounts.approved} tone="success" />
          <CountTile label="반려" n={statusCounts.rejected} tone="danger" />
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-2 mb-3">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => {
            const cnt = s === 'all' ? apps.length : statusCounts[s];
            return (
              <button key={s} onClick={() => setStatusFilter(s)} className={`chip ${statusFilter === s ? 'selected' : ''}`}>
                {s === 'all' ? '전체' : STATUS_META[s].label} {cnt}
              </button>
            );
          })}
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
              <ApplicantCard key={a.id} app={a} actionOn={actionOn} onAct={act} docDownload={docDownload} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ApplicantCard({
  app: a, actionOn, onAct, docDownload,
}: {
  app: ApplicationWithRelations;
  actionOn: string | null;
  onAct: (id: string, status: 'approved' | 'rejected') => void;
  docDownload: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [history, setHistory] = useState<SellerHistory[]>([]);
  const [rating, setRating] = useState<RatingSummary | null>(null);
  const [reviews, setReviews] = useState<PartnerReviewPublic[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [docs, setDocs] = useState<DocumentSlot[]>([]);

  const seller = a.seller;
  const meta = STATUS_META[a.status];
  const name = seller?.business_name || seller?.name || '(익명 파트너)';

  async function openDoc(path: string | null | undefined, download?: string) {
    if (!path) return;
    try { window.open(await getSignedDocumentUrl(path, 3600, download), '_blank', 'noopener'); }
    catch (e) { alert('파일을 열 수 없습니다: ' + (e as Error).message + ' (아직 업로드되지 않았을 수 있습니다)'); }
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded && seller) {
      setLoadingDetail(true);
      const [h, r, m, d, rv] = await Promise.all([
        fetchSellerHistory(seller.id).catch(() => [] as SellerHistory[]),
        fetchRatingSummary(seller.id).catch(() => null),
        fetchMyMenus(seller.id).catch(() => [] as Menu[]), // RLS 미허용 시 빈 배열
        fetchMyDocumentSlots(seller.id).catch(() => [] as DocumentSlot[]), // v9 정책 후 열람
        fetchPartnerReviewsPublic(seller.id).catch(() => [] as PartnerReviewPublic[]),
      ]);
      setHistory(h);
      setRating(r);
      setMenus(m);
      setDocs(d);
      setReviews(rv);
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
              {/* 매장 정보 (심사 필수 정보 · 신청 시 공개) */}
              <div>
                <div className="text-[12px] font-bold text-ink-soft mb-2">입점 파트너 정보</div>
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                  <DetailRow label="대표자" value={seller?.name} />
                  <DetailRow label="사업자번호" value={a.status === 'approved' ? seller?.business_no : null} locked={a.status !== 'approved'} />
                  <DetailRow label="연락처" value={a.status === 'approved' ? seller?.phone : null} locked={a.status !== 'approved'} />
                  <DetailRow label="평점" value={rating ? `${rating.avg_score} (${rating.review_count}건)` : '평가 없음'} />
                  {(() => {
                    const rev = history.filter((h) => (h.revenue ?? 0) > 0);
                    const avg = rev.length ? Math.round(rev.reduce((s, h) => s + (h.revenue || 0), 0) / rev.length) : 0;
                    return <DetailRow label="지난 행사 평균 매출" value={avg ? `₩${avg.toLocaleString()}` : '기록 없음'} />;
                  })()}
                  {seller?.hygiene_gear && <DetailRow label="위생 관리" value={seller.hygiene_gear} />}
                  {seller?.vehicle && <DetailRow label="차량·부스 규격" value={seller.vehicle} />}
                  {seller?.banner && <DetailRow label="현수막" value={seller.banner} />}
                  {seller?.power && <DetailRow label="전기 사용량" value={seller.power} />}
                  {seller?.cooking && <DetailRow label="조리 설비" value={seller.cooking} />}
                  {seller?.crew && <DetailRow label="운영 인원" value={seller.crew} />}
                  {seller?.sns && <DetailRow label="SNS" value={seller.sns} />}
                </div>
                {seller?.intro && <div className="text-[12px] text-text-secondary mt-2 leading-relaxed">{seller.intro}</div>}
              </div>

              {/* 받은 평가 (공개 후기 · 닉네임) */}
              {reviews.length > 0 && (
                <div>
                  <div className="text-[12px] font-bold text-ink-soft mb-2">
                    받은 평가 <span className="text-text-tertiary">{rating?.review_count ?? reviews.length}건</span>
                    {rating?.avg_score ? <span className="text-ink font-extrabold"> · ★ {rating.avg_score}</span> : null}
                    {rating?.recommend_count ? <span className="text-success font-semibold"> · 재섭외 {rating.recommend_count}</span> : null}
                  </div>
                  <div className="space-y-2">
                    {reviews.slice(0, 4).map((rv) => (
                      <div key={rv.id} className="p-2.5 rounded-input" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)' }}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[12px] font-bold text-ink">{rv.reviewer_nick}</span>
                          {rv.rehire && <span className="badge badge-success" style={{ fontSize: 10 }}>{REHIRE_LABEL[rv.rehire]}</span>}
                        </div>
                        {rv.praise_tags && rv.praise_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {rv.praise_tags.map((t) => <span key={t} className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: '#EAF3EC', color: '#2E7D46' }}>👍{t}</span>)}
                          </div>
                        )}
                        {rv.comment && <div className="text-[12px] text-ink-soft leading-relaxed">{rv.comment}</div>}
                      </div>
                    ))}
                    {reviews.length > 4 && <div className="text-[11px] text-text-tertiary">외 {reviews.length - 4}건</div>}
                  </div>
                </div>
              )}

              {/* 판매 메뉴 · 대표메뉴=이미지 포함, 나머지=텍스트 */}
              <div>
                <div className="text-[12px] font-bold text-ink-soft mb-2">판매 메뉴 <span className="text-text-tertiary">{menus.length}개</span></div>
                {menus.length === 0 ? (
                  <div className="text-[12px] text-text-tertiary p-2.5 rounded-input" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)' }}>등록된 판매 메뉴가 없습니다.</div>
                ) : (() => {
                  const sig = menus.filter((m) => m.signature);
                  const rest = menus.filter((m) => !m.signature);
                  return (
                    <>
                      {/* 대표 메뉴 — 이미지 포함 */}
                      {sig.length > 0 && (
                        <div className="mb-3">
                          <div className="text-[11px] font-extrabold text-ink mb-1.5">★ 대표 메뉴</div>
                          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                            {sig.map((m) => (
                              <div key={m.id} className="rounded-input overflow-hidden border" style={{ borderColor: '#E7DCA8', background: 'var(--warning-bg,#FFF9E6)' }}>
                                {m.image_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={m.image_url} alt={m.name} className="w-full h-24 object-cover" />
                                ) : (
                                  <div className="w-full h-24 flex items-center justify-center text-[11px] font-semibold text-danger" style={{ background: 'var(--bg-muted-2,#F3EFE5)' }}>✕ 사진 미첨부</div>
                                )}
                                <div className="p-2">
                                  <div className="text-[12px] font-bold text-ink truncate">★ {m.name}</div>
                                  <div className="text-[11px] text-text-secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>₩{m.price.toLocaleString()}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 그 외 메뉴 — 텍스트 */}
                      {rest.length > 0 && (
                        <div>
                          {sig.length > 0 && <div className="text-[11px] font-bold text-text-tertiary mb-1.5">그 외 메뉴</div>}
                          <div className="rounded-input border border-line-faint overflow-hidden" style={{ background: 'var(--bg-surface,#fff)' }}>
                            {rest.map((m, i) => (
                              <div key={m.id} className={`flex items-center gap-2.5 p-2 ${i !== 0 ? 'border-t border-line-faint' : ''}`}>
                                <span className="text-[12.5px] font-bold text-ink flex-1 truncate">{m.name}</span>
                                <span className="text-[11px] text-text-tertiary shrink-0">{m.category}</span>
                                <span className="text-[12px] font-semibold text-ink shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>₩{m.price.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* 부스·트럭 사진 (외부·내부·재료보관) — 열람/다운로드 */}
              <div>
                <div className="text-[12px] font-bold text-ink-soft mb-2">부스·트럭 사진</div>
                <div className="flex flex-wrap gap-1.5">
                  {BOOTH_KINDS.map(({ kind, label }) => {
                    const slot = docs.find((d) => d.kind === kind);
                    const path = slot?.doc?.file_url;
                    return path ? (
                      <span key={kind} className="inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-input badge-success">
                        📷 {label}
                        <button onClick={() => openDoc(path)} className="font-bold underline hover:opacity-70">열람</button>
                        <button onClick={() => openDoc(path, `${label}.jpg`)} className="font-bold underline hover:opacity-70">다운로드</button>
                      </span>
                    ) : (
                      <span key={kind} className="text-[12px] px-2.5 py-1.5 rounded-input font-semibold badge-danger">✕ {label} 미제출</span>
                    );
                  })}
                </div>
              </div>

              {/* 제출 서류 */}
              <div>
                <div className="text-[12px] font-bold text-ink-soft mb-2">
                  제출 서류 {docs.length > 0 && `${docs.filter((d) => d.urgency === 'verified' || d.urgency === 'expiring').length}/${docs.length}`}
                  {!docDownload && <span className="ml-1 font-normal text-text-tertiary">· 상태만 (관리자 검증)</span>}
                </div>
                {docs.length === 0 ? (
                  <div className="text-[12px] text-text-tertiary">서류 정보를 불러올 수 없습니다.</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {docs.filter((d) => !d.kind.startsWith('booth_')).map((d) => {
                      const path = d.doc?.file_url;
                      const hasFile = !!path;
                      const ok = hasFile && (d.urgency === 'verified' || d.urgency === 'expiring');
                      const pending = hasFile && d.urgency === 'pending';
                      return (
                        <span key={d.kind} className={`inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-[7px] font-semibold ${ok ? 'badge-success' : pending ? 'badge-info' : 'badge-danger'}`}>
                          {!hasFile ? `✕ ${d.label} 미첨부` : `${ok ? '✓ ' : '· '}${d.label}`}
                          {docDownload && hasFile && (
                            <button onClick={() => openDoc(path, `${d.label}.pdf`)} className="underline hover:opacity-70">다운로드</button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 참여 이력 (심사 공정성 · 전체 공개) */}
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
                          {h.orders ? `${h.orders.toLocaleString()}건` : ''}
                          {h.revenue ? `  ₩${h.revenue.toLocaleString()}` : ''}
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

function CountTile({ label, n, tone }: { label: string; n: number; tone: 'warning' | 'success' | 'danger' }) {
  const color = tone === 'success' ? 'var(--success,#1D6B2A)' : tone === 'danger' ? 'var(--danger,#9B2C22)' : 'var(--warning,#7A5B00)';
  return (
    <div className="card py-3 text-center">
      <div className="text-[22px] font-extrabold" style={{ color, fontVariantNumeric: 'tabular-nums' }}>{n}</div>
      <div className="text-[12px] text-text-secondary mt-0.5">{label}</div>
    </div>
  );
}

function DetailRow({ label, value, locked }: { label: string; value?: string | null; locked?: boolean }) {
  return (
    <div className="p-2.5 rounded-input" style={{ background: 'var(--bg-surface-sunken, #FDFBF6)' }}>
      <div className="text-[10.5px] text-text-tertiary mb-0.5">{label}</div>
      {locked ? (
        <div className="text-[12px] font-semibold text-text-tertiary break-words">🔒 승인 후 공개</div>
      ) : (
        <div className="text-[13px] font-semibold text-ink break-words">{value || '—'}</div>
      )}
    </div>
  );
}
