'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { fetchAllProfiles, fetchMyProfile, updateProfileRole } from '@/lib/supabase/queries';
import type { Profile } from '@/lib/types';

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
              <div key={p.id} className={`grid gap-4 items-center p-5 ${i !== profiles.length - 1 ? 'border-b border-line-faint' : ''} hover:bg-surface-sunken transition-colors`} style={{ gridTemplateColumns: 'auto minmax(200px, 2fr) minmax(120px, 1fr) auto' }}>
                {/* 아바타 */}
                <div className={`w-10 h-10 rounded-pill flex items-center justify-center font-extrabold text-[14px] ${
                  p.role === 'admin' ? 'bg-ink text-accent' : p.role === 'host' ? 'bg-info-bar text-white' : 'bg-accent text-ink'
                }`}>
                  {p.name[0]}
                </div>

                {/* 정보 */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[15px] font-bold text-ink truncate">{p.business_name ?? p.name}</span>
                    <RoleBadge role={p.role} />
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

                {/* 액션 */}
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={p.id === me?.id}
                    className="text-[12px] text-danger hover:underline font-semibold disabled:opacity-30 disabled:no-underline disabled:cursor-not-allowed"
                    onClick={() => alert('정지 기능은 auth admin API 연결 후 활성화됩니다')}
                  >
                    정지
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 안내 */}
        <div className="mt-6 p-4 rounded-card bg-surface-sunken border border-line-faint">
          <div className="text-[12px] font-bold text-ink mb-1">참고</div>
          <div className="text-[11px] text-text-secondary leading-[1.6]">
            현재 계정 본인은 권한 변경/정지 불가. 정지 기능은 Supabase Auth Admin API 연결이 필요합니다 (server-side, service_role key 필요).
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
