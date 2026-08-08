'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

/**
 * 회원가입 · 디자인 시스템 v2.0
 * 공개 가입 역할은 입점 파트너 / 행사 주최만 (관리자는 셀프가입 불가).
 * 입점 파트너는 가입 후 관리자 '가입 심사'를 거쳐 신청 가능.
 */

const ROLES = [
  { id: 'seller', mark: '입', label: '입점 파트너', desc: '푸드트럭·음식부스 사업자' },
  { id: 'host', mark: '주', label: '행사 주최', desc: '축제·팝업·플리마켓 운영' },
] as const;

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'seller' | 'host'>('seller');
  // 주최 명함 정보
  const [orgName, setOrgName] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needConfirm, setNeedConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    // 이메일 확인이 켜져 있으면 세션이 없음 → 안내 표시
    if (!data.session) {
      setLoading(false);
      setNeedConfirm(true);
      return;
    }
    // 주최 명함 정보를 프로필에 저장 (트리거가 생성한 프로필 갱신)
    if (role === 'host' && data.session.user) {
      await supabase
        .from('profiles')
        .update({ business_name: orgName, position, phone })
        .eq('id', data.session.user.id);
    }
    setLoading(false);
    router.push(role === 'host' ? '/host' : '/dashboard');
  }

  if (needConfirm) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-page">
        <div className="card w-full max-w-[440px] text-center">
          <div className="text-[40px] mb-3">✓</div>
          <div className="t-section mb-2">가입 신청 완료</div>
          <div className="t-sub mb-5">
            <b>{email}</b> 로 인증 메일을 보냈습니다. 메일의 링크를 눌러 인증을 마치면 로그인할 수 있어요.
          </div>
          <Link href="/login" className="btn-primary inline-flex">로그인으로 이동</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-page">
      <div className="card w-full max-w-[440px]">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-[8px] bg-ink flex items-center justify-center">
            <span className="text-accent font-extrabold text-[14px] leading-none">F</span>
          </div>
          <span className="font-extrabold text-[15px] tracking-[-0.02em] text-ink">Festival Hub</span>
        </div>
        <h1 className="t-title mb-1">회원가입</h1>
        <p className="t-sub mb-6">역할을 선택하고 1분 만에 시작하세요.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 역할 선택 */}
          <div>
            <span className="text-[12px] font-semibold text-ink-soft block mb-2">역할</span>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => {
                const on = role === r.id;
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className="text-left p-3 rounded-input border-2 transition-colors"
                    style={{
                      borderColor: on ? 'var(--ink, #14120E)' : 'var(--line, #E7E2D6)',
                      background: on ? 'var(--bg-surface-sunken, #FDFBF6)' : 'transparent',
                    }}
                  >
                    <div className="w-8 h-8 rounded-[9px] flex items-center justify-center font-extrabold text-[13px] text-ink mb-2" style={{ background: 'var(--warning-bg, #FFF3C4)' }}>{r.mark}</div>
                    <div className="text-[14px] font-bold text-ink">{r.label}</div>
                    <div className="text-[11px] text-text-tertiary mt-0.5">{r.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-ink-soft">{role === 'host' ? '담당자 이름' : '이름 / 담당자'}</span>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="홍길동" />
          </label>

          {/* 주최 명함 정보 (가입 즉시 행사 등록 가능) */}
          {role === 'host' && (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-ink-soft">소속 (주최사·기관·단체명)</span>
                <input type="text" required value={orgName} onChange={(e) => setOrgName(e.target.value)} className="input" placeholder="예: 서울숲재단" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-ink-soft">직함 / 부서</span>
                  <input type="text" required value={position} onChange={(e) => setPosition(e.target.value)} className="input" placeholder="예: 사업팀 매니저" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-ink-soft">담당자 연락처</span>
                  <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="010-0000-0000" />
                </label>
              </div>
            </>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-ink-soft">이메일</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-ink-soft">비밀번호</span>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="6자 이상" />
          </label>

          {role === 'seller' ? (
            <div className="text-[12px] text-text-secondary leading-relaxed p-3 rounded-input" style={{ background: 'var(--info-soft, #F4F7FE)' }}>
              가입 후 <b>관리자 승인(가입 심사)</b>을 거쳐 행사 신청이 가능합니다. 사업자등록증·서류를 등록해두면 승인이 빨라집니다.
            </div>
          ) : (
            <div className="text-[12px] text-text-secondary leading-relaxed p-3 rounded-input" style={{ background: 'var(--info-soft, #F4F7FE)' }}>
              명함 정보만으로 <b>가입 즉시 행사를 등록</b>할 수 있습니다. 등록한 행사는 <b>관리자 검수 후 공개</b>되며, 검증된 입점 파트너의 신청을 받게 됩니다.
            </div>
          )}

          {error && (
            <div className="text-[12px] p-3 rounded-input badge-danger" style={{ display: 'block' }}>{error}</div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? '가입 중…' : '무료로 시작하기'}
          </button>
        </form>

        <p className="text-center text-[12px] text-text-tertiary mt-6">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-ink font-bold hover:underline">로그인</Link>
        </p>
      </div>
    </main>
  );
}
