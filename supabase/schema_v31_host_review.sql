-- ============================================
-- Festival Hub · Schema v31 · 주최 가입 심사 도입
-- 기존: 주최(host)는 항상 '정상'(무심사) → 반려 불가.
-- 변경: 주최도 신규 가입 시 '가입 심사'(host_auto_approve=false 기본) → 관리자 승인/반려.
-- 기존 주최 계정은 이미 '정상'이라 영향 없음(신규 가입분부터 심사).
-- 재실행 안전.
-- ============================================

alter table public.platform_settings
  add column if not exists host_auto_approve boolean not null default false; -- 주최 자동 승인(off=수동 심사)

create or replace function public.handle_new_user() returns trigger as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'seller');
  v_seller_auto boolean;
  v_host_auto boolean;
begin
  select coalesce(seller_auto_approve, false), coalesce(host_auto_approve, false)
    into v_seller_auto, v_host_auto
    from public.platform_settings where id = 1;

  insert into public.profiles (id, email, name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    v_role,
    case
      when v_role = 'seller' then (case when v_seller_auto then '정상' else '가입 심사' end)
      when v_role = 'host'   then (case when v_host_auto   then '정상' else '가입 심사' end)
      else '정상'  -- admin
    end
  );
  return new;
end;
$$ language plpgsql security definer;

-- 확인:
--   select seller_auto_approve, host_auto_approve from public.platform_settings where id=1;
