'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import {
  fetchAllProfiles, fetchMyProfile, updateProfileRole, updateProfileStatus,
  fetchMyDocumentSlots, fetchMyMenus, getSignedDocumentUrl, reviewDocument, countVerified,
  fetchSellerHistory, fetchRatingSummary,
} from '@/lib/supabase/queries';
import type { Profile, SellerStatus, DocumentSlot, Menu, SellerHistory, RatingSummary } from '@/lib/types';

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
  }, [q, roleFilter]);

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

        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="t-title mb-1">사용자 관리</h1>
            <p className="t-sub">
              전체 {profiles.length}명 · 파트너 {counts.seller} · 주최 {counts.host} · 관리자 {counts.admin}
            </p>
          </div>
        </div>

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

                {/* 상태 액션 (셀러 전용) */}
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
                          <button disabled={updatingId === p.id} onClick={() => changeStatus(p.id, '정상', '서류·판매메뉴를 확인하셨나요? 승인하면 파트너가 행사 찾기·신청을 이용할 수 있습니다.')} className="btn-primary text-[12px] py-1.5 px-3">가입 승인</button>
                        );
                        if (st === '정지') return (
                          <button disabled={updatingId === p.id} onClick={() => changeStatus(p.id, '정상', '정지를 해제하시겠어요?')} className="btn-secondary text-[12px] py-1.5 px-3">정지 해제</button>
                        );
                        return (
                          <button disabled={updatingId === p.id} onClick={() => changeStatus(p.id, '정지', '이 파트너의 이용을 정지하시겠어요? 신규 신청이 차단됩니다.')} className="text-[12px] text-danger hover:underline font-semibold">이용 정지</button>
                        );
                      })()}
                    </>
                  ) : (
                    <span className="text-[11px] text-text-tertiary">—</span>
                  )}
                </div>
              </div>
              {expandedId === p.id && p.role === 'seller' && (
                <SellerReviewDetail seller={p} adminId={me?.id ?? ''} />
              )}
              </div>
            ))}
          </div>
        )}

        {/* 안내 */}
        <div className="mt-6 p-4 rounded-card bg-surface-sunken border border-line-faint">
          <div className="text-[12px] font-bold text-ink mb-1">참고</div>
          <div className="text-[11px] text-text-secondary leading-[1.6]">
            셀러 상태: <b>가입 심사</b>는 신규 가입 대기(승인 시 활동 가능), <b>정지</b>는 신규 신청 차단. 계정 완전 삭제는 Supabase Auth Admin API(server-side)가 필요합니다.
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
  };
  return <span className={`badge ${map[status].cls}`}>{status}</span>;
}

/** 가입 심사 상세 — 필수 서류 열람·검증 + 판매 메뉴 */
function SellerReviewDetail({ seller, adminId }: { seller: Profile; adminId: string }) {
  const [slots, setSlots] = useState<DocumentSlot[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [history, setHistory] = useState<SellerHistory[]>([]);
  const [rating, setRating] = useState<RatingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

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

  async function openFile(path: string | null | undefined) {
    if (!path) { alert('업로드된 파일이 없습니다.'); return; }
    try { window.open(await getSignedDocumentUrl(path), '_blank', 'noopener'); }
    catch (e) { alert('열람 실패: ' + (e as Error).message); }
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
                    <DocStatusPill status={st} />
                    {hasFile && (
                      <button onClick={() => openFile(s.doc?.file_url)} className="text-[11px] font-semibold text-info hover:underline shrink-0">열람</button>
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
            ) : (
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                {menus.map((m) => (
                  <div key={m.id} className="rounded-input bg-surface border border-line-faint overflow-hidden">
                    {m.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.image_url} alt={m.name} className="w-full h-20 object-cover" />
                    ) : (
                      <div className="w-full h-20 bg-muted-2 flex items-center justify-center text-[11px] text-text-tertiary">사진 없음</div>
                    )}
                    <div className="p-2">
                      <div className="text-[12px] font-bold text-ink truncate">
                        {m.signature && <span className="text-accent-text">★ </span>}{m.name}
                      </div>
                      <div className="text-[11px] text-text-secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>{m.price.toLocaleString()}원</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
          </div>
        </div>
      )}
    </div>
  );
}

function DocStatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    verified: { label: '확인', cls: 'badge-success' },
    pending: { label: '검토 대기', cls: 'badge-warning' },
    rejected: { label: '반려', cls: 'badge-danger' },
    expired: { label: '만료', cls: 'badge-danger' },
    missing: { label: '미제출', cls: '' },
  };
  const b = map[status] ?? map.missing;
  return <span className={`badge ${b.cls} shrink-0`} style={{ fontSize: 10 }}>{b.label}</span>;
}
