'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchMyProfile, fetchMyNotifications, markNotificationsRead } from '@/lib/supabase/queries';
import type { Profile, Notification, Role, NotifKind } from '@/lib/types';

/**
 * 공통 상단 내비게이션 · Handoff v2 톤
 * - 좌측: 로고 + 역할별 메뉴
 * - 우측: 알림 벨(실데이터) + 프로필(실데이터·역할별 메뉴)
 */

const ROLE_LABEL: Record<Role, string> = { seller: '입점 파트너', host: '행사 주최', admin: '관리자' };
const ROLE_LETTER: Record<Role, string> = { seller: 'S', host: 'H', admin: 'A' };

function profileMenu(role: Role): { href: string; label: string }[] {
  if (role === 'host') {
    return [
      { href: '/host', label: '대시보드' },
      { href: '/host/settlement', label: '정산' },
      { href: '/settings', label: '설정' },
    ];
  }
  if (role === 'admin') {
    return [
      { href: '/admin', label: '인사이트' },
      { href: '/admin/users', label: '사용자 관리' },
      { href: '/settings', label: '설정' },
    ];
  }
  return [
    { href: '/seller', label: '내 참여 이력' },
    { href: '/seller/documents', label: '서류 관리' },
    { href: '/seller/simulator', label: '손익 시뮬레이터' },
    { href: '/settings', label: '설정' },
  ];
}

export default function AppNav({ role = 'seller' as Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchMyProfile();
        setProfile(p);
        if (p) setNotifs(await fetchMyNotifications(p.id));
      } catch {
        /* 미로그인 등 · 조용히 무시 */
      }
    })();
  }, []);

  // 현재 메뉴를 가로 스크롤 영역 안에서 보이도록
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [pathname, profile]);

  const effectiveRole: Role = profile?.role ?? role;
  const unread = notifs.filter((n) => !n.read).length;
  // 셀러·주최는 앱형 → 모바일 하단 탭바, 관리자는 웹 → 상단 유지
  const useBottomNav = effectiveRole === 'seller' || effectiveRole === 'host';

  // 하단 탭바가 있으면 본문 하단 여백 확보 (모바일)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('has-bottomnav', useBottomNav);
    return () => document.body.classList.remove('has-bottomnav');
  }, [useBottomNav]);

  const menu = effectiveRole === 'host'
    ? [
        { href: '/host', label: '대시보드' },
        { href: '/host/events', label: '내 행사' },
        { href: '/host/applicants', label: '신청자 관리' },
        { href: '/host/ratings', label: '평가' },
        { href: '/host/settlement', label: '정산' },
      ]
    : effectiveRole === 'admin'
    ? [
        { href: '/admin', label: '인사이트' },
        { href: '/admin/users', label: '사용자' },
        { href: '/admin/events', label: '행사 검수' },
        { href: '/admin/documents', label: '서류 검증' },
        { href: '/admin/ratings', label: '평가 관리' },
        { href: '/admin/api', label: '축제 API' },
        { href: '/admin/settings', label: '정책' },
        { href: '/admin/payments', label: '결제 관제' },
      ]
    : [
        { href: '/dashboard', label: '홈' },
        { href: '/events', label: '행사 찾기' },
        { href: '/seller/favorites', label: '찜' },
        { href: '/seller/applications', label: '내 신청' },
        { href: '/seller', label: '내 참여' },
        { href: '/seller/simulator', label: '손익 시뮬' },
      ];

  async function openNotif() {
    setNotifOpen((v) => !v);
    setProfileOpen(false);
    if (!notifOpen && profile && unread > 0) {
      try {
        await markNotificationsRead(profile.id);
        setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch {
        /* 무시 */
      }
    }
  }

  async function handleLogout() {
    try {
      await createClient().auth.signOut();
    } catch {
      /* 무시 */
    }
    router.push('/login');
  }

  return (
    <>
    <header className="sticky top-0 z-40 bg-page/90 backdrop-blur border-b border-line">
      <div className="container-app flex items-center justify-between h-[64px]">
        {/* 좌측 · 로고 + 메뉴 */}
        <div className="flex items-center gap-8 min-w-0 flex-1">
          <Link href={effectiveRole === 'host' ? '/host' : effectiveRole === 'admin' ? '/admin' : '/dashboard'} className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-[8px] bg-ink flex items-center justify-center">
              <span className="text-accent font-extrabold text-[14px] leading-none">F</span>
            </div>
            <span className="font-extrabold text-[15px] tracking-[-0.02em] text-ink hidden sm:inline">Festival Hub</span>
          </Link>
          <nav className={`${useBottomNav ? 'hidden sm:flex' : 'flex'} items-center gap-1 overflow-x-auto min-w-0 no-scrollbar nav-fade px-1`} style={{ WebkitOverflowScrolling: 'touch' }}>
            {menu.map((m) => {
              const active = pathname === m.href || (m.href !== '/dashboard' && pathname.startsWith(m.href));
              return (
                <Link
                  key={m.href}
                  href={m.href}
                  ref={active ? activeRef : undefined}
                  className={`px-3 py-2 rounded-[8px] text-[14px] font-semibold whitespace-nowrap transition-colors ${
                    active ? 'bg-muted text-ink' : 'text-text-secondary hover:text-ink hover:bg-surface-sunken'
                  }`}
                >
                  {m.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* 우측 · 알림 + 프로필 */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 알림 벨 */}
          <div className="relative">
            <button
              onClick={openNotif}
              className="relative w-10 h-10 rounded-[10px] hover:bg-surface-sunken flex items-center justify-center transition-colors"
              aria-label="알림"
            >
              <span className="text-[18px]">🔔</span>
              {unread > 0 && <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-danger" />}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-12 w-[340px] bg-surface border border-line rounded-card shadow-dropdown animate-fh-up p-2 z-50">
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-[13px] font-bold text-ink">알림 {notifs.length}</span>
                </div>
                {notifs.length === 0 ? (
                  <div className="px-3 py-8 text-center text-[12px] text-text-tertiary">새 알림이 없습니다</div>
                ) : (
                  notifs.slice(0, 8).map((n) => (
                    <NotifItem key={n.id} title={n.title} time={relTime(n.created_at)} kind={n.kind} />
                  ))
                )}
              </div>
            )}
          </div>

          {/* 프로필 */}
          <div className="relative">
            <button
              onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-[10px] hover:bg-surface-sunken transition-colors"
            >
              <div className="w-8 h-8 rounded-pill bg-accent flex items-center justify-center text-ink font-extrabold text-[13px]">
                {ROLE_LETTER[effectiveRole]}
              </div>
              <span className="text-[13px] font-bold text-ink hidden sm:inline">{ROLE_LABEL[effectiveRole]}</span>
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-12 w-[240px] bg-surface border border-line rounded-card shadow-dropdown animate-fh-up p-2 z-50">
                <div className="px-3 py-2.5 border-b border-line-faint mb-1">
                  <div className="text-[13px] font-bold text-ink truncate">
                    {profile?.business_name || profile?.name || '게스트'}
                  </div>
                  <div className="text-[11px] text-text-tertiary mt-0.5 truncate">{profile?.email ?? '로그인이 필요합니다'}</div>
                </div>
                {profileMenu(effectiveRole).map((m) => (
                  <MenuItem key={m.href} href={m.href}>{m.label}</MenuItem>
                ))}
                <div className="border-t border-line-faint mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 rounded-[8px] text-[13px] font-semibold text-danger hover:bg-danger-bg transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
    {useBottomNav && <BottomNav role={effectiveRole} pathname={pathname} unread={unread} />}
    </>
  );
}

// 모바일 하단 탭바 (셀러·주최 · 앱형)
const BOTTOM_TABS: Record<'seller' | 'host', { href: string; label: string; icon: IconKey }[]> = {
  seller: [
    { href: '/dashboard', label: '홈', icon: 'home' },
    { href: '/events', label: '찾기', icon: 'search' },
    { href: '/seller/favorites', label: '찜', icon: 'star' },
    { href: '/seller/applications', label: '신청', icon: 'list' },
    { href: '/seller', label: '마이', icon: 'user' },
  ],
  host: [
    { href: '/host', label: '홈', icon: 'home' },
    { href: '/host/events', label: '행사', icon: 'calendar' },
    { href: '/host/applicants', label: '신청자', icon: 'inbox' },
    { href: '/host/ratings', label: '평가', icon: 'star' },
    { href: '/host/settlement', label: '정산', icon: 'wallet' },
  ],
};

function BottomNav({ role, pathname, unread }: { role: Role; pathname: string; unread: number }) {
  if (role === 'admin') return null;
  const tabs = BOTTOM_TABS[role];
  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-line flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map((t) => {
        const active =
          t.href === '/dashboard' || t.href === '/host' || t.href === '/seller'
            ? pathname === t.href
            : pathname === t.href || pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative"
            style={{ color: active ? 'var(--ink)' : 'var(--text-tertiary)' }}
          >
            <TabIcon name={t.icon} active={active} />
            <span className="text-[10.5px] font-bold">{t.label}</span>
            {t.icon === 'inbox' && unread > 0 && (
              <span className="absolute top-1.5 right-[26%] w-1.5 h-1.5 rounded-full bg-danger" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

type IconKey = 'home' | 'search' | 'star' | 'list' | 'user' | 'calendar' | 'inbox' | 'wallet';

function TabIcon({ name, active }: { name: IconKey; active: boolean }) {
  const sw = active ? 2.2 : 1.8;
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'home':
      return (<svg {...common}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>);
    case 'search':
      return (<svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>);
    case 'star':
      return (<svg {...common} fill={active ? 'currentColor' : 'none'}><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" /></svg>);
    case 'list':
      return (<svg {...common}><path d="M8 6h12M8 12h12M8 18h12" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></svg>);
    case 'user':
      return (<svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>);
    case 'calendar':
      return (<svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>);
    case 'inbox':
      return (<svg {...common}><path d="M3 12h5l2 3h4l2-3h5" /><path d="M5 5h14l2 7v7H3v-7z" /></svg>);
    case 'wallet':
      return (<svg {...common}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M16 12h3" /><path d="M3 9h13a2 2 0 0 1 2 2v0" /></svg>);
    default:
      return null;
  }
}

const KIND_DOT: Record<NotifKind, string> = {
  deadline: 'bg-warning',
  review: 'bg-success',
  docs: 'bg-info-bar',
  new_event: 'bg-info-bar',
  settlement: 'bg-success',
};

function NotifItem({ title, time, kind }: { title: string; time: string; kind: NotifKind }) {
  return (
    <div className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-[10px] hover:bg-surface-sunken text-left transition-colors">
      <span className={`w-1.5 h-1.5 rounded-full ${KIND_DOT[kind] ?? 'bg-info-bar'} mt-2 shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-ink">{title}</div>
        <div className="text-[11px] text-text-tertiary mt-0.5">{time}</div>
      </div>
    </div>
  );
}

function MenuItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-[8px] text-[13px] font-semibold text-ink hover:bg-surface-sunken transition-colors"
    >
      {children}
    </Link>
  );
}

/** 간단 상대시간 */
function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return iso.slice(0, 10).replace(/-/g, '.');
}
