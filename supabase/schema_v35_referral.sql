-- ============================================
-- Festival Hub · Schema v35 · 추천인 코드 + 포인트
-- 승인(정상 전환) 시 추천코드 발급 + 피추천인 승인 시 추천인에게 10p 지급(1회).
-- handle_new_user는 v34(메타데이터 저장)를 포함해 재정의 + 추천인코드 해석(referred_by).
-- 재실행 안전. (이 파일 실행 시 v34는 별도 실행 불필요 — 여기 포함됨)
-- ============================================

alter table public.profiles
  add column if not exists referral_code text unique,
  add column if not exists points integer not null default 0,
  add column if not exists referred_by uuid references public.profiles(id),
  add column if not exists referral_awarded boolean not null default false;

-- 짧고 고유한 추천 코드 생성
create or replace function public.gen_referral_code() returns text as $$
declare c text;
begin
  loop
    c := upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.profiles where referral_code = c);
  end loop;
  return c;
end;
$$ language plpgsql;

-- 가입 트리거 (메타데이터 저장 + 가입심사 상태 + 추천인 코드 해석)
create or replace function public.handle_new_user() returns trigger as $$
declare
  m jsonb := new.raw_user_meta_data;
  v_role text := coalesce(m->>'role', 'seller');
  v_seller_auto boolean;
  v_host_auto boolean;
  v_ref uuid;
begin
  select coalesce(seller_auto_approve, false), coalesce(host_auto_approve, false)
    into v_seller_auto, v_host_auto
    from public.platform_settings where id = 1;

  -- 추천 코드 → 추천인 id (있을 때만)
  if nullif(m->>'referrer_code', '') is not null then
    select id into v_ref from public.profiles
      where referral_code = upper(m->>'referrer_code') limit 1;
  end if;

  insert into public.profiles (id, email, name, role, status, business_no, business_name, position, phone, referred_by)
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
    nullif(m->>'phone', ''),
    v_ref
  );
  return new;
end;
$$ language plpgsql security definer;

-- 승인(정상 전환) 시: 추천코드 발급 + 추천인 포인트 지급(1회)
create or replace function public.on_profile_approved() returns trigger as $$
begin
  if new.status = '정상' and (old.status is distinct from '정상') then
    if new.referral_code is null then
      new.referral_code := public.gen_referral_code();
    end if;
    if new.referred_by is not null and not new.referral_awarded then
      update public.profiles set points = points + 10 where id = new.referred_by;
      new.referral_awarded := true;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_profile_approved on public.profiles;
create trigger trg_profile_approved before update on public.profiles
  for each row execute function public.on_profile_approved();

-- 기존 '정상' 계정에도 추천코드 소급 발급 (없으면)
update public.profiles set referral_code = public.gen_referral_code()
  where status = '정상' and referral_code is null;
