'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fetchMyProfile } from '@/lib/supabase/queries';
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
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'seller' | 'host'>('seller');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role } },
      });
      setLoading(false);
      if (error) return setError(error.message);
      // 신규 가입자는 프로필 완성을 위해 설정 페이지로
      router.push(`/settings?welcome=1&role=${role}`);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        return setError('이메일 또는 비밀번호가 일치하지 않습니다.');
      }
      // 로그인 성공 후 실제 프로필 role 조회해서 알맞은 진입점으로
      const p = await fetchMyProfile();
      setLoading(false);
      router.push(destForRole(p?.role));
    }
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
        {/* 좌측 · 잉크 패널 */}
        <aside className="bg-ink text-white flex flex-col justify-between overflow-hidden" style={{ padding: 'clamp(32px, 5vw, 64px)' }}>
          <div>
            <div className="text-[13px] font-semibold tracking-[0.06em] text-accent uppercase mb-6">Festival Hub</div>
            <h1 className="font-extrabold text-white leading-[1.24] tracking-[-0.035em]" style={{ fontSize: 'clamp(28px, 4.2vw, 44px)' }}>
              배달앱이 닿지 않는<br />
              야외 결제의 <span className="text-accent">첫 표준</span>
            </h1>
            <p className="mt-6 text-[15px] leading-[1.65] text-white/70 max-w-[380px]">
              푸드트럭·음식부스 사업자에게 행사 자리를 찾아주고, 행사 주최에게 검증된 파트너를 연결합니다.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 my-10">
            <Stat label="야외 QR 점유율" value="49.9%" />
            <Stat label="주최 재계약률" value="50%" />
            <Stat label="필수 서류 검증" value="5종" />
          </div>

          <div className="overflow-hidden -mx-2">
            <div className="text-[11px] font-semibold tracking-[0.08em] text-white/40 uppercase mb-3 px-2">최근 등록 행사</div>
            <div className="whitespace-nowrap animate-marquee text-[13px] text-white/60 font-medium">
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
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`px-4 py-2 rounded-[8px] text-[14px] font-bold transition-colors ${mode === 'login' ? 'bg-surface text-ink' : 'text-text-secondary'}`}
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`px-4 py-2 rounded-[8px] text-[14px] font-bold transition-colors ${mode === 'signup' ? 'bg-surface text-ink' : 'text-text-secondary'}`}
              >
                회원가입
              </button>
            </div>

            <h2 className="t-title mb-2">
              {mode === 'login' ? '다시 만나서 반갑습니다' : '30초 안에 시작하세요'}
            </h2>
            <p className="t-sub mb-8">
              {mode === 'login' ? '계정 정보로 계속하세요' : '이메일 인증 후 바로 이용 가능합니다'}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === 'signup' && (
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-ink-soft">이름</span>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="홍길동" />
                </label>
              )}

              <label className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold text-ink-soft">이메일</span>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold text-ink-soft">비밀번호</span>
                <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder={mode === 'signup' ? '8자 이상' : '비밀번호'} />
              </label>

              {mode === 'signup' && (
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-ink-soft">역할</span>
                  <div className="grid grid-cols-2 gap-2">
                    <RoleButton selected={role === 'seller'} onClick={() => setRole('seller')} name="입점 파트너" desc="푸드트럭·음식부스" />
                    <RoleButton selected={role === 'host'} onClick={() => setRole('host')} name="행사 주최" desc="축제·팝업" />
                  </div>
                </div>
              )}

              {error && (
                <div className="text-[13px] text-danger bg-danger-bg rounded-input px-3 py-2.5 border border-danger/20">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary mt-2 py-3.5 text-[15px]">
                {loading ? '처리 중…' : mode === 'login' ? '로그인' : '계정 만들기'}
              </button>
            </form>

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold tracking-[0.05em] text-white/40 uppercase mb-1.5">{label}</div>
      <div className="text-[22px] font-extrabold tracking-[-0.02em] text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

function RoleButton({ selected, onClick, name, desc }: { selected: boolean; onClick: () => void; name: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-3.5 rounded-input border-2 text-left transition-all ${
        selected ? 'bg-ink text-white border-ink' : 'bg-surface text-ink border-line-strong hover:border-ink'
      }`}
    >
      <div className="text-[14px] font-bold">{name}</div>
      <div className={`text-[11px] mt-0.5 ${selected ? 'text-white/60' : 'text-text-tertiary'}`}>{desc}</div>
    </button>
  );
}
