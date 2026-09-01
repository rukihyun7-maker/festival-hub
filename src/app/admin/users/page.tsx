'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import {
  fetchAllProfiles, fetchMyProfile, updateProfileRole, updateProfileStatus, deleteHostAccount, deleteUserAccount,
  fetchMyDocumentSlots, fetchMyMenus, getSignedDocumentUrl, reviewDocument, countVerified,
  fetchSellerHistory, fetchRatingSummary, fetchMyHostEvents, notifyAccountDecision, createUserByAdmin,
} from '@/lib/supabase/queries';
import type { Profile, SellerStatus, DocumentSlot, Menu, SellerHistory, RatingSummary, EventRow } from '@/lib/types';

/**
 * 사용자 관리 · Admin only
 * 검색 + role 필터 + 인라인 권한 변경
 */

type RoleFilter = 'all' | 'seller' | 'host' | 'admin';

export default function AdminUsersPage() {
  const [me, setMe] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    (async () => {
      const p = await fetchMyProfile();
      setMe(p);
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchAllProfiles({ q, role: roleFilter });
        if (!cancelled) setProfiles(data);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250); // debounce
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, roleFilter, bump]);

  async function changeRole(profileId: string, role: 'seller' | 'host' | 'admin') {
    if (!confirm(`이 계정의 권한을 ${role}로 변경하시겠어요?`)) return;
    setUpdatingId(profileId);
    try {
      await updateProfileRole(profileId, role);
      setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, role } : p)));
    } catch (e) {
      alert('변경 실패: ' + (e as Error).message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function changeStatus(profileId: string, status: SellerStatus, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setUpdatingId(profileId);
    try {
      await updateProfileStatus(profileId, status);
      setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, status } : p)));
    } catch (e) {
      alert('상태 변경 실패: ' + (e as Error).message);
    } finally {
      setUpdatingId(null);
    }
  }

  /** 가입 승인/반려 (파트너·주최 공통) → 상태 변경 후 안내 메일 발송 */
  async function decide(profileId: string, decision: 'approved' | 'rejected') {
    const status: SellerStatus = decision === 'approved' ? '정상' : '반려';
    if (decision === 'approved' && !confirm('가입을 승인하시겠어요? 승인 안내 메일이 발송됩니다.')) return;
    let reason: string | undefined;
    if (decision === 'rejected') {
      const r = window.prompt('가입을 반려합니다. 반려 사유(선택) — 안내 메일에 포함됩니다:', '');
      if (r === null) return; // 취소
      reason = r.trim() || undefined;
    }
    setUpdatingId(profileId);
    try {
      await updateProfileStatus(profileId, status);
      setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, status } : p)));
      try {
        const res = await notifyAccountDecision(profileId, decision, reason);
        if (res.skipped) {
          alert(`상태를 변경했습니다.\n(메일은 RESEND_API_KEY 미설정으로 발송되지 않았습니다.)`);
        }
      } catch (mailErr) {
        alert('상태는 변경됐지만 안내 메일 발송에 실패했습니다:\n' + (mailErr as Error).message);
      }
    } catch (e) {
      alert('상태 변경 실패: ' + (e as Error).message);
    } finally {
      setUpdatingId(null);
    }
  }

  if (me && me.role !== 'admin') {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="admin" />
        <div className="container-app py-12">
          <div className="card">
            <div className="text-[16px] font-bold text-ink mb-2">관리자 권한이 필요합니다</div>
            <Link href="/login" className="btn-primary">관리자로 로그인 →</Link>
          </div>
        </div>
      </main>
    );
  }

  const counts = {
    seller: profiles.filter((p) => p.role === 'seller').length,
    host: profiles.filter((p) => p.role === 'host').length,
    admin: profiles.filter((p) => p.role === 'admin').length,
  };

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="admin" />

      <div className="container-app py-8 md:py-12">
        <nav className="text-[12px] font-semibold text-text-tertiary mb-4">
          <Link href="/admin" className="hover:text-ink">인사이트</Link>
          <span className="mx-2">/</span>
          <span className="text-ink">사용자 관리</span>
        </nav>

        <div className="flex items-end justify-between mb-6 gap-3">
          <div>
            <h1 className="t-title mb-1">사용자 관리</h1>
            <p className="t-sub">
              전체 {profiles.length}명 · 파트너 {counts.seller} · 주최 {counts.host} · 관리자 {counts.admin}
            </p>
          </div>
          <button onClick={() => setCreateOpen((v) => !v)} className="btn-primary shrink-0 text-[13px] py-2.5">
            {createOpen ? '닫기' : '+ 테스트 계정 생성'}
          </button>
        </div>

        {createOpen && (
          <CreateUserCard
            onCreated={() => { setBump((b) => b + 1); }}
            onClose={() => setCreateOpen(false)}
          />
        )}

        {/* 검색 + 필터 */}
        <div className="card mb-6">
          <div className="flex flex-col gap-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="이름·이메일·사업자명 검색"
              className="input"
            />
            <div className="flex flex-wrap gap-1.5">
              <button className={`chip ${roleFilter === 'all' ? 'selected' : ''}`} onClick={() => setRoleFilter('all')}>전체</button>
              <button className={`chip ${roleFilter === 'seller' ? 'selected' : ''}`} onClick={() => setRoleFilter('seller')}>입점 파트너</button>
              <button className={`chip ${roleFilter === 'host' ? 'selected' : ''}`} onClick={() => setRoleFilter('host')}>행사 주최</button>
              <button className={`chip ${roleFilter === 'admin' ? 'selected' : ''}`} onClick={() => setRoleFilter('admin')}>관리자</button>
            </div>
          </div>
        </div>

        {error && (
          <div className="card mb-6" style={{ borderColor: '#E0DACB' }}>
            <div className="text-[13px] font-bold text-warning mb-1">오류</div>
            <div className="text-[12px] text-text-secondary">{error}</div>
          </div>
        )}

        {/* 리스트 */}
        {loading ? (
          <div className="card">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-3/4" />
            </div>
          </div>
        ) : profiles.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-[15px] font-semibold text-ink mb-2">조건에 맞는 사용자가 없습니다</div>
            <div className="t-sub">검색어나 필터를 조정해보세요</div>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            {profiles.map((p, i) => (
              <div key={p.id} className={i !== profiles.length - 1 ? 'border-b border-line-faint' : ''}>
              <div className={`grid gap-4 items-center p-5 hover:bg-surface-sunken transition-colors`} style={{ gridTemplateColumns: 'auto minmax(200px, 2fr) minmax(120px, 1fr) auto' }}>
                {/* 아바타 */}
                <div className={`w-10 h-10 rounded-pill flex items-center justify-center font-extrabold text-[14px] ${
                  p.role === 'admin' ? 'bg-ink text-accent' : p.role === 'host' ? 'bg-info-bar text-white' : 'bg-accent text-ink'
                }`}>
                  {p.name[0]}
                </div>

                {/* 정보 */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[15px] font-bold text-ink truncate">{p.business_name ?? p.name}</span>
                    <RoleBadge role={p.role} />
                    {p.role === 'seller' && <SellerStatusBadge status={p.status ?? '정상'} />}
                    {p.role === 'host' && (p.status === '가입 심사' || p.status === '반려') && <SellerStatusBadge status={p.status} />}
                  </div>
                  <div className="text-[12px] text-text-secondary truncate">
                    {p.name} · <span style={{ fontFamily: 'ui-monospace, monospace' }}>{p.email}</span>
                  </div>
                  <div className="text-[11px] text-text-tertiary mt-0.5">
                    {p.region && `${p.region} · `}가입 {new Date(p.created_at).toLocaleDateString('ko-KR')}
                    {p.phone && ` · ${p.phone}`}
                  </div>
                </div>

                {/* 권한 변경 */}
                <div className="hidden md:block">
                  <select
                    value={p.role}
                    onChange={(e) => changeRole(p.id, e.target.value as 'seller' | 'host' | 'admin')}
                    disabled={updatingId === p.id || p.id === me?.id}
                    className="input py-2 text-[12px]"
                    style={{ minWidth: 100 }}
                  >
                    <option value="seller">입점 파트너</option>
                    <option value="host">행사 주최</option>
                    <option value="admin">관리자</option>
                  </select>
                </div>

                {/* 상태 액션 (입점 파트너 전용) */}
                <div className="flex gap-2 shrink-0 items-center">
                  {p.role === 'seller' ? (
                    <>
                      <button
                        onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                        className="text-[12px] font-semibold text-text-secondary hover:text-ink px-2 py-1.5 rounded-input border border-line"
                      >
                        {expandedId === p.id ? '접기' : '심사 상세'}
                      </button>
                      {(() => {
                        const st = p.status ?? '정상';
                        if (st === '가입 심사') return (
                          <>
                            <button disabled={updatingId === p.id} onClick={() => decide(p.id, 'rejected')} className="text-[12px] text-danger hover:underline font-semibold px-1">반려</button>
                            <button disabled={updatingId === p.id} onClick={() => decide(p.id, 'approved')} className="btn-primary text-[12px] py-1.5 px-3">가입 승인</button>
                          </>
                        );
                        if (st === '반려') return (
                          <button disabled={updatingId === p.id} onClick={() => changeStatus(p.id, '가입 심사', '재심사 대기 상태로 되돌리시겠어요?')} className="btn-secondary text-[12px] py-1.5 px-3">재심사</button>
                        );
                        if (st === '정지') return (
                          <button disabled={updatingId === p.id} onClick={() => changeStatus(p.id, '정상', '정지를 해제하시겠어요?')} className="btn-secondary text-[12px] py-1.5 px-3">정지 해제</button>
                        );
                        return (
                          <button disabled={updatingId === p.id} onClick={() => changeStatus(p.id, '정지', '이 파트너의 이용을 정지하시겠어요? 신규 신청이 차단됩니다.')} className="text-[12px] text-danger hover:underline font-semibold">이용 정지</button>
                        );
                      })()}
                    </>
                  ) : p.role === 'host' ? (
                    <>
                      <button
                        onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                        className="text-[12px] font-semibold text-text-secondary hover:text-ink px-2 py-1.5 rounded-input border border-line"
                      >
                        {expandedId === p.id ? '접기' : '정보 상세'}
                      </button>
                      {(() => {
                        const st = p.status ?? '정상';
                        if (st === '가입 심사') return (
                          <>
                            <button disabled={updatingId === p.id} onClick={() => decide(p.id, 'rejected')} className="text-[12px] text-danger hover:underline font-semibold px-1">반려</button>
                            <button disabled={updatingId === p.id} onClick={() => decide(p.id, 'approved')} className="btn-primary text-[12px] py-1.5 px-3">가입 승인</button>
                          </>
                        );
                        if (st === '반려') return (
                          <button disabled={updatingId === p.id} onClick={() => changeStatus(p.id, '가입 심사', '재심사 대기 상태로 되돌리시겠어요?')} className="btn-secondary text-[12px] py-1.5 px-3">재심사</button>
                        );
                        // 정상(승인됨) → 반려로 전환 가능
                        return (
                          <button disabled={updatingId === p.id} onClick={() => decide(p.id, 'rejected')} className="text-[12px] text-danger hover:underline font-semibold">가입 반려</button>
                        );
                      })()}
                    </>
                  ) : (
                    <span className="text-[11px] text-text-tertiary">—</span>
                  )}
                </div>
              </div>
              {expandedId === p.id && p.role === 'seller' && (
                <SellerReviewDetail seller={p} adminId={me?.id ?? ''} onDeleted={() => setProfiles((prev) => prev.filter((x) => x.id !== p.id))} />
              )}
              {expandedId === p.id && p.role === 'host' && (
                <HostReviewDetail host={p} onDeleted={() => setProfiles((prev) => prev.filter((x) => x.id !== p.id))} />
              )}
              </div>
            ))}
          </div>
        )}

        {/* 안내 */}
        <div className="mt-6 p-4 rounded-card bg-surface-sunken border border-line-faint">
          <div className="text-[12px] font-bold text-ink mb-1">참고</div>
          <div className="text-[11px] text-text-secondary leading-[1.6]">
            파트너 상태: <b>가입 심사</b>는 신규 가입 대기(승인 시 활동 가능), <b>정지</b>는 신규 신청 차단. 계정 완전 삭제는 Supabase Auth Admin API(server-side)가 필요합니다.
          </div>
        </div>
      </div>
    </main>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    seller: { label: '입점 파트너', cls: 'badge-warning' },
    host: { label: '행사 주최', cls: 'badge-info' },
    admin: { label: '관리자', cls: '' },
  };
  const b = map[role] ?? { label: role, cls: '' };
  return <span className={`badge ${b.cls} ${role === 'admin' ? 'bg-ink text-accent' : ''}`}>{b.label}</span>;
}

function SellerStatusBadge({ status }: { status: SellerStatus }) {
  const map: Record<SellerStatus, { cls: string }> = {
    '정상': { cls: 'badge-success' },
    '가입 심사': { cls: 'badge-warning' },
    '정지': { cls: 'badge-danger' },
    '반려': { cls: 'badge-danger' },
  };
  return <span className={`badge ${map[status].cls}`}>{status}</span>;
}

/** 가입 심사 상세 — 필수 서류 열람·검증 + 판매 메뉴 */
function SellerReviewDetail({ seller, adminId, onDeleted }: { seller: Profile; adminId: string; onDeleted: () => void }) {
  const [slots, setSlots] = useState<DocumentSlot[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [history, setHistory] = useState<SellerHistory[]>([]);
  const [rating, setRating] = useState<RatingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function removeAccount() {
    if (!confirm(`파트너 계정 "${seller.business_name ?? seller.name}"을(를) 완전히 삭제할까요?\n이 작업은 되돌릴 수 없으며, 해당 이메일로 다시 가입할 수 있게 됩니다.`)) return;
    setDeleting(true);
    try { await deleteUserAccount(seller.id); onDeleted(); }
    catch (e) { alert('삭제 실패: ' + (e as Error).message); }
    finally { setDeleting(false); }
  }

  const load = async () => {
    try {
      const [d, m, h, r] = await Promise.all([
        fetchMyDocumentSlots(seller.id),
        fetchMyMenus(seller.id).catch(() => []),
        fetchSellerHistory(seller.id).catch(() => [] as SellerHistory[]),
        fetchRatingSummary(seller.id).catch(() => null),
      ]);
      setSlots(d);
      setMenus(m);
      setHistory(h);
      setRating(r);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [seller.id]);

  async function openFile(path: string | null | undefined, download?: string) {
    if (!path) { alert('업로드된 파일이 없습니다.'); return; }
    try { window.open(await getSignedDocumentUrl(path, 3600, download), '_blank', 'noopener'); }
    catch (e) { alert('실패: ' + (e as Error).message + ' (아직 업로드되지 않았을 수 있습니다)'); }
  }
  async function review(docId: string | undefined, status: 'verified' | 'rejected') {
    if (!docId) return;
    setBusy(docId);
    try { await reviewDocument(docId, status, adminId); await load(); }
    catch (e) { alert('검증 실패: ' + (e as Error).message); }
    finally { setBusy(null); }
  }

  const done = countVerified(slots);
  const total = slots.length;

  return (
    <div className="px-5 pb-5 pt-1 bg-surface-sunken border-t border-line-faint">
      {loading ? (
        <div className="animate-pulse h-20 bg-muted rounded-card" />
      ) : (
        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {/* 필수 서류 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-extrabold text-ink">필수 서류 검증</span>
              <span className="text-[12px] font-bold" style={{ fontVariantNumeric: 'tabular-nums', color: done === total ? 'var(--success,#1D6B2A)' : 'var(--warning,#7A5B00)' }}>
                {done}/{total} 확인
              </span>
            </div>
            <div className="space-y-1.5">
              {slots.map((s) => {
                const st = s.doc?.status ?? 'missing';
                const hasFile = !!s.doc?.file_url;
                return (
                  <div key={s.kind} className="flex items-center gap-2 p-2.5 rounded-input bg-surface border border-line-faint">
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-bold text-ink truncate">
                        {s.label}
                        {s.kind === 'business_reg' && <span className="ml-1 text-[10px] font-bold text-accent-text">가입 필수</span>}
                      </div>
                      <div className="text-[11px] text-text-tertiary truncate">{s.doc?.file_name ?? '미제출'}</div>
                    </div>
                    {hasFile
                      ? <DocStatusPill status={st} />
                      : <span className="badge badge-danger shrink-0" style={{ fontSize: 10 }}>미첨부</span>}
                    {hasFile && (
                      <button onClick={() => openFile(s.doc?.file_url)} className="text-[11px] font-semibold text-info hover:underline shrink-0">열람</button>
                    )}
                    {hasFile && (
                      <button onClick={() => openFile(s.doc?.file_url, `${s.label}.file`)} className="text-[11px] font-semibold text-text-secondary hover:underline shrink-0">다운로드</button>
                    )}
                    {hasFile && st !== 'verified' && (
                      <button disabled={busy === s.doc?.id} onClick={() => review(s.doc?.id, 'verified')} className="text-[11px] font-bold text-success shrink-0 hover:underline">승인</button>
                    )}
                    {hasFile && st !== 'rejected' && (
                      <button disabled={busy === s.doc?.id} onClick={() => review(s.doc?.id, 'rejected')} className="text-[11px] font-bold text-danger shrink-0 hover:underline">반려</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 판매 메뉴 */}
          <div>
            <div className="text-[13px] font-extrabold text-ink mb-2">판매 메뉴 <span className="text-text-tertiary font-semibold">{menus.length}개</span></div>
            {menus.length === 0 ? (
              <div className="text-[12px] text-text-tertiary p-3 rounded-input bg-surface border border-line-faint">등록된 판매 메뉴가 없습니다.</div>
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
                              <div className="w-full h-24 bg-muted-2 flex items-center justify-center text-[11px] font-semibold text-danger">✕ 사진 미첨부</div>
                            )}
                            <div className="p-2">
                              <div className="text-[12px] font-bold text-ink truncate">★ {m.name}</div>
                              <div className="text-[11px] text-text-secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>{m.price.toLocaleString()}원</div>
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
                      <div className="rounded-input border border-line-faint overflow-hidden bg-surface">
                        {rest.map((m, i) => (
                          <div key={m.id} className={`flex items-center gap-2.5 p-2 ${i !== 0 ? 'border-t border-line-faint' : ''}`}>
                            <span className="text-[12.5px] font-bold text-ink flex-1 truncate">{m.name}</span>
                            <span className="text-[11px] text-text-tertiary shrink-0">{m.category}</span>
                            <span className="text-[12px] font-semibold text-ink shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>{m.price.toLocaleString()}원</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
            <div className="mt-3 text-[11px] text-text-secondary leading-[1.6] p-3 rounded-input bg-surface border border-line-faint">
              <b>{seller.business_name ?? seller.name}</b> · {seller.category ?? '카테고리 미상'} · 사업자번호 {seller.business_no ?? '—'}
              <br />연락처 {seller.phone ?? '—'} · {seller.region ?? '지역 미상'}
              <br />평점 {rating ? `${rating.avg_score} (${rating.review_count}건)` : '평가 없음'}
            </div>

            {/* 참여 이력 (전체 열람) */}
            <div className="md:col-span-2" style={{ gridColumn: '1 / -1' }}>
              <div className="text-[13px] font-extrabold text-ink mb-2">참여 이력 <span className="text-text-tertiary font-semibold">{history.length}건</span></div>
              {history.length === 0 ? (
                <div className="text-[12px] text-text-tertiary p-3 rounded-input bg-surface border border-line-faint">등록된 참여 이력이 없습니다.</div>
              ) : (
                <div className="rounded-input bg-surface border border-line-faint overflow-hidden">
                  {history.slice(0, 10).map((h, i) => (
                    <div key={h.id} className={`flex items-center justify-between gap-3 text-[12px] px-3 py-2 ${i !== Math.min(history.length, 10) - 1 ? 'border-b border-line-faint' : ''}`}>
                      <div className="min-w-0">
                        <span className="font-semibold text-ink truncate">{h.event_name}</span>
                        {h.event_date && <span className="text-text-tertiary"> · {h.event_date.slice(0, 10).replace(/-/g, '.')}</span>}
                      </div>
                      <div className="text-text-secondary shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {h.orders ? `${h.orders.toLocaleString()}건` : ''}{h.revenue ? `  ₩${h.revenue.toLocaleString()}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 계정 삭제 (반려·정지 등 이슈 계정 · 이메일 해제) */}
            <div className="md:col-span-2 flex items-center justify-between gap-3 pt-3 border-t border-line-faint" style={{ gridColumn: '1 / -1' }}>
              <span className="text-[12px] text-text-secondary">반려·정지 등 이슈 계정은 삭제하면 이메일이 해제되어 재가입할 수 있습니다.</span>
              <button onClick={removeAccount} disabled={deleting} className="text-[12px] font-bold py-1.5 px-3 rounded-input border border-danger/40 text-danger hover:bg-danger-bg disabled:opacity-50 shrink-0">
                {deleting ? '삭제 중…' : '계정 삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 주최 정보 상세 — 명함 정보 + 등록 행사 (관리자 전체 열람) */
function HostReviewDetail({ host, onDeleted }: { host: Profile; onDeleted: () => void }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    (async () => {
      try { setEvents(await fetchMyHostEvents(host.id)); } catch { /* noop */ } finally { setLoading(false); }
    })();
  }, [host.id]);

  async function remove() {
    if (!confirm(`주최 계정 "${host.business_name ?? host.name}"을(를) 완전히 삭제할까요?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setDeleting(true);
    try {
      await deleteHostAccount(host.id);
      onDeleted();
    } catch (e) {
      alert('삭제 실패: ' + (e as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="px-5 pb-5 pt-1 bg-surface-sunken border-t border-line-faint">
      <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {/* 명함 정보 */}
        <div>
          <div className="text-[13px] font-extrabold text-ink mb-2">명함 정보</div>
          <div className="text-[12px] text-text-secondary leading-[1.8] p-3 rounded-input bg-surface border border-line-faint">
            <div><span className="text-text-tertiary">소속</span>  <b className="text-ink">{host.business_name ?? '—'}</b></div>
            <div><span className="text-text-tertiary">담당자</span>  <b className="text-ink">{host.name}</b> {host.position ? `· ${host.position}` : ''}</div>
            <div><span className="text-text-tertiary">연락처</span>  {host.phone ?? '—'}</div>
            <div><span className="text-text-tertiary">이메일</span>  <span style={{ fontFamily: 'ui-monospace, monospace' }}>{host.email}</span></div>
            <div><span className="text-text-tertiary">가입</span>  {new Date(host.created_at).toLocaleDateString('ko-KR')}</div>
          </div>
          {host.business_card_url && (
            <button
              onClick={async () => { try { window.open(await getSignedDocumentUrl(host.business_card_url!), '_blank', 'noopener'); } catch (e) { alert('열람 실패: ' + (e as Error).message); } }}
              className="mt-2 text-[12px] font-bold text-info hover:underline"
            >
              📇 명함 이미지 열람
            </button>
          )}
        </div>
        {/* 등록 행사 */}
        <div>
          <div className="text-[13px] font-extrabold text-ink mb-2">등록 행사 <span className="text-text-tertiary font-semibold">{events.length}건</span></div>
          {loading ? (
            <div className="animate-pulse h-16 bg-muted rounded-card" />
          ) : events.length === 0 ? (
            <div className="text-[12px] text-text-tertiary p-3 rounded-input bg-surface border border-line-faint">등록한 행사가 없습니다.</div>
          ) : (
            <div className="rounded-input bg-surface border border-line-faint overflow-hidden">
              {events.slice(0, 10).map((e, i) => (
                <div key={e.id} className={`flex items-center justify-between gap-3 text-[12px] px-3 py-2 ${i !== Math.min(events.length, 10) - 1 ? 'border-b border-line-faint' : ''}`}>
                  <span className="font-semibold text-ink truncate">{e.name}</span>
                  <ReviewStatusPill status={e.review_status ?? 'approved'} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 계정 삭제 (등록 행사 0건일 때만) */}
      <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-line-faint">
        {loading ? (
          <span className="text-[12px] text-text-tertiary">확인 중…</span>
        ) : events.length === 0 ? (
          <>
            <span className="text-[12px] text-text-secondary">등록 행사가 없어 계정을 완전 삭제할 수 있습니다.</span>
            <button onClick={remove} disabled={deleting} className="text-[12px] font-bold py-1.5 px-3 rounded-input border border-danger/40 text-danger hover:bg-danger-bg disabled:opacity-50">
              {deleting ? '삭제 중…' : '계정 삭제'}
            </button>
          </>
        ) : (
          <span className="text-[12px] text-text-tertiary">등록 행사 {events.length}건이 있어 삭제할 수 없습니다. 먼저 행사를 삭제하세요.</span>
        )}
      </div>
    </div>
  );
}

function ReviewStatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: { label: '공개', cls: 'badge-success' },
    pending: { label: '검수 대기', cls: 'badge-warning' },
    rejected: { label: '반려', cls: 'badge-danger' },
  };
  const b = map[status] ?? map.approved;
  return <span className={`badge ${b.cls} shrink-0`} style={{ fontSize: 10 }}>{b.label}</span>;
}

function DocStatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    verified: { label: '확인', cls: 'badge-success' },
    pending: { label: '검토 대기', cls: 'badge-warning' },
    rejected: { label: '반려', cls: 'badge-danger' },
    expired: { label: '만료', cls: 'badge-danger' },
    missing: { label: '미첨부', cls: 'badge-danger' },
  };
  const b = map[status] ?? map.missing;
  return <span className={`badge ${b.cls} shrink-0`} style={{ fontSize: 10 }}>{b.label}</span>;
}

/** 임의 계정 생성 (관리자 · 테스트용) */
function CreateUserCard({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const [role, setRole] = useState<'seller' | 'host'>('seller');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessNo, setBusinessNo] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    setMsg(null);
    if (!email.trim() || password.length < 6 || !name.trim()) {
      setMsg({ ok: false, text: '이메일·이름·비밀번호(6자 이상)를 입력해 주세요.' });
      return;
    }
    setSaving(true);
    try {
      await createUserByAdmin({
        email: email.trim(), password, role, name: name.trim(),
        business_name: businessName.trim() || undefined,
        business_no: businessNo.trim() || undefined,
        position: position.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setMsg({ ok: true, text: `${role === 'host' ? '주최' : '입점 파트너'} 계정을 만들었습니다. 바로 로그인할 수 있어요.` });
      setEmail(''); setPassword(''); setName(''); setBusinessName(''); setBusinessNo(''); setPhone(''); setPosition('');
      onCreated();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card mb-6" style={{ borderColor: 'var(--accent, #FFC800)' }}>
      <div className="flex items-center justify-between mb-1">
        <div className="t-section">테스트 계정 생성</div>
        <button onClick={onClose} className="text-[12px] text-text-tertiary hover:text-ink">닫기</button>
      </div>
      <div className="t-sub mb-4">이메일 인증을 건너뛰고 <b>바로 로그인 가능한 승인 상태</b>로 만듭니다. 실제 운영 계정이 아닌 테스트 용도로만 사용하세요.</div>

      {/* 역할 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {([['seller', '입점 파트너'], ['host', '행사 주최']] as const).map(([val, label]) => (
          <button key={val} type="button" onClick={() => setRole(val)}
            className={`p-3 rounded-input border-2 text-[13px] font-bold transition-all ${role === val ? 'bg-ink text-white border-ink' : 'bg-surface text-ink border-line-strong hover:border-ink'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <Labeled label="이메일 *"><input value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="test@example.com" /></Labeled>
        <Labeled label="비밀번호 * (6자 이상)"><input value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="비밀번호" /></Labeled>
        <Labeled label={role === 'host' ? '담당자 이름 *' : '대표자 이름 *'}><input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="홍길동" /></Labeled>
        <Labeled label={role === 'host' ? '소속(기관·단체·회사명)' : '상호(매장명)'}><input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="input" placeholder={role === 'host' ? '예: 성동구청' : '예: 라이트분식'} /></Labeled>
        <Labeled label="사업자등록번호"><input value={businessNo} onChange={(e) => setBusinessNo(e.target.value)} className="input" placeholder="000-00-00000" /></Labeled>
        <Labeled label="연락처"><input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="010-0000-0000" /></Labeled>
        {role === 'host' && <Labeled label="직책"><input value={position} onChange={(e) => setPosition(e.target.value)} className="input" placeholder="예: 문화체육과 주무관" /></Labeled>}
      </div>

      {msg && (
        <div className={`mt-4 text-[13px] font-semibold rounded-input px-3 py-2.5 ${msg.ok ? 'text-success bg-success-bg' : 'text-danger bg-danger-bg'}`}>
          {msg.text}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button onClick={submit} disabled={saving} className="btn-primary flex-1 max-w-[220px]">
          {saving ? '생성 중…' : '계정 생성'}
        </button>
      </div>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
