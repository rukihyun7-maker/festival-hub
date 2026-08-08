'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import NearbyInfoCard from '@/components/NearbyInfoCard';
import { fetchEventById, createApplication, fetchMyProfile, fetchMyDocumentSlots, countVerified, fetchMyFavorites, addFavorite, removeFavorite } from '@/lib/supabase/queries';
import { periodLabel, feeLabel, deadlineLabel, daysUntil } from '@/lib/types';
import type { EventRow, Profile, DocumentSlot } from '@/lib/types';

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [docSlots, setDocSlots] = useState<DocumentSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [saved, setSaved] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [fav, setFav] = useState(false);
  const [favBusy, setFavBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [e, p] = await Promise.all([fetchEventById(params.id), fetchMyProfile()]);
        if (!cancelled) {
          setEvent(e);
          setProfile(p);
        }
        if (p?.role === 'seller') {
          const s = await fetchMyDocumentSlots(p.id);
          if (!cancelled) setDocSlots(s);
          // 찜 조회는 실패해도 상세 표시를 막지 않음 (favorites 테이블 미생성 등)
          try {
            const favs = await fetchMyFavorites(p.id);
            if (!cancelled) setFav(favs.some((f) => f.event_id === params.id));
          } catch { /* 무시 */ }
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [params.id]);

  const verifiedCount = countVerified(docSlots);
  const totalDocs = docSlots.length;
  const canApply = totalDocs > 0 && verifiedCount === totalDocs && !!profile && profile.role === 'seller';

  async function handleApply() {
    if (!event || !profile) return;
    setApplying(true);
    try {
      await createApplication(event.id, profile.id);
      setApplied(true);
      setShowApplyModal(false);
    } catch (e) {
      alert('신청 실패: ' + (e as Error).message);
    } finally {
      setApplying(false);
    }
  }

  async function toggleFav() {
    if (!event || !profile || profile.role !== 'seller') return;
    setFavBusy(true);
    const next = !fav;
    setFav(next);
    try {
      if (next) await addFavorite(profile.id, event.id);
      else await removeFavorite(profile.id, event.id);
    } catch (e) {
      setFav(!next); // 롤백
      alert('찜 변경 실패: ' + (e as Error).message);
    } finally {
      setFavBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="seller" />
        <div className="container-app py-12">
          <div className="animate-pulse space-y-4 max-w-[720px]">
            <div className="h-4 bg-muted rounded w-32" />
            <div className="h-8 bg-muted rounded w-2/3" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="seller" />
        <div className="container-app py-12">
          <div className="card">
            <div className="text-[16px] font-bold text-danger mb-2">행사를 불러올 수 없습니다</div>
            <div className="text-[13px] text-text-secondary mb-4">{error ?? '존재하지 않거나 삭제된 행사입니다.'}</div>
            <Link href="/events" className="btn-secondary">← 목록으로</Link>
          </div>
        </div>
      </main>
    );
  }

  // 신청형/정보형은 kind 기준 (없으면 fee·deadline 추론). 정보형=공개정보, 신청 대상 아님
  const t = event.kind ?? (event.fee > 0 && event.deadline ? 'apply' : 'info');
  const d = daysUntil(event.deadline);
  const days = Math.max(1, Math.ceil((new Date(event.end_date).getTime() - new Date(event.start_date).getTime()) / 86400000) + 1);
  const totalFee = event.fee * days;

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="seller" />

      <div className="container-app py-8 md:py-12">
        {/* Breadcrumb */}
        <nav className="text-[12px] font-semibold text-text-tertiary mb-4">
          <Link href="/events" className="hover:text-ink">행사 찾기</Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{event.name}</span>
        </nav>

        {/* 히어로 */}
        <section className="animate-fh-up mb-8">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`badge ${t === 'apply' ? 'badge-warning' : 'badge-info'}`}>{t === 'apply' ? '신청형' : '정보형'}</span>
            <span className="badge">{event.category}</span>
            {event.deadline && <span className={`text-[11px] font-bold ${d !== null && d <= 3 ? 'text-danger' : 'text-warning'}`}>{deadlineLabel(event.deadline)}</span>}
          </div>
          <div className="flex items-start gap-3">
            <h1 className="t-title mb-2 flex-1 min-w-0">{event.name}</h1>
            {profile?.role === 'seller' && (
              <button
                onClick={toggleFav}
                disabled={favBusy}
                aria-label={fav ? '찜 해제' : '찜하기'}
                title={fav ? '찜 해제' : '찜하기'}
                className="shrink-0 text-[24px] leading-none mt-1"
                style={{ color: fav ? 'var(--accent, #FFC800)' : 'var(--text-disabled, #B5AC98)' }}
              >
                {fav ? '★' : '☆'}
              </button>
            )}
          </div>
          {event.description && (
            <p className="t-body text-text-secondary max-w-[680px]">{event.description}</p>
          )}
        </section>

        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {/* 좌측 · 상세 */}
          <div className="space-y-6" style={{ minWidth: 0 }}>
            <div className="card">
              <div className="t-section mb-4">기본 정보</div>
              <div className="grid gap-3">
                <InfoRow label="일정" value={`${periodLabel(event.start_date, event.end_date)} · ${days}일간`} />
                <InfoRow label="장소" value={event.address} />
                {event.visitors && <InfoRow label="유동인구" value={event.visitors} />}
                {event.capacity && <InfoRow label="자리" value={event.capacity} />}
                <InfoRow label="주최" value={event.organizer} />
              </div>
            </div>

            <NearbyInfoCard eventId={event.id} />

            <div className="card">
              <div className="t-section mb-4">{t === 'apply' ? '참가비 · 정산' : '행사 정보'}</div>
              <div className="grid gap-3">
                <InfoRow label="일 참가비" value={event.fee > 0 ? `${event.fee.toLocaleString()}원` : '무료'} strong />
                {t === 'apply' && <InfoRow label="매출 수수료" value={event.fee_rate > 0 ? `${event.fee_rate}%` : '없음'} />}
                {t === 'apply' && <InfoRow label="정산 주기" value={event.settlement_cycle || '주최 측 안내 예정'} />}
                {t === 'apply' && <InfoRow label="결제 방식" value={event.payment_method || '주최 측 안내 예정'} />}
                {t === 'info' && event.source && <InfoRow label="정보 출처" value={event.source} />}
              </div>
            </div>

            <div className="card">
              <div className="t-section mb-4">시설 · 옵션</div>
              <div className="flex flex-wrap gap-2">
                {event.electric && <span className="badge badge-success">전기</span>}
                {event.water && <span className="badge badge-success">상수도</span>}
                {event.gas && <span className="badge badge-success">가스</span>}
                {event.parking && <span className="badge badge-success">주차</span>}
                {!event.electric && !event.water && !event.gas && !event.parking && (
                  <span className="text-[13px] text-text-tertiary">제공 시설 정보 없음</span>
                )}
              </div>
            </div>

            {(event.contact || event.phone) && (
              <div className="card">
                <div className="t-section mb-4">문의</div>
                <div className="grid gap-3">
                  {event.contact && <InfoRow label="담당자" value={event.contact} />}
                  {event.phone && <InfoRow label="연락처" value={event.phone} />}
                </div>
              </div>
            )}
          </div>

          {/* 우측 · 스티키 카드 */}
          <aside style={{ position: 'sticky', top: 88, alignSelf: 'start' }}>
            {t === 'info' ? (
              /* 정보형: 신청 대상 아님 · 정보만 */
              <div className="card" style={{ borderColor: 'var(--info-bar, #8FA6DE)' }}>
                <span className="badge badge-info mb-3 inline-flex">정보 제공 행사</span>
                <div className="text-[15px] font-extrabold text-ink mb-2">신청 대상이 아닙니다</div>
                <p className="t-sub leading-relaxed mb-4">
                  이 행사는 공개 정보로 제공됩니다. 플랫폼을 통한 자리 신청 대상이 아니며, 참가·부스 문의는 주최 측에 직접 하세요.
                </p>
                {event.source && <div className="text-[12px] text-text-tertiary mb-4">출처 · {event.source}</div>}
                {profile?.role === 'seller' && (
                  <button onClick={toggleFav} disabled={favBusy} className="btn-secondary w-full">
                    {fav ? '★ 관심 등록됨' : '☆ 관심 등록'}
                  </button>
                )}
              </div>
            ) : (
            <div className="card card-apply">
              <div className="text-center pb-5 mb-5 border-b border-line-faint">
                <div className="text-[12px] font-semibold text-text-tertiary uppercase tracking-[0.05em] mb-2">참가비</div>
                <div className="text-[36px] font-extrabold text-ink tracking-[-0.03em]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {event.fee > 0 ? `₩${event.fee.toLocaleString()}` : '무료'}
                </div>
                <div className="text-[12px] text-text-secondary mt-1">
                  {event.fee > 0 ? `일 · ${event.fee_rate > 0 ? `매출 ${event.fee_rate}%` : '수수료 없음'}` : ''}
                </div>
              </div>

              {profile?.role === 'seller' && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-bold text-ink">필수 서류 검증</span>
                    <span className={`text-[12px] font-bold ${canApply ? 'text-success' : 'text-warning'}`}>{verifiedCount}/{totalDocs} 완료</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-pill overflow-hidden mb-3">
                    <div className={`h-full transition-all ${canApply ? 'bg-success' : 'bg-warning'}`} style={{ width: `${totalDocs ? (verifiedCount / totalDocs) * 100 : 0}%` }} />
                  </div>
                  <ul className="space-y-1.5">
                    {docSlots.map((s) => {
                      const ok = s.urgency === 'verified' || s.urgency === 'expiring';
                      return (
                        <li key={s.kind} className="flex items-center justify-between text-[12px]">
                          <span className={ok ? 'text-ink font-semibold' : 'text-text-secondary'}>{s.label}</span>
                          {s.urgency === 'verified' && <span className="text-success font-bold">✓</span>}
                          {s.urgency === 'expiring' && <span className="text-warning font-bold">만료 임박</span>}
                          {s.urgency === 'pending' && <span className="text-info font-bold">검토 중</span>}
                          {s.urgency === 'rejected' && <span className="text-danger font-bold">반려</span>}
                          {s.urgency === 'expired' && <span className="text-danger font-bold">만료됨</span>}
                          {s.urgency === 'missing' && <span className="text-text-tertiary font-bold">미등록</span>}
                        </li>
                      );
                    })}
                  </ul>
                  {!canApply && profile?.role === 'seller' && (
                    <a href="/seller/documents" className="block text-center text-[12px] text-accent-warm hover:text-accent-deep mt-3 font-semibold">
                      서류 관리로 이동 →
                    </a>
                  )}
                </div>
              )}

              {applied ? (
                <div className="text-center py-3">
                  <div className="text-[16px] font-extrabold text-success mb-1">✓ 신청 완료</div>
                  <div className="text-[12px] text-text-secondary">호스트 검토 후 알림 발송</div>
                </div>
              ) : (
                <>
                  <button
                    disabled={!canApply || applying}
                    onClick={() => setShowApplyModal(true)}
                    className="btn-primary w-full py-3.5 text-[15px]"
                  >
                    {applying ? '신청 중…' : profile?.role !== 'seller' ? '입점 파트너만 신청 가능' : canApply ? '지금 신청하기' : '서류 완료 후 신청 가능'}
                  </button>
                  <button onClick={() => setSaved((v) => !v)} className="btn-secondary w-full mt-2 py-3 text-[14px]">
                    {saved ? '★ 저장됨' : '☆ 관심 등록'}
                  </button>
                </>
              )}
            </div>
            )}
          </aside>
        </div>
      </div>

      {showApplyModal && (
        <ApplyModal
          event={event}
          days={days}
          totalFee={totalFee}
          onClose={() => setShowApplyModal(false)}
          onConfirm={handleApply}
          applying={applying}
        />
      )}
    </main>
  );
}

function InfoRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex gap-3 py-1">
      <span className="w-20 shrink-0 text-[13px] font-semibold text-text-tertiary">{label}</span>
      <span className={`flex-1 text-[14px] ${strong ? 'font-extrabold text-ink' : 'font-semibold text-ink'}`}>{value}</span>
    </div>
  );
}

function ApplyModal({
  event, days, totalFee, onClose, onConfirm, applying,
}: {
  event: EventRow;
  days: number;
  totalFee: number;
  onClose: () => void;
  onConfirm: () => void;
  applying: boolean;
}) {
  const [agreed, setAgreed] = useState(false);
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(20,18,14,0.4)' }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-[520px] bg-surface animate-fh-up" style={{ borderRadius: '20px 20px 0 0', padding: 'clamp(24px, 3vw, 32px)', maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[12px] font-semibold text-accent-warm uppercase tracking-[0.05em] mb-1">신청 확인</div>
            <div className="t-section">{event.name}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] hover:bg-surface-sunken flex items-center justify-center text-text-tertiary">×</button>
        </div>
        <div className="space-y-3 mb-6 p-4 bg-surface-sunken rounded-card border border-line-faint">
          <div className="flex justify-between text-[14px]"><span className="text-text-tertiary">일정</span><span className="font-semibold text-ink">{periodLabel(event.start_date, event.end_date)} ({days}일)</span></div>
          <div className="flex justify-between text-[14px]"><span className="text-text-tertiary">참가비 소계</span><span className="font-semibold text-ink">₩{totalFee.toLocaleString()}</span></div>
          <div className="flex justify-between text-[14px]"><span className="text-text-tertiary">수수료</span><span className="font-semibold text-ink">{event.fee_rate > 0 ? `${event.fee_rate}%` : '없음'}</span></div>
          <div className="pt-3 border-t border-line-faint flex justify-between">
            <span className="text-[14px] font-bold text-ink">결제 예정</span>
            <span className="text-[20px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>₩{totalFee.toLocaleString()}</span>
          </div>
        </div>
        <label className="flex items-start gap-2 mb-4 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
          <span className="text-[13px] text-text-secondary leading-[1.6]">
            참가 약관 및 취소 정책에 동의합니다. 확정 후 취소 시 참가비 30% 위약금이 발생합니다.
          </span>
        </label>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">취소</button>
          <button disabled={!agreed || applying} onClick={onConfirm} className="btn-primary flex-1">
            {applying ? '처리 중…' : '신청 확정'}
          </button>
        </div>
      </div>
    </div>
  );
}
