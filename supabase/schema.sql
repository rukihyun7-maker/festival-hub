-- ============================================
-- Festival Hub · Database Schema v1
-- Supabase SQL Editor에서 그대로 실행
-- ============================================

-- 1. 사용자 프로필 (auth.users 연결)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null check (role in ('seller', 'host', 'admin')),
  -- 셀러 전용 필드
  business_name text,
  business_no text,
  region text,
  category text,
  phone text,
  intro text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_region on public.profiles(region);

-- 2. 행사
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text not null,
  organizer text not null,
  start_date date not null,
  end_date date not null,
  region text not null,
  address text not null,
  visitors text,
  capacity text,
  fee integer default 0,
  fee_rate numeric(4,2) default 0, -- 매출 수수료 %
  deadline date,
  electric boolean default false,
  water boolean default false,
  gas boolean default false,
  parking boolean default false,
  description text,
  contact text,
  phone text,
  status text default 'open' check (status in ('open', 'upcoming', 'close', 'canceled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_events_owner on public.events(owner_id);
create index if not exists idx_events_category on public.events(category);
create index if not exists idx_events_region on public.events(region);
create index if not exists idx_events_dates on public.events(start_date, end_date);

-- 3. 신청 (셀러 → 행사)
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'canceled')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  memo text,
  applied_at timestamptz default now(),
  unique(event_id, seller_id)
);

create index if not exists idx_applications_seller on public.applications(seller_id);
create index if not exists idx_applications_event on public.applications(event_id);
create index if not exists idx_applications_status on public.applications(status);

-- 4. 셀러 판매 메뉴
create table if not exists public.menus (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  price integer not null,
  cost integer default 0,
  category text default 'MAIN' check (category in ('MAIN', 'SIDE', 'DRINK', 'SET')),
  created_at timestamptz default now()
);

create index if not exists idx_menus_seller on public.menus(seller_id);

-- 5. 매출 기록 (셀러가 참여 후 기록)
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  orders integer not null,
  revenue integer not null,
  note text,
  recorded_at timestamptz default now()
);

create index if not exists idx_sales_seller on public.sales(seller_id);
create index if not exists idx_sales_event on public.sales(event_id);

-- 6. 손익 시뮬레이션 저장
create table if not exists public.simulations (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  event_name text,
  input jsonb not null, -- 입력 파라미터 (메뉴·비용·판매수 등)
  result jsonb not null, -- 3시나리오 계산 결과
  saved_at timestamptz default now()
);

create index if not exists idx_simulations_seller on public.simulations(seller_id);

-- 7. updated_at 자동 갱신 트리거
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_events_updated on public.events;
create trigger trg_events_updated before update on public.events
  for each row execute function public.set_updated_at();

-- 8. 회원가입 시 자동 프로필 생성 트리거
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'seller')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- 스키마 실행 완료
-- 다음: policies.sql 실행 (Row Level Security)
-- ============================================
