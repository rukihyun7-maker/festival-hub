'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import {
  fetchAllDocumentsAdmin,
  fetchMyProfile,
  getSignedDocumentUrl,
  reviewDocument,
  type DocumentWithSeller,
} from '@/lib/supabase/queries';
import { DOC_META, computeUrgency, type DocKind, type Profile } from '@/lib/types';

/**
 * 관리자 서류 검증 · Admin only
 * 필터(상태·종류·검색) + 승인/반려 액션 + 파일 미리보기(서명 URL)
 */

type StatusFilter = 'all' | 'pending' | 'verified' | 'rejected' | 'expired';
type KindFilter = 'all' | DocKind;

export default function AdminDocumentsPage() {
  const [me, setMe] = useState<Profile | null>(null);
  const [allDocs, setAllDocs] = useState<DocumentWithSeller[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectMemo, setRejectMemo] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const p = await fetchMyProfile();
      setMe(p);
    })();
  }, []);

  // 전체 서류를 한 번 조회 → 요약·필터는 클라이언트에서 (요약이 필터에 흔들리지 않게)
  async function load() {
    setLoading(true);
    try {
      const rows = await fetchAllDocumentsAdmin({});
      setAllDocs(rows);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // 요약: 전체 기준 (현재 필터와 무관) · 만료는 expires_at 계산값 기준
  const summary = useMemo(() => ({
    pending: allDocs.filter((d) => d.status === 'pending').length,
    verified: allDocs.filter((d) => d.status === 'verified').length,
    rejected: allDocs.filter((d) => d.status === 'rejected').length,
    expiringSoon: allDocs.filter((d) => computeUrgency(d) === 'expiring').length,
    expired: allDocs.filter((d) => computeUrgency(d) === 'expired').length,
  }), [allDocs]);

  // 표시 목록: 상태(만료=계산값)·종류·검색 필터 (클라이언트)
  const docs = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return allDocs.filter((d) => {
      if (kindFilter !== 'all' && d.kind !== kindFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'expired') {
          if (computeUrgency(d) !== 'expired') return false;
        } else if (d.status !== statusFilter) {
          return false;
        }
      }
      if (qq) {
        const hit = d.seller?.name?.toLowerCase().includes(qq)
          || d.seller?.business_name?.toLowerCase().includes(qq)
          || d.file_name?.toLowerCase().includes(qq);
        if (!hit) return false;
      }
      return true;
    });
  }, [allDocs, statusFilter, kindFilter, q]);

  // 파트너(사용자)별 그룹화 — 대기 많은 파트너 우선
  const groups = useMemo(() => {
    const m = new Map<string, { seller: DocumentWithSeller['seller']; docs: DocumentWithSeller[] }>();
    for (const d of docs) {
      const key = d.seller_id ?? d.seller?.id ?? 'unknown';
      if (!m.has(key)) m.set(key, { seller: d.seller, docs: [] });
      m.get(key)!.docs.push(d);
    }
    return [...m.values()].sort((a, b) => {
      const pa = a.docs.filter((d) => d.status === 'pending').length;
      const pb = b.docs.filter((d) => d.status === 'pending').length;
      return pb - pa;
    });
  }, [docs]);

  async function handleApprove(id: string) {
    if (!me) return;
    setReviewingId(id);
    try {
      await reviewDocument(id, 'verified', me.id);
      await load();
    } catch (e) {
      alert('승인 실패: ' + (e as Error).message);
    } finally {
      setReviewingId(null);
    }
  }

  async function handleReject(id: string) {
    if (!me) return;
    if (!rejectMemo.trim()) {
      alert('반려 사유를 입력해주세요');
      return;
    }
    setReviewingId(id);
    try {
      await reviewDocument(id, 'rejected', me.id, rejectMemo.trim());
      setRejectingId(null);
      setRejectMemo('');
      await load();
    } catch (e) {
      alert('반려 실패: ' + (e as Error).message);
    } finally {
      setReviewingId(null);
    }
  }

  async function handleOpen(doc: DocumentWithSeller) {
    if (!doc.file_url) {
      alert('파일이 등록되어 있지 않습니다');
      return;
    }
    setOpeningId(doc.id);
    try {
      const url = await getSignedDocumentUrl(doc.file_url, 3600);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      alert('파일 열기 실패: ' + (e as Error).message);
    } finally {
      setOpeningId(null);
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

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="admin" />

      <div className="container-app py-8 md:py-12">
        <nav className="text-[12px] font-semibold text-text-tertiary mb-4">
          <Link href="/admin" className="hover:text-ink">인사이트</Link>
          <span className="mx-2">/</span>
          <span className="text-ink">서류 검증</span>
        </nav>

        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="t-title mb-1">서류 검증</h1>
            <p className="t-sub">
              대기 <span className="text-warning font-bold">{summary.pending}</span> · 승인 {summary.verified} · 반려 {summary.rejected} · 만료 임박 {summary.expiringSoon} · 만료 {summary.expired}
            </p>
          </div>
        </div>

        {/* 필터 */}
        <div className="card mb-6">
          <div className="flex flex-col gap-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="파트너명·사업자명·파일명 검색"
              className="input"
            />
            <div className="flex flex-wrap gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-text-tertiary mb-2">상태</div>
                <div className="flex flex-wrap gap-1.5">
                  <button className={`chip ${statusFilter === 'all' ? 'selected' : ''}`} onClick={() => setStatusFilter('all')}>전체</button>
                  <button className={`chip ${statusFilter === 'pending' ? 'selected' : ''}`} onClick={() => setStatusFilter('pending')}>
                    대기{summary.pending > 0 && <span className="ml-1 text-warning">·{summary.pending}</span>}
                  </button>
                  <button className={`chip ${statusFilter === 'verified' ? 'selected' : ''}`} onClick={() => setStatusFilter('verified')}>승인</button>
                  <button className={`chip ${statusFilter === 'rejected' ? 'selected' : ''}`} onClick={() => setStatusFilter('rejected')}>반려</button>
                  <button className={`chip ${statusFilter === 'expired' ? 'selected' : ''}`} onClick={() => setStatusFilter('expired')}>
                    만료{summary.expired > 0 && <span className="ml-1 text-danger">·{summary.expired}</span>}
                  </button>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-text-tertiary mb-2">종류</div>
                <div className="flex flex-wrap gap-1.5">
                  <button className={`chip ${kindFilter === 'all' ? 'selected' : ''}`} onClick={() => setKindFilter('all')}>전체</button>
                  {(Object.keys(DOC_META) as DocKind[]).map((k) => (
                    <button key={k} className={`chip ${kindFilter === k ? 'selected' : ''}`} onClick={() => setKindFilter(k)}>
                      {DOC_META[k].label}
                    </button>
                  ))}
                </div>
              </div>
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
            </div>
          </div>
        ) : docs.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-[15px] font-semibold text-ink mb-2">조건에 맞는 서류가 없습니다</div>
            <div className="t-sub">필터를 조정해보세요</div>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => {
              const pendingN = g.docs.filter((d) => d.status === 'pending').length;
              const sellerName = g.seller?.business_name ?? g.seller?.name ?? '(알 수 없는 파트너)';
              return (
                <div key={g.seller?.id ?? sellerName} className="card p-0 overflow-hidden">
                  {/* 파트너 헤더 */}
                  <div className="p-4 flex items-center justify-between gap-3 bg-surface-sunken border-b border-line-faint">
                    <div className="min-w-0">
                      <div className="text-[15px] font-extrabold text-ink truncate">{sellerName}</div>
                      <div className="text-[11px] text-text-tertiary truncate">
                        {g.seller?.name} · <span style={{ fontFamily: 'ui-monospace, monospace' }}>{g.seller?.email}</span>
                        {g.seller?.phone && ` · ${g.seller.phone}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {pendingN > 0 && <span className="badge badge-warning">대기 {pendingN}</span>}
                      <span className="text-[12px] font-semibold text-text-tertiary">서류 {g.docs.length}건</span>
                    </div>
                  </div>

                  {/* 파트너의 서류 목록 */}
                  <div>
                    {g.docs.map((d) => {
                      const urgency = computeUrgency(d);
                      const isExpanded = rejectingId === d.id;
                      return (
                        <div key={d.id} className="border-b border-line-faint last:border-0" style={urgency === 'rejected' || urgency === 'expired' ? { background: 'var(--danger-bg, #FBEDEA)' } : undefined}>
                          <div className="p-4 flex flex-wrap items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[13.5px] font-bold text-ink">{DOC_META[d.kind].label}</span>
                                <UrgencyBadge urgency={urgency} />
                              </div>
                              <div className="text-[11px] text-text-tertiary mt-1">
                                {d.file_name ? `📎 ${d.file_name}` : '파일 없음'}
                                {' · 제출 '}{new Date(d.uploaded_at).toLocaleDateString('ko-KR')}
                                {d.expires_at && ` · 만료 ${d.expires_at}`}
                              </div>
                              {d.memo && d.status === 'rejected' && (
                                <div className="text-[11px] text-danger font-semibold mt-1">반려 사유: {d.memo}</div>
                              )}
                            </div>
                            <div className="flex gap-2 shrink-0 flex-wrap">
                              {d.file_url && (
                                <button onClick={() => handleOpen(d)} disabled={openingId === d.id} className="btn-secondary text-[12px] py-1.5 px-3">
                                  {openingId === d.id ? '여는 중…' : '📥 파일'}
                                </button>
                              )}
                              {d.status === 'pending' && (
                                <>
                                  <button onClick={() => { setRejectingId(d.id); setRejectMemo(d.memo ?? ''); }} disabled={reviewingId === d.id} className="btn-secondary text-[12px] py-1.5 px-3">반려</button>
                                  <button onClick={() => handleApprove(d.id)} disabled={reviewingId === d.id} className="btn-primary text-[12px] py-1.5 px-3">
                                    {reviewingId === d.id ? '처리 중…' : '승인'}
                                  </button>
                                </>
                              )}
                              {d.status === 'verified' && (
                                <button onClick={() => { setRejectingId(d.id); setRejectMemo(''); }} className="text-[12px] text-danger hover:underline font-semibold px-2">승인 취소</button>
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-line-faint p-4 bg-surface-sunken">
                              <label className="flex flex-col gap-2">
                                <span className="text-[12px] font-semibold text-ink-soft">반려 사유 *</span>
                                <textarea rows={2} value={rejectMemo} onChange={(e) => setRejectMemo(e.target.value)} placeholder="예: 파일이 흐릿하여 판독 불가 · 재업로드 요청" className="input resize-none" />
                              </label>
                              <div className="flex gap-2 mt-3 justify-end">
                                <button onClick={() => { setRejectingId(null); setRejectMemo(''); }} className="btn-secondary text-[12px] py-2 px-3">취소</button>
                                <button onClick={() => handleReject(d.id)} disabled={!rejectMemo.trim() || reviewingId === d.id} className="text-[12px] py-2 px-3 rounded-input font-bold bg-danger text-white hover:bg-danger-strong disabled:opacity-50">
                                  {reviewingId === d.id ? '처리 중…' : '반려 확정'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 p-4 rounded-card bg-surface-sunken border border-line-faint">
          <div className="text-[12px] font-bold text-ink mb-1">검증 원칙</div>
          <div className="text-[11px] text-text-secondary leading-[1.6]">
            서류 파일은 서명 URL(1시간 유효)로만 조회됩니다. 승인 시 파트너는 즉시 행사 신청 가능해지고, 반려 시 사유가 파트너 대시보드에 표시됩니다. 만료 임박(14일 이하) 서류는 자동으로 파트너에게 알림 배지가 표시됩니다.
          </div>
        </div>
      </div>
    </main>
  );
}

function UrgencyBadge({ urgency }: { urgency: ReturnType<typeof computeUrgency> }) {
  const map = {
    verified: { label: '승인 완료', cls: 'badge-success' },
    expiring: { label: '만료 임박', cls: 'badge-warning' },
    expired: { label: '만료됨', cls: 'badge-danger' },
    pending: { label: '검토 대기', cls: 'badge-info' },
    rejected: { label: '반려', cls: 'badge-danger' },
    missing: { label: '미등록', cls: '' },
  };
  const b = map[urgency];
  return <span className={`badge ${b.cls}`}>{b.label}</span>;
}
