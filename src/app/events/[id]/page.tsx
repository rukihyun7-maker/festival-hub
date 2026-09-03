'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import NearbyInfoCard from '@/components/NearbyInfoCard';
import { fetchEventById, createApplication, fetchMyProfile, fetchMyDocumentSlots, fetchMyMenus, fetchEventContact, fetchMyFavorites, addFavorite, removeFavorite, uploadApplicationDoc, addApplicationDocument, fetchMyApplicationForEvent, incrementEventView, fetchEventFavoriteCount } from '@/lib/supabase/queries';
import { periodLabel, feeLabel, deadlineLabel, daysUntil, filledSiteDetails, filledSiteDetailRows, fitCheck, applyChecklist, requiredDocsVerified, REQUIRED_DOC_KINDS, DOC_META, siteNoun, slotUnit, vatNote } from '@/lib/types';
import type { EventRow, Profile, DocumentSlot, SiteDetails } from '@/lib/types';

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [docSlots, setDocSlots] = useState<DocumentSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [myAppStatus, setMyAppStatus] = useState<'pending' | 'approved' | null>(null);
  const [fav, setFav] = useState(false);
  const [favBusy, setFavBusy] = useState(false);
  const [favCount, setFavCount] = useState<number | null>(null);
  const [menuCount, setMenuCount] = useState(0);
  const [eventContact, setEventContact] = useState<{ contact: string | null; phone: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [e, p] = await Promise.all([fetchEventById(params.id), fetchMyProfile()]);
        if (!cancelled) {
          setEvent(e);
          setProfile(p);
        }
        // v46: 조회수 +1 (소유주·관리자 제외) · 찜 수 조회 (실패 무시)
        const isOwnerView = p?.role === 'admin' || (!!e && p?.id === e.owner_id);
        if (!isOwnerView) incrementEventView(params.id);
        try { const fc = await fetchEventFavoriteCount(params.id); if (!cancelled) setFavCount(fc); } catch { /* 무시 */ }
        // 연락처는 event_contacts에서 RLS로 조회 (주최·관리자·승인 신청자만 값 반환)
        try { const ec = await fetchEventContact(params.id); if (!cancelled) setEventContact(ec); } catch { /* 권한 없음/미생성 → null */ }
        if (p?.role === 'seller') {
          const [s, menus] = await Promise.all([fetchMyDocumentSlots(p.id), fetchMyMenus(p.id).catch(() => [])]);
          if (!cancelled) { setDocSlots(s); setMenuCount(menus.length); }
          // 이미 신청한 행사면 재신청 차단 (대기/승인 상태만 · 취소·반려는 재신청 허용)
          try {
            const mine = await fetchMyApplicationForEvent(params.id, p.id);
            if (!cancelled && mine && (mine.status === 'pending' || mine.status === 'approved')) {
              setApplied(true);
              setMyAppStatus(mine.status);
            }
          } catch { /* 무시 */ }
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

  const isSeller = profile?.role === 'seller';
  const sellerStatus = profile?.status ?? '정상';
  // 신청 자격: 필수 매장정보 + 필수 서류 6종 + 메뉴 1개 이상 (80% 대체)
  const check = applyChecklist(profile, docSlots, menuCount);
  const canApply = isSeller && check.ready;
  // 3단계 공개: 0.미검증 / 1.1차심사완료(정상)=모든 행사정보 열람·신청불가 / 2.검증파트너(자격완료)=연락처·신청
  const approved = !isSeller || sellerStatus === '정상';                 // 1차 심사완료
  const verified = !isSeller || (sellerStatus === '정상' && check.ready); // 검증 파트너(신청 자격 충족)

  async function handleApply(slotType: string | null, extraFiles: { label: string; file: File }[]) {
    if (!event || !profile) return;
    setApplying(true);
    try {
      // 1) 추가 서류를 먼저 모두 업로드 (하나라도 실패하면 신청 생성 전에 중단 → 반쪽 신청 방지)
      const uploaded: { label: string; path: string; name: string }[] = [];
      for (const ef of extraFiles) {
        const path = await uploadApplicationDoc(profile.id, ef.file);
        uploaded.push({ label: ef.label, path, name: ef.file.name });
      }
      // 2) 신청 생성 (반려·취소 후 재신청도 허용 · upsert)
      const app = await createApplication(event.id, profile.id, slotType);
      // 3) 업로드한 서류를 신청에 연결
      for (const u of uploaded) {
        await addApplicationDocument(app.id, u.label, u.path, u.name);
      }
      setApplied(true);
      setMyAppStatus('pending');
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
    setFavCount((c) => (c == null ? c : Math.max(0, c + (next ? 1 : -1))));
    try {
      if (next) await addFavorite(profile.id, event.id);
      else await removeFavorite(profile.id, event.id);
    } catch (e) {
      setFav(!next); // 롤백
      setFavCount((c) => (c == null ? c : Math.max(0, c + (next ? -1 : 1))));
      alert('관심 등록을 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.');
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
  // 정보형은 미검증도 전체 열람. 신청형 참가비·시설·현장상세는 1차 심사완료 전 블라인드.
  // (연락처는 event_contacts RLS로 별도 보호 — 승인 당사자만)
  const blindBody = t === 'apply' && !approved;
  const d = daysUntil(event.deadline);
  const days = Math.max(1, Math.ceil((new Date(event.end_date).getTime() - new Date(event.start_date).getTime()) / 86400000) + 1);
  // 마감/종료 판정 (신청·관심등록 비활성)
  const localToday = (() => { const dt = new Date(); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`; })();
  const ended = !!event.end_date && event.end_date < localToday;
  const closed = event.status === 'close' || event.status === 'canceled' || (d !== null && d < 0) || ended;
  const totalFee = event.fee * days;

  // 신청형 상세 열람 자격: 주최·관리자 OR (정상 계정 + 필수 서류 6종 검증 완료)
  const canSeeApplyDetail =
    profile?.role === 'host' || profile?.role === 'admin' ||
    (isSeller && sellerStatus === '정상' && requiredDocsVerified(docSlots));

  // 미검증(서류 미완료)·비로그인 → 신청형 상세 잠금 (정보형만 열람 가능)
  if (t === 'apply' && !canSeeApplyDetail) {
    const docsDone = REQUIRED_DOC_KINDS.filter((k) => {
      const u = docSlots.find((s) => s.kind === k)?.urgency;
      return u === 'verified' || u === 'expiring';
    }).length;
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="seller" />
        <div className="container-app py-8 md:py-12 max-w-[680px]">
          <nav className="text-[12px] font-semibold text-text-tertiary mb-4">
            <Link href="/events" className="hover:text-ink">행사 찾기</Link>
            <span className="mx-2">/</span>
            <span className="text-ink">{event.name}</span>
          </nav>
          <div className="flex items-center gap-2 mb-3">
            <span className="badge badge-warning">신청형</span>
            <span className="badge">{event.category}</span>
          </div>
          <h1 className="t-title mb-6">{event.name}</h1>
          <div className="card text-center py-12">
            <div className="text-[28px] mb-2">🔒</div>
            <div className="text-[16px] font-extrabold text-ink mb-1">검증된 입점 파트너만 볼 수 있는 신청 가능 행사예요</div>
            <p className="t-sub mb-1">가입 승인 + 필수 서류 6종 검증 완료 후 상세와 신청이 열립니다.</p>
            <p className="text-[13px] font-bold text-ink mb-6" style={{ fontVariantNumeric: 'tabular-nums' }}>
              필수 서류 검증 {docsDone}/{REQUIRED_DOC_KINDS.length}
            </p>
            {isSeller ? (
              <div className="flex gap-2 justify-center">
                <Link href="/seller/documents" className="btn-primary">필수 서류 등록·검증 →</Link>
                <Link href="/events" className="btn-secondary">정보 제공 행사 보기</Link>
              </div>
            ) : (
              <div className="flex gap-2 justify-center">
                <Link href="/signup" className="btn-primary">입점 파트너 가입 →</Link>
                <Link href="/events" className="btn-secondary">목록으로</Link>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

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
            <span className={`badge ${t === 'apply' ? 'badge-warning' : 'badge-info'}`}>{t === 'apply' ? '신청형' : (event.category || '정보형')}</span>
            {t === 'apply' && <span className="badge">{event.category}</span>}
            {event.deadline && <span className={`text-[11px] font-bold ${d !== null && d <= 3 ? 'text-danger' : 'text-warning'}`}>{deadlineLabel(event.deadline)}</span>}
          </div>
          <div className="flex items-start gap-3">
            <h1 className="t-title mb-2 flex-1 min-w-0">{event.name}</h1>
            {profile?.role === 'seller' && (
              <button
                onClick={toggleFav}
                disabled={favBusy}
                aria-label={fav ? '관심 해제' : '관심 등록'}
                title={fav ? '관심 해제' : '관심 등록'}
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
          {/* v46: 관심·조회 소셜 프루프 */}
          {((favCount ?? 0) > 0 || (event.view_count ?? 0) > 0) && (
            <div className="flex items-center gap-3 mt-3 text-[12px] text-text-tertiary" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {(favCount ?? 0) > 0 && <span>★ 관심 <b className="text-ink-soft">{favCount}</b></span>}
              {(event.view_count ?? 0) > 0 && <span>👁 조회 <b className="text-ink-soft">{(event.view_count ?? 0).toLocaleString()}</b></span>}
            </div>
          )}
        </section>

        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {/* 좌측 · 상세 */}
          <div className="space-y-6" style={{ minWidth: 0 }}>
            <div className="card">
              <div className="t-section mb-4">기본 정보</div>
              <div className="grid gap-3">
                <InfoRow label="일정" value={`${periodLabel(event.start_date, event.end_date)} · ${days}일간`} />
                {(event.operating_days?.length ?? 0) > 0 && (
                  <InfoRow label="운영 요일" value={`매주 ${['월', '화', '수', '목', '금', '토', '일'].filter((w) => event.operating_days!.includes(w)).join('·')}`} />
                )}
                <InfoRow label="장소" value={event.address} />
                {event.visitors && <InfoRow label="유동인구" value={event.visitors} />}
                {event.capacity && <InfoRow label="자리" value={event.capacity} />}
                <InfoRow label="주최" value={event.organizer} />
              </div>
            </div>

            {event.notice_url && (
              <a href={event.notice_url} target="_blank" rel="noopener noreferrer" className="card card-hover flex items-center gap-3" style={{ textDecoration: 'none' }}>
                <div className="text-[22px] shrink-0">📄</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-ink">모집 공고문</div>
                  <div className="text-[12px] text-text-secondary truncate">{event.notice_name || '공식 모집공고문'} · 클릭해서 열람·다운로드</div>
                </div>
                <span className="text-info font-bold text-[13px] shrink-0">열기 →</span>
              </a>
            )}

            {t === 'apply' && (event.recruit_slots?.length ?? 0) > 0 && (
              <div className="card">
                <div className="t-section mb-1">모집 부문</div>
                <p className="text-[12px] text-text-tertiary mb-3">부문별로 나눠 모집합니다. 부문마다 참가비·시설이 다를 수 있어요. 신청 시 부문을 선택하세요.</p>
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                  {event.recruit_slots!.map((s) => {
                    const fac = [s.electric && '전기', s.water && '수도', s.gas && '가스'].filter(Boolean).join('·');
                    return (
                      <div key={s.type} className="p-3 rounded-input" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)' }}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[13px] font-bold text-ink truncate">{s.type}</span>
                          <span className="text-[13px] font-extrabold text-accent-warm shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>{s.count}{slotUnit(s)}</span>
                        </div>
                        <div className="text-[11.5px] text-text-secondary">
                          참가비 {typeof s.fee === 'number' ? (s.fee > 0 ? `${s.fee.toLocaleString()}원` : '무료') : '행사 기본'}
                          {fac && ` · 시설 ${fac}`}
                        </div>
                        {s.note && <div className="text-[11px] text-text-tertiary mt-0.5 leading-relaxed">{s.note}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {t === 'apply' && ((event.required_docs?.extra?.length ?? 0) > 0 || (event.required_docs?.standard?.length ?? 0) > 0) && (
              <div className="card">
                <div className="t-section mb-1">필수 서류</div>
                <p className="text-[12px] text-text-tertiary mb-3">이 행사 신청에 필요한 서류입니다. 표준 서류는 검증된 서류가 자동 첨부되고, 추가 서류는 신청 시 첨부합니다.</p>
                {(event.required_docs?.standard?.length ?? 0) > 0 && (
                  <div className="mb-3">
                    <div className="text-[11px] font-bold text-text-tertiary mb-1.5">표준 서류</div>
                    <div className="flex flex-wrap gap-1.5">
                      {event.required_docs!.standard!.map((k) => (
                        <span key={k} className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#EAF3EC', color: '#2E7D46' }}>✓ {DOC_META[k]?.label ?? k}</span>
                      ))}
                    </div>
                  </div>
                )}
                {(event.required_docs?.extra?.length ?? 0) > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-text-tertiary mb-1.5">추가 서류 · 신청 시 첨부</div>
                    <div className="flex flex-wrap gap-1.5">
                      {event.required_docs!.extra!.map((d, i) => (
                        <span key={i} className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--warning-bg,#FBF5E6)', color: '#7A5B00' }}>📎 {d.label}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <NearbyInfoCard eventId={event.id} />

            <div className="card">
              <div className="t-section mb-4">{t === 'apply' ? '참가비 · 정산' : '행사 정보'}</div>
              {blindBody ? (
                <LockedBox />
              ) : (
                <div className="grid gap-3">
                  {t === 'apply' && <InfoRow label="일 참가비" value={event.fee > 0 ? `${event.fee.toLocaleString()}원 · ${vatNote(event.vat_included)}` : '무료'} strong />}
                  {t === 'apply' && <InfoRow label="매출 수수료" value={event.fee_rate > 0 ? `${event.fee_rate}%` : '없음'} />}
                  {t === 'apply' && event.settlement_method && <InfoRow label="정산 방식" value={event.settlement_method} />}
                  {t === 'apply' && <InfoRow label="정산 주기" value={event.settlement_cycle || '주최 측 안내 예정'} />}
                  {t === 'apply' && <InfoRow label="결제 방식" value={event.payment_method || '주최 측 안내 예정'} />}
                  {t === 'info' && event.phone && <InfoRow label="문의 전화" value={event.phone} />}
                  {t === 'info' && event.homepage && <InfoLinkRow label="공식 홈페이지" href={event.homepage} />}
                  {t === 'info' && !event.homepage && !event.phone && (
                    <div className="text-[13px] text-text-tertiary">상세 정보·문의는 아래 출처(공식 채널)에서 확인해 주세요.</div>
                  )}
                </div>
              )}
            </div>

            <div className="card">
              <div className="t-section mb-4">시설 · 옵션</div>
              {blindBody ? (
                <LockedBox />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {event.electric && <span className="badge badge-success">전기</span>}
                  {event.water && <span className="badge badge-success">상수도</span>}
                  {event.gas && <span className="badge badge-success">가스</span>}
                  {event.parking && <span className="badge badge-success">주차</span>}
                  {!event.electric && !event.water && !event.gas && !event.parking && (
                    <span className="text-[13px] text-text-tertiary">제공 시설 정보 없음</span>
                  )}
                </div>
              )}
            </div>

            {/* v24: 현장 상세 (입력된 항목 있을 때만) · v46 부문 따라 명칭 동적 */}
            {(() => {
              const rows = filledSiteDetailRows(event.site_details);
              if (rows.length === 0) return null;
              const noun = siteNoun(event.recruit_slots);
              const labelFor = (key: keyof SiteDetails, base: string) =>
                key === 'power' ? `${noun.spot}당 전기 용량` : key === 'booth' ? `${noun.spot} 사양` : base;
              return (
                <div className="card">
                  <div className="t-section mb-1">{noun.section}</div>
                  <p className="text-[12px] text-text-tertiary mb-4">전기·급배수·차량 진입 등 입점 판단에 필요한 현장 정보입니다.</p>
                  {blindBody ? (
                    <LockedBox />
                  ) : (
                    <div className="grid gap-3">
                      {rows.map((r) => <InfoRow key={r.key} label={labelFor(r.key, r.label)} value={r.value} />)}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* v24: 자리 적합도 체크 (입점 파트너 · 현장정보 열람 가능할 때) */}
            {isSeller && !blindBody && filledSiteDetails(event.site_details).length > 0 && (() => {
              const fit = fitCheck(event.site_details, { power: profile?.power, vehicle: profile?.vehicle, cooking: profile?.cooking });
              if (fit.rows.length === 0) return null;
              return (
                <div className="card">
                  <div className="t-section mb-1">내 트럭과 이 자리 적합도</div>
                  <p className="text-[12px] text-text-tertiary mb-4">등록하신 정보와 자리 조건을 맞춰봤어요. 참고용이니, 최종 확인은 직접 해주세요.</p>

                  {fit.warnings.length > 0 ? (
                    <div className="rounded-input p-3 mb-4" style={{ background: 'var(--danger-bg, #FBEDEA)', border: '1px solid #E5B8AE' }}>
                      {fit.warnings.map((w, i) => (
                        <div key={i} className="text-[12.5px] font-semibold text-danger flex gap-1.5">
                          <span>⚠️</span><span>{w}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-input p-3 mb-4 text-[12.5px] font-semibold" style={{ background: 'var(--success-bg, #E9F4EC)', color: 'var(--success, #1D6B2A)' }}>
                      ✓ 눈에 띄는 부적합 조건은 없습니다. 아래 표로 세부 대조를 확인하세요.
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr className="text-[11px] text-text-tertiary">
                          <th className="text-left font-semibold py-1.5 pr-2">항목</th>
                          <th className="text-left font-semibold py-1.5 pr-2">이 자리</th>
                          <th className="text-left font-semibold py-1.5">내 등록</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fit.rows.map((r) => (
                          <tr key={r.label} className="border-t border-line-faint">
                            <td className="py-2 pr-2 font-semibold text-ink whitespace-nowrap">{r.label}</td>
                            <td className="py-2 pr-2 text-ink">{r.site}</td>
                            <td className={`py-2 ${r.mine === '미등록' ? 'text-text-tertiary' : 'text-ink'}`}>{r.mine}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {!fit.hasMine && (
                    <div className="text-[12px] text-text-secondary mt-3 p-2.5 rounded-input" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)' }}>
                      내 차량·전기·조리 정보를 등록하면 자동 대조가 정확해집니다.{' '}
                      <Link href="/seller" className="text-info font-semibold underline">프로필에서 등록 →</Link>
                    </div>
                  )}
                </div>
              );
            })()}

            {event.contact_hidden && isSeller ? (
              <div className="card">
                <div className="t-section mb-4">문의</div>
                <LockedBox
                  title="담당자 정보 비공개"
                  desc={<>이 행사는 담당자·연락처를 공개하지 않습니다. 문의·소통은 플랫폼 신청으로 진행해 주세요.</>}
                />
              </div>
            ) : !event.contact_hidden && eventContact && (eventContact.contact || eventContact.phone) ? (
              <div className="card">
                <div className="t-section mb-4">문의</div>
                <div className="grid gap-3">
                  {eventContact.contact && <InfoRow label="담당자" value={eventContact.contact} />}
                  {eventContact.phone && <InfoRow label="연락처" value={eventContact.phone} />}
                </div>
              </div>
            ) : !event.contact_hidden && t === 'apply' && isSeller ? (
              <div className="card">
                <div className="t-section mb-4">문의</div>
                <LockedBox
                  title="연락처는 승인 후 공개"
                  desc={<>이 행사에 신청하고 주최의 승인을 받으면 담당자·연락처를 볼 수 있습니다. 그 전까지 소통은 플랫폼 신청으로 진행됩니다.</>}
                />
              </div>
            ) : null}
          </div>

          {/* 우측 · 스티키 카드 */}
          <aside style={{ position: 'sticky', top: 88, alignSelf: 'start' }}>
            {t === 'info' ? (
              /* 정보형: 신청 대상 아님 · 정보만 */
              <div className="card" style={{ borderColor: 'var(--info-bar, #8FA6DE)' }}>
                <span className="badge badge-info mb-3 inline-flex">정보 제공 행사</span>
                <div className="text-[15px] font-extrabold text-ink mb-2">직접 신청할 수 있는 등록 행사가 아닙니다</div>
                <p className="t-sub leading-relaxed mb-4">
                  이 행사는 참고용 공개 정보로 제공됩니다. 플랫폼에서 자리 신청을 받는 등록 행사가 아니며, 참가·부스 문의는 주최 측에 직접 해주세요.
                </p>
                {event.source && <div className="text-[12px] text-text-tertiary mb-3">출처 · {event.source}</div>}
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
                  {event.fee > 0 ? `일 · ${vatNote(event.vat_included)}${event.fee_rate > 0 ? ` · 매출 ${event.fee_rate}%` : ''}` : ''}
                </div>
              </div>

              {profile?.role === 'seller' && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] font-bold text-ink">신청 자격</span>
                    <span className={`text-[12px] font-bold ${canApply ? 'text-success' : 'text-warning'}`}>{canApply ? '충족' : '미충족'}</span>
                  </div>
                  <ul className="space-y-2">
                    <CheckRow ok={check.storeOk} label="매장 정보" detail={check.storeOk ? '완료' : `${check.storeMissing.length}개 미입력`} href="/seller" />
                    <CheckRow ok={check.docsOk} label="필수 서류 6종(검증)" detail={check.docsOk ? '완료' : `${check.docsMissing.length}개 미검증`} href="/seller/documents" />
                    <CheckRow ok={check.menuOk} label="판매 메뉴" detail={check.menuOk ? `${menuCount}개` : '1개 이상 필요'} href="/seller" />
                  </ul>
                  {(!check.storeOk || !check.docsOk) && (
                    <div className="text-[11px] text-text-tertiary mt-2 leading-relaxed">
                      {!check.storeOk && <div>매장정보 미입력: {check.storeMissing.join(', ')}</div>}
                      {!check.docsOk && <div>서류 미검증: {check.docsMissing.join(', ')}</div>}
                    </div>
                  )}
                  <div className="text-[11px] text-text-tertiary mt-2">※ 서류는 관리자 검증 완료 후 인정됩니다. 영업배상책임보험은 선택 항목입니다.</div>
                </div>
              )}

              {closed ? (
                <div className="text-center py-3">
                  <div className="text-[15px] font-extrabold text-text-secondary mb-1">{ended ? '종료된 행사' : '모집이 마감되었습니다'}</div>
                  <div className="text-[12px] text-text-tertiary">더 이상 신청을 받지 않습니다</div>
                </div>
              ) : applied ? (
                <div className="text-center py-3">
                  <div className="text-[16px] font-extrabold text-success mb-1">{myAppStatus === 'approved' ? '✓ 승인됨' : '✓ 신청 완료'}</div>
                  <div className="text-[12px] text-text-secondary">{myAppStatus === 'approved' ? '주최 승인이 완료된 행사입니다' : '이미 신청한 행사예요. 주최가 검토한 뒤 알려드릴게요.'}</div>
                  <Link href="/seller/applications" className="text-[12px] font-bold text-info hover:underline inline-block mt-2">내 신청 현황 보기 →</Link>
                </div>
              ) : (
                <>
                  <button
                    disabled={!verified || applying}
                    onClick={() => setShowApplyModal(true)}
                    className="btn-primary w-full py-3.5 text-[15px]"
                  >
                    {applying ? '신청 중…' : !isSeller ? '입점 파트너만 신청 가능' : verified ? '지금 신청하기' : approved ? '신청 자격 충족 후 신청 가능' : '가입 승인 후 신청 가능'}
                  </button>
                  {isSeller && (
                    <button onClick={toggleFav} disabled={favBusy} className="btn-secondary w-full mt-2 py-3 text-[14px]">
                      {fav ? '★ 관심 등록됨' : '☆ 관심 등록'}
                    </button>
                  )}
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

function LockedBox({ title, desc }: { title?: string; desc?: React.ReactNode }) {
  return (
    <div className="rounded-input p-4 text-center" style={{ background: 'var(--bg-surface-sunken, #FDFBF6)' }}>
      <div className="text-[20px] mb-1">🔒</div>
      <div className="text-[13px] font-bold text-ink mb-0.5">{title ?? '가입 승인 후 열람 가능'}</div>
      <div className="text-[12px] text-text-secondary">
        {desc ?? (
          <>
            필수 서류 등록·관리자 승인을 마치면 이 정보를 볼 수 있습니다.{' '}
            <Link href="/seller/documents" className="text-info font-semibold underline">서류 등록 →</Link>
          </>
        )}
      </div>
    </div>
  );
}

function CheckRow({ ok, label, detail, href }: { ok: boolean; label: string; detail: string; href: string }) {
  return (
    <li className="flex items-center justify-between text-[12.5px]">
      <span className="flex items-center gap-1.5">
        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${ok ? 'bg-success text-white' : 'bg-muted text-text-tertiary'}`}>{ok ? '✓' : '·'}</span>
        <span className={ok ? 'text-ink font-semibold' : 'text-text-secondary'}>{label}</span>
      </span>
      {ok ? (
        <span className="text-[11px] font-semibold text-success">{detail}</span>
      ) : (
        <Link href={href} className="text-[11px] font-bold text-info hover:underline">{detail} →</Link>
      )}
    </li>
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

/** 지저분한 홈페이지 값에서 첫 번째 정상 URL만 추출 (여러 링크·설명 혼재 대응) */
function cleanUrl(raw: string): { href: string; label: string } {
  const m = raw.match(/https?:\/\/[^\s"'<>]+/i);
  let url = m ? m[0] : (raw.trim().split(/\s+/)[0] || raw.trim());
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url.replace(/^\/+/, '');
  const label = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return { href: url, label };
}

function InfoLinkRow({ label, href }: { label: string; href: string }) {
  const { href: url, label: pretty } = cleanUrl(href);
  return (
    <div className="flex gap-3 py-1">
      <span className="w-20 shrink-0 text-[13px] font-semibold text-text-tertiary">{label}</span>
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 text-[14px] font-bold text-info hover:underline break-all">
        {pretty} ↗
      </a>
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
  onConfirm: (slotType: string | null, extraFiles: { label: string; file: File }[]) => void;
  applying: boolean;
}) {
  const [agreed, setAgreed] = useState(false);
  const [agreeInfo, setAgreeInfo] = useState(false);
  const slots = event.recruit_slots ?? [];
  const [slot, setSlot] = useState<string | null>(slots.length === 1 ? slots[0].type : null);
  const slotOk = slots.length === 0 || !!slot;
  const extraDocs = (event.required_docs?.extra ?? []).filter((d) => d.label.trim());
  const [extraFiles, setExtraFiles] = useState<Record<number, File>>({});
  const extraOk = extraDocs.every((_, i) => extraFiles[i]);
  const selSlot = slots.find((s) => s.type === slot);
  const effFee = selSlot && typeof selSlot.fee === 'number' ? (selSlot.fee as number) : event.fee;
  const total = effFee * days;
  const selFac = selSlot ? [selSlot.electric && '전기', selSlot.water && '수도', selSlot.gas && '가스'].filter(Boolean).join('·') : '';
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
          <div className="flex justify-between items-start text-[14px]">
            <span className="text-text-tertiary">참가비 소계{selSlot ? ` · ${selSlot.type}` : ''}</span>
            <span className="text-right">
              <span className="font-semibold text-ink block" style={{ fontVariantNumeric: 'tabular-nums' }}>₩{total.toLocaleString()}</span>
              {effFee > 0 && <span className="text-[11px] text-text-tertiary">일 ₩{effFee.toLocaleString()} × {days}일</span>}
            </span>
          </div>
          <div className="flex justify-between text-[14px]"><span className="text-text-tertiary">수수료</span><span className="font-semibold text-ink">{event.fee_rate > 0 ? `${event.fee_rate}%` : '없음'}</span></div>
          <div className="pt-3 border-t border-line-faint flex justify-between items-baseline">
            <span className="text-[14px] font-bold text-ink">예상 참가비 <span className="text-[11px] font-normal text-text-tertiary">· {vatNote(event.vat_included)}</span></span>
            <span className="text-[20px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>₩{total.toLocaleString()}</span>
          </div>
        </div>

        {slots.length > 0 && (
          <div className="mb-4">
            <div className="text-[13px] font-bold text-ink mb-2">신청 부문 <span className="text-danger">*</span></div>
            <div className="flex flex-wrap gap-1.5">
              {slots.map((s) => (
                <button key={s.type} type="button" onClick={() => setSlot(s.type)}
                  className={`text-[12.5px] font-bold px-3 py-2 rounded-input border-2 transition-all ${slot === s.type ? 'bg-ink text-white border-ink' : 'bg-surface text-ink border-line-strong hover:border-ink'}`}>
                  {s.type} <span className="opacity-70">· {s.count}{slotUnit(s)}</span>
                </button>
              ))}
            </div>
            {selSlot && (selFac || selSlot.note || typeof selSlot.fee === 'number') && (
              <div className="text-[12px] text-text-secondary mt-2 p-2.5 rounded-input" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)' }}>
                {typeof selSlot.fee === 'number' && <span>참가비 {selSlot.fee > 0 ? `${selSlot.fee.toLocaleString()}원/일` : '무료'}</span>}
                {selFac && <span>{typeof selSlot.fee === 'number' ? ' · ' : ''}시설 {selFac}</span>}
                {selSlot.note && <div className="text-[11px] text-text-tertiary mt-0.5">{selSlot.note}</div>}
              </div>
            )}
          </div>
        )}

        {extraDocs.length > 0 && (
          <div className="mb-4">
            <div className="text-[13px] font-bold text-ink mb-1">이 행사 추가 서류 <span className="text-danger">*</span></div>
            <div className="text-[11px] text-text-tertiary mb-2">주최가 요청한 추가 서류를 첨부해 주세요.</div>
            <div className="space-y-2">
              {extraDocs.map((d, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 rounded-input" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-bold text-ink truncate">{d.label}</div>
                    {extraFiles[i] && <div className="text-[11px] text-success truncate">첨부: {extraFiles[i].name}</div>}
                  </div>
                  <label className="btn-secondary text-[11px] py-1.5 px-2.5 cursor-pointer shrink-0">
                    {extraFiles[i] ? '변경' : '첨부'}
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setExtraFiles((p) => ({ ...p, [i]: f })); }} />
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2.5 mb-4">
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
            <span className="text-[13px] text-text-secondary leading-[1.6]">
              <b className="text-ink">(필수)</b> 참가 약관 및 취소 정책에 동의합니다. 확정 후 취소 시 참가비 30% 위약금이 발생합니다.
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={agreeInfo} onChange={(e) => setAgreeInfo(e.target.checked)} className="mt-1" />
            <span className="text-[13px] text-text-secondary leading-[1.6]">
              <b className="text-ink">(필수) 정보 제공 동의</b> — 주최가 신청을 <b>승인</b>하면, 원활한 진행을 위해 주최에게 <b>담당자·연락처·사업자 정보 및 등록 서류</b>가 제공되는 것에 동의합니다. (승인 전에는 제공되지 않습니다)
            </span>
          </label>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">취소</button>
          <button disabled={!agreed || !agreeInfo || !slotOk || !extraOk || applying} onClick={() => onConfirm(slot, extraDocs.map((d, i) => ({ label: d.label, file: extraFiles[i]! })))} className="btn-primary flex-1">
            {applying ? '처리 중…' : !slotOk ? '부문을 선택하세요' : !extraOk ? '추가 서류를 첨부하세요' : '신청 확정'}
          </button>
        </div>
      </div>
    </div>
  );
}
