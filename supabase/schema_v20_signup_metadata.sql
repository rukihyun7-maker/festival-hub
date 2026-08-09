-- ============================================
-- Festival Hub · Schema v20 · 가입 메타데이터로 프로필 채우기 (이메일 인증 호환)
-- 이메일 확인(Confirm email) ON 시 가입 직후 세션이 없어 프로필 update 불가.
-- → signUp options.data(raw_user_meta_data)에 담긴 값을 트리거가 프로필에 반영.
-- 입점 파트너: business_no / 행사 주최: business_name·position·phone.
-- 파일(사업자등록증·명함)은 인증·로그인 후 별도 업로드(세션 필요).
-- 재실행 안전.
-- ============================================

create or replace function public.handle_new_user() returns trigger as $$
declare
  m jsonb := new.raw_user_meta_data;
  v_role text := coalesce(m->>'role', 'seller');
  v_auto boolean;
begin
  select coalesce(seller_auto_approve, false) into v_auto from public.platform_settings where id = 1;
  insert into public.profiles (id, email, name, role, status, business_no, business_name, position, phone)
  values (
    new.id,
    new.email,
    coalesce(nullif(m->>'name', ''), split_part(new.email, '@', 1)),
    v_role,
    case when v_role = 'seller' then (case when v_auto then '정상' else '가입 심사' end) else '정상' end,
    nullif(m->>'business_no', ''),
    nullif(m->>'business_name', ''),
    nullif(m->>'position', ''),
    nullif(m->>'phone', '')
  );
  return new;
end;
$$ language plpgsql security definer;
