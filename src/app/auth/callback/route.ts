import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 이메일 링크(회원가입 인증 · 비밀번호 재설정) 복귀 처리
 * Supabase가 보낸 링크는 ?code=... 를 달고 이 라우트로 돌아온다.
 * exchangeCodeForSession으로 세션을 확립한 뒤, next 파라미터(있으면) 또는 역할별 진입점으로 이동.
 * GET /auth/callback?code=...&next=/auth/reset
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next');
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_expired`);
  }

  // 비밀번호 재설정 등 명시적 목적지가 있으면 그리로
  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // 회원가입 인증 완료 → 역할별 진입점
  let dest = '/dashboard';
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (p?.role === 'host') dest = '/host';
      else if (p?.role === 'admin') dest = '/admin';
    }
  } catch { /* 조회 실패해도 기본 진입 */ }
  return NextResponse.redirect(`${origin}${dest}`);
}
