import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/**
 * 임의 계정 생성 (관리자 전용) · 주최(host) / 입점 파트너(seller)
 * 정식 배포 후 데모 데이터 정리 · 기능 테스트를 위해 관리자가 테스트 계정을 즉시 만든다.
 * - Auth Admin API(서비스 키)로 생성 + 이메일 인증 완료(email_confirm) 처리 → 바로 로그인 가능
 * - 트리거로 프로필 생성 후 status='정상'으로 upsert(즉시 사용 가능)
 * POST { email, password, role: 'host'|'seller', name, business_name?, business_no?, position?, phone? }
 *   → { ok, userId } | { error }
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });

  // 호출자 관리자 검증
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (me?.role !== 'admin') return NextResponse.json({ error: '관리자만 가능합니다' }, { status: 403 });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* no body */ }

  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const role = String(body.role ?? '');
  const name = String(body.name ?? '').trim();
  const business_name = String(body.business_name ?? '').trim() || null;
  const business_no = String(body.business_no ?? '').trim() || null;
  const position = String(body.position ?? '').trim() || null;
  const phone = String(body.phone ?? '').trim() || null;

  // 입력 검증
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: '올바른 이메일을 입력해 주세요.' }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 });
  if (role !== 'host' && role !== 'seller') return NextResponse.json({ error: '역할은 주최 또는 입점 파트너만 가능합니다.' }, { status: 400 });
  if (!name) return NextResponse.json({ error: '이름을 입력해 주세요.' }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !svc) {
    return NextResponse.json({ error: '서버에 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되어야 합니다.' }, { status: 500 });
  }
  const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1) Auth 사용자 생성 (이메일 인증 완료 상태 · 메타데이터로 트리거가 프로필 생성)
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role, business_name, business_no, position, phone },
  });
  if (cErr || !created?.user) {
    const msg = (cErr?.message || '').toLowerCase();
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return NextResponse.json({ error: '이미 가입된 이메일입니다.' }, { status: 409 });
    }
    return NextResponse.json({ error: cErr?.message || '계정 생성에 실패했습니다.' }, { status: 500 });
  }

  const userId = created.user.id;

  // 2) 프로필을 '정상'으로 보정(트리거가 만든 프로필 위에 upsert · 즉시 사용 가능)
  const { error: pErr } = await admin.from('profiles').upsert({
    id: userId,
    email,
    name,
    role,
    status: '정상',
    business_name,
    business_no,
    position,
    phone,
  }, { onConflict: 'id' });
  if (pErr) {
    // 프로필 보정 실패 시 생성한 Auth 사용자 롤백(고아 계정 방지)
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: '프로필 생성에 실패했습니다: ' + pErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, userId });
}
