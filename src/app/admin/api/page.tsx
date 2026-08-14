'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import {
  fetchMyProfile,
  fetchApiSources,
  setApiSourceEnabled,
  syncApiSource,
  fetchCategoryRules,
  createCategoryRule,
  setCategoryVisible,
  deleteCategoryRule,
} from '@/lib/supabase/queries';
import type { Profile, ApiSource, CategoryRule } from '@/lib/types';

/**
 * 축제 API·카테고리 (관리자 · 설계 16)
 * 공공 API 소스 연동 on/off·동기화 + 카테고리 운영(추가/노출/삭제)
 * 수집분은 정보형(kind='info') 행사로 입점 파트너에게 노출됩니다.
 */
export default function AdminApiPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sources, setSources] = useState<ApiSource[]>([]);
  const [cats, setCats] = useState<CategoryRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newKeywords, setNewKeywords] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchMyProfile();
        setProfile(p);
        if (p?.role === 'admin') {
          const [src, cat] = await Promise.all([fetchApiSources(), fetchCategoryRules()]);
          setSources(src);
          setCats(cat);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function toggleSource(s: ApiSource) {
    setBusy(s.id);
    try {
      await setApiSourceEnabled(s.id, !s.enabled);
      setSources((prev) => prev.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x)));
    } finally {
      setBusy(null);
    }
  }
  async function sync(s: ApiSource) {
    setBusy(s.id);
    try {
      const updated = await syncApiSource(s.id);
      setSources((prev) => prev.map((x) => (x.id === s.id ? { ...x, last_sync: updated.last_sync } : x)));
    } finally {
      setBusy(null);
    }
  }
  async function toggleCat(c: CategoryRule) {
    setBusy(c.id);
    try {
      await setCategoryVisible(c.id, !c.visible);
      setCats((prev) => prev.map((x) => (x.id === c.id ? { ...x, visible: !x.visible } : x)));
    } finally {
      setBusy(null);
    }
  }
  async function removeCat(c: CategoryRule) {
    if (!confirm(`'${c.name}' 카테고리를 삭제할까요?`)) return;
    setBusy(c.id);
    try {
      await deleteCategoryRule(c.id);
      setCats((prev) => prev.filter((x) => x.id !== c.id));
    } finally {
      setBusy(null);
    }
  }
  async function addCat() {
    const name = newName.trim();
    if (!name) return;
    const keywords = newKeywords.split(',').map((k) => k.trim()).filter(Boolean);
    setBusy('new');
    try {
      const created = await createCategoryRule({ name, keywords });
      setCats((prev) => [...prev, created]);
      setNewName('');
      setNewKeywords('');
    } catch (e) {
      alert('추가 실패: ' + (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="admin" />
        <div className="container-app py-12">
          <div className="animate-pulse space-y-4 max-w-[820px]">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-24 bg-muted rounded w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="admin" />
        <div className="container-app py-12">
          <div className="card max-w-[640px]">
            <div className="text-[16px] font-bold text-ink mb-2">관리자 계정으로 로그인이 필요합니다</div>
            <Link href="/login" className="btn-primary inline-flex mt-2">로그인</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="admin" />
      <div className="container-app py-8 max-w-[820px]">
        <div className="mb-6">
          <div className="t-section text-[20px]">축제 API · 카테고리</div>
          <div className="t-sub mt-1">공공 API로 축제를 수집하고, 카테고리를 매핑해 정보형 행사로 노출합니다.</div>
        </div>

        {/* API 소스 */}
        <section className="mb-8">
          <div className="t-section mb-3">공공 API 소스</div>
          <div className="space-y-3">
            {sources.map((s) => (
              <div key={s.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[15px] font-extrabold text-ink truncate">{s.name}</span>
                      <span className={`badge ${s.enabled ? 'badge-success' : 'badge-info'}`}>{s.enabled ? '연동 중' : '중지'}</span>
                    </div>
                    <div className="text-[12px] text-text-secondary">
                      수집 주기 {s.cycle} · 누적 {s.count.toLocaleString()}건
                    </div>
                    <div className="text-[11px] text-text-tertiary mt-0.5">
                      마지막 동기화 {s.last_sync ? relTime(s.last_sync) : '없음'}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => toggleSource(s)}
                      disabled={busy === s.id}
                      className={s.enabled ? 'btn-secondary text-[13px]' : 'btn-primary text-[13px]'}
                    >
                      {s.enabled ? '중지' : '연동'}
                    </button>
                    <button onClick={() => sync(s)} disabled={busy === s.id || !s.enabled} className="btn-secondary text-[13px]">
                      지금 동기화
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 카테고리 운영 */}
        <section>
          <div className="t-section mb-3">카테고리 운영</div>

          {/* 추가 폼 */}
          <div className="card mb-4">
            <div className="text-[13px] font-bold text-ink mb-2">새 카테고리 추가</div>
            <div className="flex flex-col gap-2">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className="input" placeholder="카테고리 이름 (예: 플리마켓)" />
              <input value={newKeywords} onChange={(e) => setNewKeywords(e.target.value)} className="input" placeholder="매핑 키워드 (쉼표로 구분: 마켓, 벼룩)" />
              <button onClick={addCat} disabled={busy === 'new' || !newName.trim()} className="btn-primary self-start">추가</button>
            </div>
          </div>

          <div className="space-y-3">
            {cats.map((c) => (
              <div key={c.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[15px] font-extrabold text-ink">{c.name}</span>
                      <span className={`badge ${c.visible ? 'badge-success' : 'badge-info'}`}>{c.visible ? '노출' : '숨김'}</span>
                      <span className="text-[12px] text-text-tertiary">행사 {c.count}건</span>
                    </div>
                    {c.keywords.length > 0 && (
                      <div className="text-[12px] text-text-secondary">키워드: {c.keywords.join(', ')}</div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => toggleCat(c)} disabled={busy === c.id} className="btn-secondary text-[13px]">
                      {c.visible ? '숨기기' : '노출'}
                    </button>
                    <button onClick={() => removeCat(c)} disabled={busy === c.id} className="btn-secondary text-[13px]" style={{ color: 'var(--danger, #9B2C22)' }}>
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}
