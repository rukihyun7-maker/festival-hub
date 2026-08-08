-- ============================================
-- Festival Hub · Schema v18 · 플랫폼 운영 정책 (가입·검수·정산)
-- platform_settings에 운영 정책 컬럼 추가 + 입점 파트너 자동승인 설정을 가입 트리거에 반영.
-- 재실행 안전.
-- ============================================

alter table public.platform_settings
  add column if not exists seller_auto_approve boolean not null default false,   -- 입점 파트너 자동 승인(off=수동 심사)
  add column if not exists required_docs_count integer not null default 5,       -- 승인 필수 서류 수
  add column if not exists platform_fee_pct numeric(5,2) not null default 0,     -- 플랫폼 기본 수수료(%)
  add column if not exists default_settlement text default '행사 종료 후 7영업일'; -- 기본 정산 주기 안내

-- 가입 트리거: seller_auto_approve=true면 신규 입점 파트너를 '정상'으로, 아니면 '가입 심사'
create or replace function public.handle_new_user() returns trigger as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'seller');
  v_auto boolean;
begin
  select coalesce(seller_auto_approve, false) into v_auto from public.platform_settings where id = 1;
  insert into public.profiles (id, email, name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    v_role,
    case
      when v_role = 'seller' then (case when v_auto then '정상' else '가입 심사' end)
      else '정상'
    end
  );
  return new;
end;
$$ language plpgsql security definer;

-- 확인:
--   select seller_auto_approve, required_docs_count, platform_fee_pct, default_settlement from public.platform_settings where id=1;
