'use client';

import { useEffect, useState } from 'react';
import AppNav from '@/components/AppNav';
import {
  fetchMyProfile, fetchAllAnnouncements,
  createAnnouncement, updateAnnouncement, deleteAnnouncement,
  type AnnouncementInput,
} from '@/lib/supabase/queries';
import { ANN_AUDIENCE_LABEL, ANN_LEVEL_LABEL } from '@/lib/types';
import type { Profile, Announcement, AnnouncementAudience, AnnouncementLevel } from '@/lib/types';

/**
 * 공지사항 관리 · 관리자 전용
 * 대상(전체/파트너/주최)·레벨(일반/업데이트/주의)·노출기간 설정 → 상단 배너로 발행
 */
export default function AdminAnnouncementsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Announcement[]>([]);
  const [editing, setEditing] = useState<Announcement | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reload() { setRows(await fetchAllAnnouncements()); }

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchMyProfile();
        setProfile(p);
        if (p?.role === 'admin') await reload();
      } finally { setLoading(false); }
    })();
  }, []);

  if (!loading && profile?.role !== 'admin') {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="admin" />
        <div className="container-app py-12"><div className="card"><div className="text-[15px] font-bold text-ink">관리자 전용 페이지입니다</div></div></div>
      </main>
    );
  }

  async function togglePublish(a: Announcement) {
    setBusyId(a.id);
    try { await updateAnnouncement(a.id, { published: !a.published }); await reload(); }
    catch (e) { alert('변경 실패: ' + (e as Error).message); }
    finally { setBusyId(null); }
  }
  async function remove(a: Announcement) {
    if (!confirm(`"${a.title}" 공지를 삭제할까요?`)) return;
    setBusyId(a.id);
    try { await deleteAnnouncement(a.id); await reload(); }
    catch (e) { alert('삭제 실패: ' + (e as Error).message); }
    finally { setBusyId(null); }
  }
  function windowLabel(a: Announcement): string {
    const f = (s: string | null) => (s ? s.slice(0, 10) : '');
    if (!a.starts_at && !a.ends_at) return '상시';
    return `${f(a.starts_at) || '~'} ~ ${f(a.ends_at) || '~'}`;
  }

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="admin" />
      <div className="container-app py-8 md:py-12">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="t-title mb-1">공지사항 관리</h1>
            <p className="t-sub">대상·레벨·기간을 정해 발행하면, 해당 사용자의 홈 상단에 배너로 표시됩니다.</p>
          </div>
          <button onClick={() => setEditing('new')} className="btn-primary text-[13px] shrink-0">+ 새 공지</button>
        </div>

        {loading ? (
          <div className="card"><div className="animate-pulse h-24 bg-muted rounded" /></div>
        ) : rows.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-[15px] font-bold text-ink mb-1">공지가 없습니다</div>
            <div className="t-sub mb-4">기능 업데이트·점검·이벤트 소식을 대상별로 발행해 보세요.</div>
            <button onClick={() => setEditing('new')} className="btn-primary inline-flex">+ 새 공지</button>
          </div>
        ) : (
          <div className="card divide-y divide-line-faint">
            {rows.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-bold text-ink truncate">{a.title}</span>
                    <span className="badge badge-info">{ANN_AUDIENCE_LABEL[a.audience]}</span>
                    <span className="badge">{ANN_LEVEL_LABEL[a.level]}</span>
                    {!a.published && <span className="badge badge-danger">숨김</span>}
                  </div>
                  <div className="text-[11.5px] text-text-tertiary mt-0.5 truncate">
                    {windowLabel(a)}{a.body ? ` · ${a.body}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => togglePublish(a)} disabled={busyId === a.id} className="btn-secondary text-[12px] py-1.5 px-3">{a.published ? '숨기기' : '노출'}</button>
                  <button onClick={() => setEditing(a)} className="btn-secondary text-[12px] py-1.5 px-3">편집</button>
                  <button onClick={() => remove(a)} disabled={busyId === a.id} className="text-[12px] text-danger hover:underline font-semibold px-2">삭제</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <AnnModal
          ann={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await reload(); }}
        />
      )}
    </main>
  );
}

function AnnModal({ ann, onClose, onSaved }: { ann: Announcement | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(ann?.title ?? '');
  const [body, setBody] = useState(ann?.body ?? '');
  const [url, setUrl] = useState(ann?.url ?? '');
  const [audience, setAudience] = useState<AnnouncementAudience>(ann?.audience ?? 'all');
  const [level, setLevel] = useState<AnnouncementLevel>(ann?.level ?? 'info');
  const [published, setPublished] = useState(ann?.published ?? true);
  const [starts, setStarts] = useState(ann?.starts_at ? ann.starts_at.slice(0, 10) : '');
  const [ends, setEnds] = useState(ann?.ends_at ? ann.ends_at.slice(0, 10) : '');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) { alert('제목을 입력해 주세요'); return; }
    setSaving(true);
    const input: AnnouncementInput = {
      title: title.trim(),
      body: body.trim() || null,
      url: url.trim() || null,
      audience, level, published,
      starts_at: starts ? `${starts}T00:00:00` : null,
      ends_at: ends ? `${ends}T23:59:59` : null,
    };
    try {
      if (ann) await updateAnnouncement(ann.id, input);
      else await createAnnouncement(input);
      onSaved();
    } catch (e) { alert('저장 실패: ' + (e as Error).message); setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-page w-full sm:max-w-lg rounded-t-card sm:rounded-card p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-extrabold text-ink">{ann ? '공지 편집' : '새 공지'}</h2>
          <button onClick={onClose} className="text-text-tertiary text-[18px] px-2">×</button>
        </div>
        <div className="flex flex-col gap-3">
          <Field label="제목" req><input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="예: 창고(재고) 기능이 업데이트되었습니다" /></Field>
          <Field label="내용" hint="선택 · 배너 한 줄 설명"><textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} className="input resize-none" placeholder="예: 박스·낱개 단위로 더 정확하게 관리하세요." /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="대상">
              <select value={audience} onChange={(e) => setAudience(e.target.value as AnnouncementAudience)} className="input">
                {(Object.keys(ANN_AUDIENCE_LABEL) as AnnouncementAudience[]).map((k) => <option key={k} value={k}>{ANN_AUDIENCE_LABEL[k]}</option>)}
              </select>
            </Field>
            <Field label="레벨">
              <select value={level} onChange={(e) => setLevel(e.target.value as AnnouncementLevel)} className="input">
                {(Object.keys(ANN_LEVEL_LABEL) as AnnouncementLevel[]).map((k) => <option key={k} value={k}>{ANN_LEVEL_LABEL[k]}</option>)}
              </select>
            </Field>
          </div>
          <Field label="상세 링크" hint="선택"><input value={url} onChange={(e) => setUrl(e.target.value)} className="input" placeholder="https://… (예: 뉴스레터·가이드)" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="노출 시작" hint="선택"><input type="date" value={starts} onChange={(e) => setStarts(e.target.value)} className="input" /></Field>
            <Field label="노출 종료" hint="선택"><input type="date" value={ends} onChange={(e) => setEnds(e.target.value)} className="input" /></Field>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-ink">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> 바로 발행(대상 사용자 홈 상단에 노출)
          </label>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1">취소</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? '저장 중…' : '저장'}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, req, children }: { label: string; hint?: string; req?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-ink-soft">{label}{req && ' *'}{hint && <span className="text-text-tertiary font-normal"> · {hint}</span>}</span>
      {children}
    </label>
  );
}
