import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/**
 * 계정 완전 삭제 (관리자 전용) · 주최(host) + 입점 파트너(seller)
 * - 주최: 등록된 행사가 0건일 때만 (기존 조건 유지)
 * - 파트너: 반려·정지 등 이슈 계정 삭제 허용 (이메일 해제 → 재가입 가능). 관련 데이터는 cascade 정리.
 * 완전 삭제는 Auth Admin API(서비스 키)가 필요 → 서버에서만 처리.
 * POST { hostId | userId } → { ok } | { error }
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });

  // 호출자 관리자 검증
  const { data: me } = await supabase.from('profiles').select('role, is_super_admin').eq('id', user.id).maybeSingle();
  if (me?.role !== 'admin') return NextResponse.json({ error: '관리자만 가능합니다' }, { status: 403 });
  const isSuper = me?.is_super_admin === true;

  let hostId: string | undefined;
  try { const b = await req.json(); hostId = b?.hostId ?? b?.userId; } catch { /* no body */ }
  if (!hostId) return NextResponse.json({ error: '대상 id가 필요합니다' }, { status: 400 });

  // 대상 역할 확인 · 관리자 계정은 메인 관리자만 삭제 가능(서브 관리자에 한함), 메인 관리자는 삭제 불가
  const { data: target } = await supabase.from('profiles').select('role, is_super_admin').eq('id', hostId).maybeSingle();
  if (!target) return NextResponse.json({ error: '대상 계정을 찾을 수 없습니다' }, { status: 404 });
  if (target.role === 'admin') {
    if (target.is_super_admin) return NextResponse.json({ error: '메인 관리자 계정은 삭제할 수 없습니다.' }, { status: 400 });
    if (!isSuper) return NextResponse.json({ error: '관리자 계정은 메인 관리자만 삭제할 수 있습니다.' }, { status: 403 });
  }

  // 주최는 등록된 행사가 없어야 함 (파트너는 조건 없음)
  if (target.role === 'host') {
    const { count, error: cErr } = await supabase
      .from('events').select('id', { count: 'exact', head: true }).eq('owner_id', hostId);
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: `등록된 행사 ${count}건이 있어 삭제할 수 없습니다. 먼저 행사를 삭제하세요.` }, { status: 409 });
    }
  }

  // 서비스 키로 완전 삭제
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !svc) {
    return NextResponse.json({ error: '서버에 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되어야 합니다.' }, { status: 500 });
  }
  const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } });

  // auth 사용자 삭제 → profiles(id FK on delete cascade)와 events·applications 등이 함께 정리됨.
  // (프로필을 먼저 지우면 auth 삭제 실패 시 고아 계정이 남으므로, auth 삭제만 수행)
  const { error: dErr } = await admin.auth.admin.deleteUser(hostId);
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
