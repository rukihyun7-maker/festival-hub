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
  const { data: me } = await supabase.from('profiles').select('role, is_super_admin').eq('id', user.id).maybeSingle();
  if (me?.role !== 'admin') return NextResponse.json({ error: '관리자만 가능합니다' }, { status: 403 });
  const isSuper = me?.is_super_admin === true;

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
  const overwrite = body.overwrite === true; // 이미 있는 이메일이면 그 계정을 테스트용으로 덮어쓰기

  // 입력 검증
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: '올바른 이메일을 입력해 주세요.' }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 });
  if (role !== 'host' && role !== 'seller' && role !== 'admin') return NextResponse.json({ error: '역할이 올바르지 않습니다.' }, { status: 400 });
  // 관리자(admin) 계정 생성은 메인(최고) 관리자만 가능
  if (role === 'admin' && !isSuper) return NextResponse.json({ error: '관리자 계정은 메인 관리자만 생성할 수 있습니다.' }, { status: 403 });
  if (!name) return NextResponse.json({ error: '이름을 입력해 주세요.' }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !svc) {
    return NextResponse.json({ error: '서버에 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되어야 합니다.' }, { status: 500 });
  }
  const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } });
  const meta = { name, role, business_name, business_no, position, phone };
  const profileRow = { email, name, role, status: '정상', business_name, business_no, position, phone, is_super_admin: false };

  // 이미 존재하는 이메일 찾기 (프로필 기준 · 없으면 신규 생성)
  const { data: existing } = await admin.from('profiles').select('id, role').eq('email', email).maybeSingle();

  if (existing) {
    // 동일 이메일 예외처리: overwrite=true 일 때만 그 계정을 테스트용으로 덮어쓰기
    if (!overwrite) {
      return NextResponse.json({ error: '이미 가입된 이메일입니다. 같은 이메일을 재사용하려면 "덮어쓰기"를 켜세요.' }, { status: 409 });
    }
    if (existing.role === 'admin') {
      return NextResponse.json({ error: '관리자 계정은 덮어쓸 수 없습니다.' }, { status: 400 });
    }
    // Auth 사용자 갱신(비번·이메일 인증·메타) + 프로필 재설정
    const { error: uErr } = await admin.auth.admin.updateUserById(existing.id, {
      password, email_confirm: true, user_metadata: meta,
    });
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    const { error: pErr } = await admin.from('profiles').upsert({ id: existing.id, ...profileRow }, { onConflict: 'id' });
    if (pErr) return NextResponse.json({ error: '프로필 갱신 실패: ' + pErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, userId: existing.id, overwritten: true });
  }

  // 신규 Auth 사용자 생성 (이메일 인증 완료 · 메타데이터로 트리거가 프로필 생성)
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: meta,
  });
  if (cErr || !created?.user) {
    const msg = (cErr?.message || '').toLowerCase();
    // 프로필은 없지만 Auth에는 존재하는 경우(희귀) → overwrite면 Auth에서 찾아 갱신
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      if (!overwrite) {
        return NextResponse.json({ error: '이미 가입된 이메일입니다. 같은 이메일을 재사용하려면 "덮어쓰기"를 켜세요.' }, { status: 409 });
      }
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = list?.users?.find((u) => (u.email || '').toLowerCase() === email);
      if (!found) return NextResponse.json({ error: '이미 가입된 이메일이지만 대상 계정을 찾지 못했습니다.' }, { status: 409 });
      const { error: uErr } = await admin.auth.admin.updateUserById(found.id, { password, email_confirm: true, user_metadata: meta });
      if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
      const { error: pErr } = await admin.from('profiles').upsert({ id: found.id, ...profileRow }, { onConflict: 'id' });
      if (pErr) return NextResponse.json({ error: '프로필 갱신 실패: ' + pErr.message }, { status: 500 });
      return NextResponse.json({ ok: true, userId: found.id, overwritten: true });
    }
    return NextResponse.json({ error: cErr?.message || '계정 생성에 실패했습니다.' }, { status: 500 });
  }

  const userId = created.user.id;
  // 프로필을 '정상'으로 보정(트리거가 만든 프로필 위에 upsert · 즉시 사용 가능)
  const { error: pErr } = await admin.from('profiles').upsert({ id: userId, ...profileRow }, { onConflict: 'id' });
  if (pErr) {
    await admin.auth.admin.deleteUser(userId); // 프로필 실패 시 롤백(고아 계정 방지)
    return NextResponse.json({ error: '프로필 생성에 실패했습니다: ' + pErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, userId, overwritten: false });
}
