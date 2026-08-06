'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

/**
 * 공통 상단 내비게이션 · Handoff v2 톤
 * - 좌측: 로고 + 메뉴 (홈·행사·마이페이지)
 * - 우측: 알림 벨 + 프로필 아바타
 * - 좁은 화면에서 메뉴가 스크롤 가능
 */
export default function AppNav({ role = 'seller' as 'seller' | 'host' | 'admin' }) {
  const pathname = usePathname();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const menu = role === 'host'
    ? [
        { href: '/host', label: '대시보드' },
        { href: '/host/events', label: '내 행사' },
        { href: '/host/applicants', label: '신청자 관리' },
        { href: '/host/settlement', label: '정산' },
      ]
    : role === 'admin'
    ? [
        { href: '/admin', label: '인사이트' },
        { href: '/admin/users', label: '사용자' },
        { href: '/admin/events', label: '행사 검수' },
        { href: '/admin/documents', label: '서류 검증' },
        { href: '/admin/payments', label: '결제 관제' },
      ]
    : [
        { href: '/dashboard', label: '홈' },
        { href: '/events', label: '행사 찾기' },
        { href: '/seller', label: '내 참여' },
        { href: '/seller/simulator', label: '손익 시뮬' },
      ];

  return (
    <header className="sticky top-0 z-40 bg-page/90 backdrop-blur border-b border-line">
      <div className="container-app flex items-center justify-between h-[64px]">
        {/* 좌측 · 로고 + 메뉴 */}
        <div className="flex items-center gap-8 min-w-0 flex-1">
          <Link href={role === 'host' ? '/host' : role === 'admin' ? '/admin' : '/dashboard'} className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-[8px] bg-ink flex items-center justify-center">
              <span className="text-accent font-extrabold text-[14px] leading-none">F</span>
            </div>
            <span className="font-extrabold text-[15px] tracking-[-0.02em] text-ink">Festival Hub</span>
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto min-w-0" style={{ WebkitOverflowScrolling: 'touch' }}>
            {menu.map((m) => {
              const active = pathname === m.href || (m.href !== '/dashboard' && pathname.startsWith(m.href));
              return (
                <Link
                  key={m.href}
                  href={m.href}
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
              onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); }}
              className="relative w-10 h-10 rounded-[10px] hover:bg-surface-sunken flex items-center justify-center transition-colors"
              aria-label="알림"
            >
              <span className="text-[18px]">🔔</span>
              <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-danger" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-12 w-[340px] bg-surface border border-line rounded-card shadow-dropdown animate-fh-up p-2 z-50">
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-[13px] font-bold text-ink">알림 3</span>
                  <button className="text-[11px] font-semibold text-text-tertiary hover:text-ink">모두 읽음</button>
                </div>
                <NotifItem title="서울숲 8월 플리마켓 · 승인 완료" time="방금" type="success" />
                <NotifItem title="필수 서류 1건 만료 예정 (7일 남음)" time="1시간 전" type="warning" />
                <NotifItem title="정산 315,000원 완료" time="어제" type="info" />
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
                {role === 'host' ? 'H' : role === 'admin' ? 'A' : 'S'}
              </div>
              <span className="text-[13px] font-bold text-ink hidden sm:inline">
                {role === 'host' ? '행사 주최' : role === 'admin' ? '관리자' : '입점 파트너'}
              </span>
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-12 w-[240px] bg-surface border border-line rounded-card shadow-dropdown animate-fh-up p-2 z-50">
                <div className="px-3 py-2.5 border-b border-line-faint mb-1">
                  <div className="text-[13px] font-bold text-ink">홍길동</div>
                  <div className="text-[11px] text-text-tertiary mt-0.5">seller@festival.demo</div>
                </div>
                <MenuItem href="/seller">내 참여 이력</MenuItem>
                <MenuItem href="/seller/documents">서류 관리</MenuItem>
                <MenuItem href="/settings">설정</MenuItem>
                <div className="border-t border-line-faint mt-1 pt-1">
                  <MenuItem href="/login" danger>로그아웃</MenuItem>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function NotifItem({ title, time, type }: { title: string; time: string; type: 'success' | 'warning' | 'info' | 'danger' }) {
  const dot = { success: 'bg-success', warning: 'bg-warning', info: 'bg-info-bar', danger: 'bg-danger' }[type];
  return (
    <button className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-[10px] hover:bg-surface-sunken text-left transition-colors">
      <span className={`w-1.5 h-1.5 rounded-full ${dot} mt-2 shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-ink truncate">{title}</div>
        <div className="text-[11px] text-text-tertiary mt-0.5">{time}</div>
      </div>
    </button>
  );
}

function MenuItem({ href, children, danger }: { href: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <Link
      href={href}
      className={`block px-3 py-2 rounded-[8px] text-[13px] font-semibold transition-colors ${
        danger ? 'text-danger hover:bg-danger-bg' : 'text-ink hover:bg-surface-sunken'
      }`}
    >
      {children}
    </Link>
  );
}
