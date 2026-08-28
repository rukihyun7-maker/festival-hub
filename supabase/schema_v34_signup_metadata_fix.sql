-- ============================================
-- Festival Hub · Schema v34 · 가입 트리거 병합 수정
-- v31(주최 가입 심사)이 v20(가입 메타데이터 저장)을 덮어써 회귀 → 병합 복구.
-- 신규 가입 시 business_no/business_name/position/phone 저장 + seller/host 가입심사 상태 반영.
-- (주최 사업자번호 필수는 앱단 검증 + 여기서 메타데이터 저장으로 완성)
-- 재실행 안전.
-- ============================================

create or replace function public.handle_new_user() returns trigger as $$
declare
  m jsonb := new.raw_user_meta_data;
  v_role text := coalesce(m->>'role', 'seller');
  v_seller_auto boolean;
  v_host_auto boolean;
begin
  select coalesce(seller_auto_approve, false), coalesce(host_auto_approve, false)
    into v_seller_auto, v_host_auto
    from public.platform_settings where id = 1;

  insert into public.profiles (id, email, name, role, status, business_no, business_name, position, phone)
  values (
    new.id,
    new.email,
    coalesce(nullif(m->>'name', ''), split_part(new.email, '@', 1)),
    v_role,
    case
      when v_role = 'seller' then (case when v_seller_auto then '정상' else '가입 심사' end)
      when v_role = 'host'   then (case when v_host_auto   then '정상' else '가입 심사' end)
      else '정상'
    end,
    nullif(m->>'business_no', ''),
    nullif(m->>'business_name', ''),
    nullif(m->>'position', ''),
    nullif(m->>'phone', '')
  );
  return new;
end;
$$ language plpgsql security definer;
