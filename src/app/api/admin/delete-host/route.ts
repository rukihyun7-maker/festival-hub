import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/**
 * 주최 계정 완전 삭제 (관리자 전용)
 * 조건: 대상이 '주최(host)' + 등록된 행사가 0건일 때만.
 * 완전 삭제는 Auth Admin API(서비스 키)가 필요 → 서버에서만 처리.
 * 필요 env: SUPABASE_SERVICE_ROLE_KEY (Vercel/서버에만, 클라 비노출)
 * POST { hostId } → { ok } | { error }
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });

  // 호출자 관리자 검증
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (me?.role !== 'admin') return NextResponse.json({ error: '관리자만 가능합니다' }, { status: 403 });

  let hostId: string | undefined;
  try { hostId = (await req.json())?.hostId; } catch { /* no body */ }
  if (!hostId) return NextResponse.json({ error: 'hostId가 필요합니다' }, { status: 400 });

  // 대상이 주최 계정인지
  const { data: target } = await supabase.from('profiles').select('role').eq('id', hostId).maybeSingle();
  if (!target) return NextResponse.json({ error: '대상 계정을 찾을 수 없습니다' }, { status: 404 });
  if (target.role !== 'host') return NextResponse.json({ error: '주최 계정만 삭제할 수 있습니다' }, { status: 400 });

  // 등록된 행사가 없어야 함
  const { count, error: cErr } = await supabase
    .from('events').select('id', { count: 'exact', head: true }).eq('owner_id', hostId);
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: `등록된 행사 ${count}건이 있어 삭제할 수 없습니다. 먼저 행사를 삭제하세요.` }, { status: 409 });
  }

  // 서비스 키로 완전 삭제
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !svc) {
    return NextResponse.json({ error: '서버에 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되어야 합니다.' }, { status: 500 });
  }
  const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } });

  // 프로필 정리(카스케이드 아닐 때 대비 · 실패 무시) 후 auth 사용자 삭제
  await admin.from('profiles').delete().eq('id', hostId);
  const { error: dErr } = await admin.auth.admin.deleteUser(hostId);
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
