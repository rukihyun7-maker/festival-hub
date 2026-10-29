'use client';

import { useEffect, useState } from 'react';
import AppNav from '@/components/AppNav';
import {
  fetchMyProfile, fetchNewsletterPosts,
  createNewsletterPost, updateNewsletterPost, deleteNewsletterPost, swapNewsletterOrder,
  type NewsletterPostInput,
} from '@/lib/supabase/queries';
import type { Profile, NewsletterPost } from '@/lib/types';

/**
 * 뉴스레터 관리 · 관리자 전용
 * 게시글 작성·수정·삭제·노출토글·순서조정(위/아래)
 */
export default function AdminNewsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<NewsletterPost[]>([]);
  const [editing, setEditing] = useState<NewsletterPost | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reload() {
    setPosts(await fetchNewsletterPosts(false)); // 전체(미노출 포함)
  }

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

  async function togglePublish(p: NewsletterPost) {
    setBusyId(p.id);
    try { await updateNewsletterPost(p.id, { published: !p.published }); await reload(); }
    catch (e) { alert('변경 실패: ' + (e as Error).message); }
    finally { setBusyId(null); }
  }

  async function move(p: NewsletterPost, dir: -1 | 1) {
    const idx = posts.findIndex((x) => x.id === p.id);
    const other = posts[idx + dir];
    if (!other) return;
    setBusyId(p.id);
    try { await swapNewsletterOrder(p, other); await reload(); }
    catch (e) { alert('순서 변경 실패: ' + (e as Error).message); }
    finally { setBusyId(null); }
  }

  async function remove(p: NewsletterPost) {
    if (!confirm(`"${p.title}"을(를) 삭제할까요?`)) return;
    setBusyId(p.id);
    try { await deleteNewsletterPost(p.id); await reload(); }
    catch (e) { alert('삭제 실패: ' + (e as Error).message); }
    finally { setBusyId(null); }
  }

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="admin" />
      <div className="container-app py-8 md:py-12">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="t-title mb-1">뉴스레터 관리</h1>
            <p className="t-sub">주최·파트너에게 보이는 소식 게시글을 작성·관리합니다. (자동 뉴스피드는 /news에서 실시간 표시)</p>
          </div>
          <button onClick={() => setEditing('new')} className="btn-primary text-[13px] shrink-0">+ 새 게시글</button>
        </div>

        {loading ? (
          <div className="card"><div className="animate-pulse h-24 bg-muted rounded" /></div>
        ) : posts.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-[15px] font-bold text-ink mb-1">게시글이 없습니다</div>
            <div className="t-sub mb-4">첫 소식을 올려보세요. 자동 뉴스피드와 함께 /news에 표시됩니다.</div>
            <button onClick={() => setEditing('new')} className="btn-primary inline-flex">+ 새 게시글</button>
          </div>
        ) : (
          <div className="card divide-y divide-line-faint">
            {posts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 py-3">
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button onClick={() => move(p, -1)} disabled={i === 0 || busyId === p.id} className="text-[11px] px-1.5 py-0.5 rounded border border-line-faint disabled:opacity-30 hover:bg-surface-sunken">▲</button>
                  <button onClick={() => move(p, 1)} disabled={i === posts.length - 1 || busyId === p.id} className="text-[11px] px-1.5 py-0.5 rounded border border-line-faint disabled:opacity-30 hover:bg-surface-sunken">▼</button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-bold text-ink truncate">{p.title}</span>
                    {!p.published && <span className="badge">숨김</span>}
                  </div>
                  <div className="text-[11.5px] text-text-tertiary mt-0.5 truncate">
                    {p.source && `${p.source} · `}{new Date(p.created_at).toLocaleDateString('ko-KR')}
                    {p.url && ' · 링크 있음'}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => togglePublish(p)} disabled={busyId === p.id} className="btn-secondary text-[12px] py-1.5 px-3">{p.published ? '숨기기' : '노출'}</button>
                  <button onClick={() => setEditing(p)} className="btn-secondary text-[12px] py-1.5 px-3">편집</button>
                  <button onClick={() => remove(p)} disabled={busyId === p.id} className="text-[12px] text-danger hover:underline font-semibold px-2">삭제</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <PostModal
          post={editing === 'new' ? null : editing}
          nextOrder={posts.length ? Math.max(...posts.map((p) => p.sort_order)) + 1 : 0}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await reload(); }}
        />
      )}
    </main>
  );
}

function PostModal({ post, nextOrder, onClose, onSaved }: {
  post: NewsletterPost | null; nextOrder: number; onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState(post?.title ?? '');
  const [summary, setSummary] = useState(post?.summary ?? '');
  const [url, setUrl] = useState(post?.url ?? '');
  const [imageUrl, setImageUrl] = useState(post?.image_url ?? '');
  const [source, setSource] = useState(post?.source ?? '');
  const [published, setPublished] = useState(post?.published ?? true);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) { alert('제목을 입력해 주세요'); return; }
    setSaving(true);
    const input: NewsletterPostInput = {
      title: title.trim(),
      summary: summary.trim() || null,
      url: url.trim() || null,
      image_url: imageUrl.trim() || null,
      source: source.trim() || null,
      published,
    };
    try {
      if (post) await updateNewsletterPost(post.id, input);
      else await createNewsletterPost({ ...input, sort_order: nextOrder });
      onSaved();
    } catch (e) { alert('저장 실패: ' + (e as Error).message); setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-page w-full sm:max-w-lg rounded-t-card sm:rounded-card p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-extrabold text-ink">{post ? '게시글 편집' : '새 게시글'}</h2>
          <button onClick={onClose} className="text-text-tertiary text-[18px] px-2">×</button>
        </div>
        <div className="flex flex-col gap-3">
          <Field label="제목" req><input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="예: 2026 가을 전국 축제 일정 안내" /></Field>
          <Field label="내용" hint="선택"><textarea rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} className="input resize-none" placeholder="소식 요약·본문을 입력하세요" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="출처" hint="선택"><input value={source} onChange={(e) => setSource(e.target.value)} className="input" placeholder="예: 문화체육관광부" /></Field>
            <Field label="원문 링크" hint="선택"><input value={url} onChange={(e) => setUrl(e.target.value)} className="input" placeholder="https://…" /></Field>
          </div>
          <Field label="대표 이미지 URL" hint="선택"><input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="input" placeholder="https://…/image.jpg" /></Field>
          <label className="flex items-center gap-2 text-[13px] text-ink">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> 바로 노출(주최·파트너에게 공개)
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
