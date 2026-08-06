'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'seller' | 'host' | 'admin'>('seller');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/dashboard');
  }

  const roles = [
    { id: 'seller', em: '🛒', label: '입점 파트너', desc: '푸드트럭·플리마켓 사업자' },
    { id: 'host', em: '🎪', label: '행사 주최', desc: '축제·팝업 운영' },
    { id: 'admin', em: '⚙️', label: '관리자', desc: '플랫폼 운영자' },
  ] as const;

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 md:p-10">
        <h1 className="text-2xl font-black tracking-tight mb-1">회원가입</h1>
        <p className="text-sm text-gray-500 mb-8">역할을 선택하고 시작하세요.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">이름</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              placeholder="홍길동"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">이메일</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">비밀번호</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              placeholder="6자 이상"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-2">역할 선택</label>
            <div className="grid grid-cols-3 gap-2">
              {roles.map((r) => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`p-3 border-2 rounded-lg text-xs font-bold transition ${
                    role === r.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-xl mb-1">{r.em}</div>
                  <div>{r.label}</div>
                  <div className="text-[10px] font-normal opacity-70 mt-0.5">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm transition"
          >
            {loading ? '가입 중…' : '무료로 시작하기'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-blue-600 font-bold hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
