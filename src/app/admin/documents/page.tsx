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
  const [docs, setDocs] = useState<DocumentWithSeller[]>([]);
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

  async function load() {
    setLoading(true);
    try {
      const rows = await fetchAllDocumentsAdmin({ status: statusFilter, kind: kindFilter, q });
      setDocs(rows);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [statusFilter, kindFilter, q]);

  const summary = useMemo(() => ({
    pending: docs.filter((d) => d.status === 'pending').length,
    verified: docs.filter((d) => d.status === 'verified').length,
    rejected: docs.filter((d) => d.status === 'rejected').length,
    expiringSoon: docs.filter((d) => computeUrgency(d) === 'expiring').length,
  }), [docs]);

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
              대기 <span className="text-warning font-bold">{summary.pending}</span> · 승인 {summary.verified} · 반려 {summary.rejected} · 만료 임박 {summary.expiringSoon}
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
                  <button className={`chip ${statusFilter === 'expired' ? 'selected' : ''}`} onClick={() => setStatusFilter('expired')}>만료</button>
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
          <div className="space-y-3">
            {docs.map((d) => {
              const urgency = computeUrgency(d);
              const isExpanded = rejectingId === d.id;
              return (
                <div key={d.id} className={`card p-0 overflow-hidden ${urgency === 'rejected' || urgency === 'expired' ? 'border-danger/40' : ''}`}>
                  <div className="p-5">
                    <div className="grid gap-4 items-start" style={{ gridTemplateColumns: 'minmax(220px, 2fr) minmax(160px, 1fr) auto' }}>
                      {/* 입점 파트너 + 서류 정보 */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[15px] font-extrabold text-ink truncate">
                            {DOC_META[d.kind].label}
                          </span>
                          <UrgencyBadge urgency={urgency} />
                        </div>
                        <div className="text-[13px] text-ink font-semibold mb-1">
                          {d.seller?.business_name ?? d.seller?.name ?? '(알 수 없는 파트너)'}
                        </div>
                        <div className="text-[11px] text-text-tertiary">
                          {d.seller?.name} · <span style={{ fontFamily: 'ui-monospace, monospace' }}>{d.seller?.email}</span>
                          {d.seller?.phone && ` · ${d.seller.phone}`}
                        </div>
                        {d.file_name && (
                          <div className="text-[11px] text-text-secondary mt-1.5">
                            📎 {d.file_name}
                          </div>
                        )}
                        {d.memo && d.status === 'rejected' && (
                          <div className="text-[11px] text-danger font-semibold mt-1.5">반려 사유: {d.memo}</div>
                        )}
                      </div>

                      {/* 메타 */}
                      <div className="text-[11px] text-text-tertiary space-y-1">
                        <div>제출 {new Date(d.uploaded_at).toLocaleDateString('ko-KR')}</div>
                        {d.expires_at && <div>만료 {d.expires_at}</div>}
                        {d.reviewed_at && <div>검토 {new Date(d.reviewed_at).toLocaleDateString('ko-KR')}</div>}
                      </div>

                      {/* 액션 */}
                      <div className="flex gap-2 shrink-0 flex-wrap">
                        {d.file_url && (
                          <button
                            onClick={() => handleOpen(d)}
                            disabled={openingId === d.id}
                            className="btn-secondary text-[12px] py-2 px-3"
                          >
                            {openingId === d.id ? '여는 중…' : '📥 파일'}
                          </button>
                        )}
                        {d.status === 'pending' && (
                          <>
                            <button
                              onClick={() => { setRejectingId(d.id); setRejectMemo(d.memo ?? ''); }}
                              disabled={reviewingId === d.id}
                              className="btn-secondary text-[12px] py-2 px-3"
                            >
                              반려
                            </button>
                            <button
                              onClick={() => handleApprove(d.id)}
                              disabled={reviewingId === d.id}
                              className="btn-primary text-[12px] py-2 px-3"
                            >
                              {reviewingId === d.id ? '처리 중…' : '승인'}
                            </button>
                          </>
                        )}
                        {d.status === 'verified' && (
                          <button
                            onClick={() => { setRejectingId(d.id); setRejectMemo(''); }}
                            className="text-[12px] text-danger hover:underline font-semibold px-2"
                          >
                            승인 취소
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 반려 사유 입력 폼 */}
                  {isExpanded && (
                    <div className="border-t border-line-faint p-5 bg-surface-sunken">
                      <label className="flex flex-col gap-2">
                        <span className="text-[12px] font-semibold text-ink-soft">반려 사유 *</span>
                        <textarea
                          rows={3}
                          value={rejectMemo}
                          onChange={(e) => setRejectMemo(e.target.value)}
                          placeholder="예: 파일이 흐릿하여 판독 불가 · 재업로드 요청"
                          className="input resize-none"
                        />
                      </label>
                      <div className="flex gap-2 mt-3 justify-end">
                        <button onClick={() => { setRejectingId(null); setRejectMemo(''); }} className="btn-secondary text-[12px] py-2 px-3">취소</button>
                        <button
                          onClick={() => handleReject(d.id)}
                          disabled={!rejectMemo.trim() || reviewingId === d.id}
                          className="text-[12px] py-2 px-3 rounded-input font-bold bg-danger text-white hover:bg-danger-strong disabled:opacity-50"
                        >
                          {reviewingId === d.id ? '처리 중…' : '반려 확정'}
                        </button>
                      </div>
                    </div>
                  )}
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
