'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import {
  countVerified,
  deleteDocument,
  fetchMyDocumentSlots,
  fetchMyProfile,
  getSignedDocumentUrl,
  removeDocumentFile,
  upsertDocument,
  uploadDocumentFile,
} from '@/lib/supabase/queries';
import { REQUIRED_DOC_KINDS } from '@/lib/types';
import type { DocKind, DocumentSlot, Profile } from '@/lib/types';

/**
 * 서류 관리 · Seller only + Supabase Storage 실 연동
 * 5종 슬롯 · 파일 업로드 · 만료일 · 서명 URL로 다운로드
 */
export default function SellerDocumentsPage() {
  const [me, setMe] = useState<Profile | null>(null);
  const [slots, setSlots] = useState<DocumentSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingKind, setEditingKind] = useState<DocKind | null>(null);

  async function load() {
    setLoading(true);
    try {
      const p = await fetchMyProfile();
      setMe(p);
      if (p) {
        const s = await fetchMyDocumentSlots(p.id);
        setSlots(s);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="seller" />
        <div className="container-app py-12">
          <div className="animate-pulse space-y-3 max-w-[520px]">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-6 bg-muted rounded w-2/3" />
          </div>
        </div>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="seller" />
        <div className="container-app py-12">
          <div className="card">
            <div className="text-[16px] font-bold text-ink mb-2">로그인이 필요합니다</div>
            <Link href="/login" className="btn-primary">로그인 →</Link>
          </div>
        </div>
      </main>
    );
  }

  const verifiedCount = countVerified(slots);
  const totalDocs = slots.length;
  const allGood = totalDocs > 0 && verifiedCount === totalDocs;

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="seller" />

      <div className="container-app py-8 md:py-12">
        <nav className="text-[12px] font-semibold text-text-tertiary mb-4">
          <Link href="/dashboard" className="hover:text-ink">홈</Link>
          <span className="mx-2">/</span>
          <span className="text-ink">서류 관리</span>
        </nav>

        <div className="mb-6">
          <h1 className="t-title mb-1">필수 서류 관리</h1>
          <p className="t-sub">모든 항목이 검증되면 행사 신청 시 자동 첨부됩니다. (서류 + 부스·트럭 사진 3장)</p>
          <div className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--info-soft,#F4F7FE)', color: 'var(--info,#2B4B9B)' }}>
            🔔 만료일이 다가오면 미리 알려드립니다 — 서류 걱정 없이 운영하세요
          </div>
        </div>

        {(() => {
          const expired = slots.filter((s) => s.urgency === 'expired');
          const expiring = slots.filter((s) => s.urgency === 'expiring');
          if (expired.length === 0 && expiring.length === 0) return null;
          const isExp = expired.length > 0;
          return (
            <div className="card mb-6" style={{ borderColor: isExp ? '#E0A99B' : '#E4C97E', background: isExp ? 'var(--danger-bg,#FBECE8)' : 'var(--warning-bg,#FBF5E6)' }}>
              <div className="flex items-start gap-3">
                <div className="text-[20px] leading-none mt-0.5">{isExp ? '⚠️' : '🔔'}</div>
                <div>
                  <div className="text-[14px] font-bold text-ink mb-0.5">
                    {isExp ? `만료된 서류 ${expired.length}건 — 갱신이 필요합니다` : `만료 임박 서류 ${expiring.length}건`}
                  </div>
                  <div className="text-[12px] text-text-secondary leading-relaxed">
                    {isExp
                      ? '만료된 서류가 있으면 행사에 신청할 수 없습니다. 갱신 후 재등록하면 관리자 재검토를 거쳐 다시 유효해집니다.'
                      : '만료 전에 미리 갱신·재등록해 두면 신청이 끊기지 않습니다.'}
                    {' '}({[...expired, ...expiring].map((s) => s.label).join(', ')})
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        <div className={`card mb-8 ${allGood ? 'card-apply' : 'card-info'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[15px] font-extrabold text-ink">서류 검증 진행률</div>
            <span className={`text-[24px] font-extrabold ${allGood ? 'text-success' : 'text-warning'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {verifiedCount} / {totalDocs}
            </span>
          </div>
          <div className="h-2.5 bg-muted rounded-pill overflow-hidden mb-2">
            <div className={`h-full transition-all ${allGood ? 'bg-success' : 'bg-warning'}`} style={{ width: `${totalDocs ? (verifiedCount / totalDocs) * 100 : 0}%` }} />
          </div>
          <div className="text-[12px] text-text-secondary">
            {allGood ? '✓ 모든 항목 검증 완료 · 즉시 행사 신청 가능' : `${totalDocs - verifiedCount}건 남음 · 완료 후 신청 가능`}
          </div>
        </div>

        {error && (
          <div className="card mb-6" style={{ borderColor: '#C7503E' }}>
            <div className="text-[13px] font-bold text-danger mb-1">오류</div>
            <div className="text-[12px] text-danger">{error}</div>
          </div>
        )}

        <div className="space-y-3">
          {slots.map((slot) => (
            <DocCard
              key={slot.kind}
              slot={slot}
              expanded={editingKind === slot.kind}
              onToggle={() => setEditingKind((c) => (c === slot.kind ? null : slot.kind))}
              onSaved={async () => { setEditingKind(null); await load(); }}
              onDelete={async () => {
                if (!slot.doc) return;
                if (!confirm(`${slot.label}을(를) 삭제하시겠어요?\n관련 파일도 함께 제거됩니다.`)) return;
                try {
                  if (slot.doc.file_url) await removeDocumentFile(slot.doc.file_url).catch(() => {});
                  await deleteDocument(slot.doc.id);
                  await load();
                } catch (e) {
                  alert('삭제 실패: ' + (e as Error).message);
                }
              }}
              sellerId={me.id}
            />
          ))}
        </div>

        <div className="mt-8 p-4 rounded-card bg-surface-sunken border border-line-faint">
          <div className="text-[12px] font-bold text-ink mb-1">파일 저장 방식</div>
          <div className="text-[11px] text-text-secondary leading-[1.6]">
            업로드한 파일은 안전하게 암호화되어 저장되며, 본인과 관리자만 볼 수 있습니다. 다운로드 링크는 열람 후 1시간까지만 유효합니다. 관리자가 확인한 뒤 승인 또는 반려 처리합니다.
          </div>
        </div>
      </div>
    </main>
  );
}

function DocCard({
  slot, expanded, onToggle, onSaved, onDelete, sellerId,
}: {
  slot: DocumentSlot;
  expanded: boolean;
  onToggle: () => void;
  onSaved: () => Promise<void>;
  onDelete: () => Promise<void>;
  sellerId: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expiresAt, setExpiresAt] = useState(slot.doc?.expires_at ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openingFile, setOpeningFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const badge = (() => {
    switch (slot.urgency) {
      case 'verified': return { text: '검증 완료', cls: 'badge-success' };
      case 'expiring': return { text: '만료 임박', cls: 'badge-warning' };
      case 'expired': return { text: '만료됨', cls: 'badge-danger' };
      case 'pending': return { text: '검토 중', cls: 'badge-info' };
      case 'rejected': return { text: '반려', cls: 'badge-danger' };
      case 'missing': return { text: '미등록', cls: '' };
      default: return { text: '-', cls: '' };
    }
  })();

  const dotColor = {
    verified: 'bg-success', expiring: 'bg-warning', expired: 'bg-danger',
    pending: 'bg-info', rejected: 'bg-danger', missing: 'bg-text-tertiary',
  }[slot.urgency];

  const daysLeft = slot.doc?.expires_at
    ? Math.ceil((new Date(slot.doc.expires_at).getTime() - Date.now()) / 86400000)
    : null;

  async function handleSave() {
    setSaving(true);
    setUploadError(null);
    try {
      let filePath = slot.doc?.file_url ?? null;
      let fileName = slot.doc?.file_name ?? null;

      // 새 파일 선택 시 업로드 후 기존 파일 정리
      if (selectedFile) {
        setUploading(true);
        const newPath = await uploadDocumentFile(sellerId, slot.kind, selectedFile);
        setUploading(false);
        // 기존 파일 있으면 정리
        if (filePath) {
          await removeDocumentFile(filePath).catch(() => {});
        }
        filePath = newPath;
        fileName = selectedFile.name;
      }

      if (!filePath && !slot.doc) {
        throw new Error('파일을 선택해주세요');
      }

      await upsertDocument({
        seller_id: sellerId,
        kind: slot.kind,
        file_url: filePath,
        file_name: fileName,
        expires_at: slot.requiresExpiry ? (expiresAt || null) : null,
      });
      setSelectedFile(null);
      await onSaved();
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  async function handleOpenFile() {
    if (!slot.doc?.file_url) return;
    setOpeningFile(true);
    try {
      const url = await getSignedDocumentUrl(slot.doc.file_url, 3600);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      alert('파일 열기 실패: ' + (e as Error).message);
    } finally {
      setOpeningFile(false);
    }
  }

  return (
    <div className={`card p-0 overflow-hidden ${slot.urgency === 'expired' || slot.urgency === 'rejected' ? 'border-danger/40' : ''}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-4 p-5 hover:bg-surface-sunken transition-colors text-left">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[15px] font-extrabold text-ink truncate">{slot.label}</span>
            {REQUIRED_DOC_KINDS.includes(slot.kind)
              ? <span className="badge" style={{ background: 'var(--bg-muted,#F0ECE1)', color: 'var(--text-secondary,#6B6555)' }}>필수</span>
              : <span className="badge" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)', color: 'var(--text-tertiary,#B5AC98)' }}>선택</span>}
            <span className={`badge ${badge.cls}`}>{badge.text}</span>
          </div>
          <div className="text-[12px] text-text-secondary truncate">{slot.desc}</div>
          {slot.doc && (
            <div className="text-[11px] text-text-tertiary mt-1">
              📎 {slot.doc.file_name ?? '(파일명 없음)'}
              {slot.doc.expires_at && (
                <>
                  {' · '}
                  <span className={
                    daysLeft !== null && daysLeft < 0 ? 'text-danger font-bold'
                    : daysLeft !== null && daysLeft < 14 ? 'text-warning font-bold'
                    : ''
                  }>
                    만료 {slot.doc.expires_at}{daysLeft !== null && daysLeft >= 0 ? ` (${daysLeft}일 남음)` : ' (만료)'}
                  </span>
                </>
              )}
              {slot.doc.reviewed_at && slot.urgency === 'verified' && (
                <> · 검증 {new Date(slot.doc.reviewed_at).toLocaleDateString('ko-KR')}</>
              )}
            </div>
          )}
          {slot.doc?.memo && slot.urgency === 'rejected' && (
            <div className="text-[11px] text-danger font-semibold mt-1">반려 사유: {slot.doc.memo}</div>
          )}
        </div>
        <span className="text-[11px] font-semibold text-text-tertiary shrink-0">
          {expanded ? '▲ 접기' : slot.doc ? '수정' : '등록'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-line-faint p-5 bg-surface-sunken">
          {/* 현재 파일 다운로드 */}
          {slot.doc?.file_url && (
            <div className="mb-4 p-3 rounded-input bg-surface border border-line flex items-center gap-3">
              <span className="text-[13px] font-semibold text-ink flex-1 truncate">
                📎 {slot.doc.file_name ?? '파일'}
              </span>
              <button
                onClick={handleOpenFile}
                disabled={openingFile}
                className="text-[12px] font-semibold text-accent-warm hover:text-accent-deep shrink-0"
              >
                {openingFile ? '여는 중…' : '📥 다운로드'}
              </button>
            </div>
          )}

          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {/* 파일 선택 */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-ink-soft">
                {slot.doc ? '파일 교체 (선택)' : '파일 선택 *'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="text-[13px] file:mr-3 file:px-3 file:py-2 file:rounded-[8px] file:border-0 file:bg-ink file:text-white file:font-bold file:cursor-pointer file:hover:bg-ink-soft"
              />
              {selectedFile && (
                <span className="text-[11px] text-success">
                  ✓ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)}KB)
                </span>
              )}
              <span className="text-[11px] text-text-tertiary">PDF · JPG · PNG · 10MB 이하</span>
            </div>

            {/* 만료일 */}
            {slot.requiresExpiry && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-ink-soft">만료일 *</span>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="input"
                />
                <span className="text-[11px] text-text-tertiary">만료 14일 전부터 &apos;만료 임박&apos;으로 표시됩니다</span>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="mt-4 p-3 rounded-input bg-danger-bg border border-danger/20">
              <div className="text-[12px] font-bold text-danger">업로드 실패</div>
              <div className="text-[11px] text-danger mt-0.5">{uploadError}</div>
            </div>
          )}

          <div className="flex gap-2 mt-5">
            {slot.doc && (
              <button onClick={onDelete} className="text-[12px] text-danger hover:underline font-semibold mr-auto">
                삭제
              </button>
            )}
            <button onClick={onToggle} className="btn-secondary text-[13px] py-2 px-3">취소</button>
            <button
              onClick={handleSave}
              disabled={saving || (!slot.doc && !selectedFile) || (slot.requiresExpiry && !expiresAt)}
              className="btn-primary text-[13px] py-2 px-3"
            >
              {uploading ? '업로드 중…' : saving ? '저장 중…' : slot.doc ? '수정 저장' : '등록'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
