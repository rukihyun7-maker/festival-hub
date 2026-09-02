'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

/**
 * 새 비밀번호 설정 · 재설정 메일 링크(/auth/callback?next=/auth/reset)로 세션이 확립된 상태에서 진입
 */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('비밀번호는 6자 이상으로 입력해 주세요.'); return; }
    if (password !== confirm) { setError('비밀번호가 서로 일치하지 않습니다.'); return; }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError('재설정 링크가 만료되었거나 유효하지 않습니다. 재설정을 다시 요청해 주세요.');
      return;
    }
    setDone(true);
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

          {done ? (
            <>
              <h1 className="t-title mb-2">비밀번호가 변경되었습니다</h1>
              <p className="t-sub mb-6">새 비밀번호로 로그인해 주세요.</p>
              <Link href="/login" className="btn-primary w-full inline-flex justify-center">로그인하러 가기</Link>
            </>
          ) : (
            <>
              <h1 className="t-title mb-2">새 비밀번호 설정</h1>
              <p className="t-sub mb-6">사용하실 새 비밀번호를 입력해 주세요. (6자 이상)</p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-ink-soft">새 비밀번호</span>
                  <input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="6자 이상" />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-ink-soft">새 비밀번호 확인</span>
                  <input type="password" required minLength={6} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input" placeholder="다시 입력" />
                </label>
                {error && (
                  <div className="text-[13px] text-danger bg-danger-bg rounded-input px-3 py-2.5 border border-danger/20">
                    {error}{' '}
                    {/만료|유효/.test(error) && <Link href="/forgot-password" className="font-bold underline">재요청</Link>}
                  </div>
                )}
                <button type="submit" disabled={loading} className="btn-primary py-3.5 text-[15px]">
                  {loading ? '변경 중…' : '비밀번호 변경'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
