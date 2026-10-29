'use client';

import { useEffect, useRef, useState } from 'react';
import AppNav from '@/components/AppNav';
import {
  fetchMyProfile, fetchNewsletterPosts,
  createNewsletterPost, updateNewsletterPost, deleteNewsletterPost, swapNewsletterOrder,
  uploadNewsletterImage,
  type NewsletterPostInput,
} from '@/lib/supabase/queries';
import type { Profile, NewsletterPost, NewsFeedItem } from '@/lib/types';

/**
 * 뉴스레터 관리 · 관리자 전용
 * 게시글 작성·수정·삭제·노출토글·순서조정(위/아래)
 */
export default function AdminNewsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<NewsletterPost[]>([]);
  const [editing, setEditing] = useState<NewsletterPost | 'new' | null>(null);
  const [importing, setImporting] = useState(false);
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
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setImporting(true)} className="btn-secondary text-[13px]">자동 뉴스 가져오기</button>
            <button onClick={() => setEditing('new')} className="btn-primary text-[13px]">+ 새 게시글</button>
          </div>
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
          userId={profile?.id ?? ''}
          nextOrder={posts.length ? Math.max(...posts.map((p) => p.sort_order)) + 1 : 0}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await reload(); }}
        />
      )}
      {importing && (
        <ImportModal
          existingUrls={posts.map((p) => p.url).filter(Boolean) as string[]}
          nextOrder={posts.length ? Math.max(...posts.map((p) => p.sort_order)) + 1 : 0}
          onClose={() => setImporting(false)}
          onImported={async () => { await reload(); }}
        />
      )}
    </main>
  );
}

function PostModal({ post, userId, nextOrder, onClose, onSaved }: {
  post: NewsletterPost | null; userId: string; nextOrder: number; onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState(post?.title ?? '');
  const [summary, setSummary] = useState(post?.summary ?? '');
  const [url, setUrl] = useState(post?.url ?? '');
  const [imageUrl, setImageUrl] = useState(post?.image_url ?? '');
  const [source, setSource] = useState(post?.source ?? '');
  const [published, setPublished] = useState(post?.published ?? true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { alert('이미지가 너무 큽니다 (최대 8MB)'); return; }
    if (!userId) { alert('업로드 권한을 확인할 수 없습니다. 새로고침 후 다시 시도해 주세요.'); return; }
    setUploading(true);
    try { setImageUrl(await uploadNewsletterImage(userId, f)); }
    catch (err) { alert('업로드 실패: ' + (err as Error).message); }
    finally { setUploading(false); }
  }

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
          <Field label="대표 이미지" hint="선택 · 파일 업로드 또는 URL">
            <div className="flex flex-col gap-2">
              {imageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={imageUrl} alt="미리보기" className="w-full h-32 object-cover rounded-input border border-line-faint" />
              )}
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-secondary text-[12px] py-1.5 px-3">
                  {uploading ? '업로드 중…' : '파일 선택'}
                </button>
                {imageUrl && <button type="button" onClick={() => setImageUrl('')} className="text-[12px] text-danger hover:underline">이미지 제거</button>}
              </div>
              <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="input" placeholder="또는 이미지 URL 붙여넣기" />
            </div>
          </Field>
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

/** 자동 뉴스(Google 뉴스 RSS)에서 항목을 골라 게시글로 가져오기 */
function ImportModal({ existingUrls, nextOrder, onClose, onImported }: {
  existingUrls: string[]; nextOrder: number; onClose: () => void; onImported: () => void;
}) {
  const [items, setItems] = useState<NewsFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState<Set<string>>(new Set(existingUrls));
  const [busy, setBusy] = useState<string | null>(null);
  const orderRef = useRef(nextOrder);

  useEffect(() => {
    let c = false;
    fetch('/api/news').then((r) => r.json())
      .then((d) => { if (!c) setItems(d.items ?? []); })
      .catch(() => {})
      .finally(() => { if (!c) setLoading(false); });
    return () => { c = true; };
  }, []);

  async function importOne(it: NewsFeedItem) {
    setBusy(it.link);
    try {
      await createNewsletterPost({
        title: it.title,
        url: it.link,
        source: it.source,
        summary: null,
        published: true,
        sort_order: orderRef.current++,
      });
      setDone((prev) => new Set(prev).add(it.link));
      onImported();
    } catch (e) { alert('가져오기 실패: ' + (e as Error).message); }
    finally { setBusy(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-page w-full sm:max-w-lg rounded-t-card sm:rounded-card p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[16px] font-extrabold text-ink">자동 뉴스 가져오기</h2>
          <button onClick={onClose} className="text-text-tertiary text-[18px] px-2">×</button>
        </div>
        <p className="t-sub mb-4">Google 뉴스에서 수집한 항목을 게시글로 가져옵니다. 가져온 글은 편집·순서조정할 수 있습니다.</p>
        {loading ? (
          <div className="card"><div className="animate-pulse space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-5 bg-muted rounded w-5/6" />)}</div></div>
        ) : (
          <div className="divide-y divide-line-faint">
            {items.map((it) => {
              const imported = done.has(it.link);
              return (
                <div key={it.link} className="flex items-start gap-3 py-3">
                  <span className="badge badge-info shrink-0 mt-0.5">{it.keyword}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold text-ink leading-snug">{it.title}</div>
                    <div className="text-[11px] text-text-tertiary mt-0.5">{it.source}{it.pubDate ? ` · ${it.pubDate.slice(0, 10)}` : ''}</div>
                  </div>
                  <button
                    onClick={() => importOne(it)}
                    disabled={imported || busy === it.link}
                    className={`shrink-0 text-[12px] py-1.5 px-3 rounded-input font-semibold ${imported ? 'bg-muted text-text-tertiary' : 'btn-primary'}`}
                  >
                    {imported ? '가져옴' : busy === it.link ? '…' : '가져오기'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="btn-secondary text-[13px] py-2 px-4">닫기</button>
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
