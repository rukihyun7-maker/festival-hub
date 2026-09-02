'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Turnstile, { captchaEnabled } from '@/components/Turnstile';

/**
 * 비밀번호 재설정 요청 · 이메일로 재설정 링크 발송
 * 링크는 /auth/callback?next=/auth/reset 로 복귀 → 새 비밀번호 설정
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (captchaEnabled && !captchaToken) { setError('보안 확인을 먼저 완료해 주세요.'); return; }
    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/reset`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
      ...(captchaToken ? { captchaToken } : {}),
    });
    setLoading(false);
    // 이메일 존재 여부를 노출하지 않기 위해 성공/실패와 무관하게 동일 안내
    if (error && /captcha|rate|too many/i.test(error.message)) {
      setError('요청이 많습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    setSent(true);
  }

  return (
    <main className="min-h-screen bg-page flex items-center justify-center">
      <div className="container-app py-12 max-w-[440px]">
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-[8px] bg-ink flex items-center justify-center">
              <span className="text-accent font-extrabold text-[14px] leading-none">F</span>
            </div>
            <span className="font-extrabold text-[15px] tracking-[-0.02em] text-ink">Festival Hub</span>
          </div>

          {sent ? (
            <>
              <h1 className="t-title mb-2">메일을 확인해 주세요</h1>
              <p className="t-sub mb-6 leading-relaxed">
                입력하신 주소로 가입된 계정이 있다면 <b>비밀번호 재설정 링크</b>를 보내드렸습니다.
                메일의 링크를 눌러 새 비밀번호를 설정해 주세요. (메일이 안 보이면 스팸함도 확인해 주세요)
              </p>
              <Link href="/login" className="btn-primary w-full inline-flex justify-center">로그인으로 돌아가기</Link>
            </>
          ) : (
            <>
              <h1 className="t-title mb-2">비밀번호 재설정</h1>
              <p className="t-sub mb-6">가입하신 이메일을 입력하시면 재설정 링크를 보내드립니다.</p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-ink-soft">이메일</span>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
                </label>
                {error && (
                  <div className="text-[13px] text-danger bg-danger-bg rounded-input px-3 py-2.5 border border-danger/20">{error}</div>
                )}
                <Turnstile onToken={setCaptchaToken} />
                <button type="submit" disabled={loading} className="btn-primary py-3.5 text-[15px]">
                  {loading ? '전송 중…' : '재설정 링크 받기'}
                </button>
              </form>
              <p className="text-center text-[13px] text-text-secondary mt-5">
                <Link href="/login" className="text-ink font-bold hover:underline">← 로그인으로</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
