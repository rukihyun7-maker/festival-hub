'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fetchMyProfile, fetchPlatformSettings } from '@/lib/supabase/queries';
import Turnstile, { captchaEnabled } from '@/components/Turnstile';
import type { Role } from '@/lib/types';

function destForRole(role: Role | undefined): string {
  if (role === 'host') return '/host';
  if (role === 'admin') return '/admin';
  return '/dashboard';
}

/**
 * 로그인 · Handoff v2 톤 + Supabase 연동
 * 데모 계정 3종 원클릭 로그인 지원
 */

const DEMO_ACCOUNTS = [
  { role: '입점 파트너', email: 'seller@festival.demo', pw: 'festival2026', dest: '/dashboard', desc: '푸드트럭·음식부스' },
  { role: '행사 주최', email: 'host@festival.demo', pw: 'festival2026', dest: '/host', desc: '축제·팝업' },
  { role: '관리자', email: 'admin@festival.demo', pw: 'festival2026', dest: '/admin', desc: '전체 관제' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [stats, setStats] = useState({ partners: 0, events: 0, recruiting: 0 });

  useEffect(() => {
    (async () => {
      try {
        const s = await fetchPlatformSettings();
        if (s) setStats({ partners: s.landing_partners ?? 0, events: s.landing_events ?? 0, recruiting: s.landing_recruiting ?? 0 });
      } catch { /* 비로그인/미설정 → 0 */ }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (captchaEnabled && !captchaToken) { setError('사람인지 확인(보안 인증)을 완료해주세요.'); return; }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email, password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error) {
      setLoading(false);
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('not confirmed') || (error as { code?: string }).code === 'email_not_confirmed') {
        return setError('이메일 인증이 완료되지 않았습니다. 받은 인증 메일의 링크를 먼저 눌러 인증을 마쳐주세요.');
      }
      return setError('이메일 또는 비밀번호가 일치하지 않습니다.');
    }
    // 로그인 성공 후 실제 프로필 role 조회해서 알맞은 진입점으로
    const p = await fetchMyProfile();
    setLoading(false);
    router.push(destForRole(p?.role));
    router.refresh();
  }

  async function loginDemo(email: string, pw: string, dest: string) {
    setError('');
    setDemoLoading(email);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setDemoLoading(null);
    if (error) {
      setError('데모 계정 로그인 실패 · SETUP.md 시드 실행 필요');
      return;
    }
    router.push(dest);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-page">
      <div className="grid min-h-screen" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
        {/* 좌측 · 히어로 패널 (따뜻한 딥차콜 그라디언트 · 가독성 개선) */}
        <aside className="flex flex-col justify-between overflow-hidden" style={{ padding: 'clamp(32px, 5vw, 64px)', color: '#fff', background: 'linear-gradient(157deg, #2C271D 0%, #241F17 40%, #17140F 100%)' }}>
          <div>
            <div className="text-[13px] font-extrabold tracking-[0.16em] uppercase mb-6" style={{ color: 'var(--accent, #FFC800)' }}>Festival Hub</div>
            <h1 className="font-extrabold leading-[1.22] tracking-[-0.035em]" style={{ fontSize: 'clamp(28px, 4.2vw, 44px)', textWrap: 'balance' }}>
              좋은 행사 자리와<br />
              검증된 파트너를 <span style={{ color: 'var(--accent, #FFC800)' }}>잇다</span>
            </h1>
            <p className="mt-6 text-[15px] leading-[1.7] max-w-[420px]" style={{ color: 'rgba(255,255,255,0.84)' }}>
              푸드트럭·음식부스에게는 <b style={{ color: '#fff' }}>상권·예상 수익</b>까지 보이는 자리를,
              행사 주최에게는 <b style={{ color: '#fff' }}>서류·이력이 검증된 파트너</b>를.
              한 곳에서 빠르고 안전하게 연결합니다.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-10 mb-6">
            <Stat n={stats.partners} unit="팀" label="입점 파트너" />
            <Stat n={stats.events} unit="건" label="등록 행사" />
            <Stat n={stats.recruiting} unit="건" label="지금 모집 중" />
          </div>

          {/* 3대 신뢰 메시지 */}
          <div className="grid gap-2 mb-8">
            {[
              '관리자 검증을 통과한 파트너·행사만',
              '연락처·사업자 정보는 승인 후에만 공개',
              '서류 만료까지 미리 알려주는 안심 관리',
            ].map((t) => (
              <div key={t} className="flex items-center gap-2 text-[13px]" style={{ color: 'rgba(255,255,255,0.82)' }}>
                <span className="shrink-0 text-[13px] font-extrabold" style={{ color: 'var(--accent, #FFC800)' }}>✓</span>
                <span>{t}</span>
              </div>
            ))}
          </div>

          <div className="overflow-hidden -mx-2">
            <div className="text-[11px] font-bold tracking-[0.1em] uppercase mb-3 px-2" style={{ color: 'rgba(255,255,255,0.5)' }}>최근 등록 행사</div>
            <div className="whitespace-nowrap animate-marquee text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.68)' }}>
              <span className="inline-block px-6">서울숲 8월 플리마켓</span>
              <span className="text-white/20">·</span>
              <span className="inline-block px-6">2026 강릉 커피축제</span>
              <span className="text-white/20">·</span>
              <span className="inline-block px-6">잠실 대단지 썸머 페스티벌</span>
              <span className="text-white/20">·</span>
              <span className="inline-block px-6">CJ 임직원 감사 페스티벌</span>
              <span className="text-white/20">·</span>
              <span className="inline-block px-6">현대백화점 판교점 F&B 팝업</span>
              <span className="text-white/20">·</span>
              <span className="inline-block px-6">세종대 해오름제</span>
            </div>
          </div>

          <style jsx>{`
            @keyframes fhMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
            .animate-marquee { animation: fhMarquee 34s linear infinite; }
          `}</style>
        </aside>

        {/* 우측 · 폼 */}
        <section className="flex items-center justify-center" style={{ padding: 'clamp(32px, 5vw, 64px)' }}>
          <div className="w-full max-w-[420px]">
            <div className="inline-flex bg-muted rounded-input p-1 mb-8">
              <span className="px-4 py-2 rounded-[8px] text-[14px] font-bold bg-surface text-ink">로그인</span>
              <Link href="/signup" className="px-4 py-2 rounded-[8px] text-[14px] font-bold text-text-secondary hover:text-ink transition-colors">
                회원가입
              </Link>
            </div>

            <h2 className="t-title mb-2">다시 만나서 반갑습니다</h2>
            <p className="t-sub mb-8">계정 정보로 계속하세요</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold text-ink-soft">이메일</span>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold text-ink-soft">비밀번호</span>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="비밀번호" />
              </label>

              {error && (
                <div className="text-[13px] text-danger bg-danger-bg rounded-input px-3 py-2.5 border border-danger/20">
                  {error}
                </div>
              )}

              <Turnstile onToken={setCaptchaToken} />

              <button type="submit" disabled={loading} className="btn-primary mt-2 py-3.5 text-[15px]">
                {loading ? '처리 중…' : '로그인'}
              </button>
            </form>

            <p className="text-center text-[13px] text-text-secondary mt-5">
              계정이 없으신가요?{' '}
              <Link href="/signup" className="text-ink font-bold hover:underline">회원가입 →</Link>
            </p>

            {/* 데모 계정 3개 원클릭 */}
            <div className="mt-8 pt-6 border-t border-line">
              <div className="text-[11px] font-semibold tracking-[0.05em] text-text-tertiary uppercase mb-3">
                데모 계정으로 빠른 체험
              </div>
              <div className="flex flex-col gap-2">
                {DEMO_ACCOUNTS.map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => loginDemo(d.email, d.pw, d.dest)}
                    disabled={demoLoading !== null}
                    className="flex items-center justify-between px-3 py-2.5 rounded-input bg-surface-sunken border border-line hover:border-ink transition-colors text-left disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[12px] font-bold text-ink shrink-0">{d.role}</span>
                      <span className="text-[11px] text-text-tertiary hidden sm:inline">{d.desc}</span>
                      <span className="text-[12px] text-text-secondary truncate" style={{ fontFamily: 'ui-monospace, monospace' }}>
                        {d.email}
                      </span>
                    </div>
                    <span className="text-[11px] text-accent-warm font-semibold shrink-0">
                      {demoLoading === d.email ? '로그인 중…' : '→ 로그인'}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-text-tertiary mt-3">
                시드 실행이 안 됐다면 <code className="bg-muted px-1 py-0.5 rounded text-[10px]">SETUP.md</code>의 Step 2-3 확인
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ n, unit, label }: { n: number; unit: string; label: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '14px 12px' }}>
      <div className="font-extrabold leading-none" style={{ fontSize: 26, color: 'var(--accent, #FFC800)', fontVariantNumeric: 'tabular-nums' }}>
        {n.toLocaleString()}<span className="ml-0.5" style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)' }}>{unit}</span>
      </div>
      <div className="text-[11.5px] font-semibold mt-1.5" style={{ color: 'rgba(255,255,255,0.62)' }}>{label}</div>
    </div>
  );
}

