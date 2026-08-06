-- ============================================
-- Festival Hub · 전체 셋업 (5개 파일 순서대로 합침)
-- SQL Editor에 전체 붙여넣고 Run 한 번
-- ============================================

-- ################## schema.sql ##################

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


-- ################## policies.sql ##################

-- ============================================
-- Festival Hub · Row Level Security Policies
-- schema.sql 실행 후 이 파일 실행
-- ============================================

-- RLS 활성화
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.applications enable row level security;
alter table public.menus enable row level security;
alter table public.sales enable row level security;
alter table public.simulations enable row level security;

-- Helper 함수: 현재 사용자의 role 조회
create or replace function public.user_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;

-- 1. profiles 정책
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true); -- 누구나 프로필 조회 가능 (셀러 인사이트 등)

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using (public.user_role() = 'admin');

-- 2. events 정책
drop policy if exists "events_select_all" on public.events;
create policy "events_select_all" on public.events
  for select using (true); -- 누구나 조회 가능

drop policy if exists "events_insert_host" on public.events;
create policy "events_insert_host" on public.events
  for insert with check (
    public.user_role() in ('host', 'admin') and auth.uid() = owner_id
  );

drop policy if exists "events_update_own" on public.events;
create policy "events_update_own" on public.events
  for update using (
    auth.uid() = owner_id or public.user_role() = 'admin'
  );

drop policy if exists "events_delete_own" on public.events;
create policy "events_delete_own" on public.events
  for delete using (
    auth.uid() = owner_id or public.user_role() = 'admin'
  );

-- 3. applications 정책
drop policy if exists "apps_select_related" on public.applications;
create policy "apps_select_related" on public.applications
  for select using (
    auth.uid() = seller_id
    or exists (select 1 from public.events where id = event_id and owner_id = auth.uid())
    or public.user_role() = 'admin'
  );

drop policy if exists "apps_insert_seller" on public.applications;
create policy "apps_insert_seller" on public.applications
  for insert with check (
    public.user_role() = 'seller' and auth.uid() = seller_id
  );

drop policy if exists "apps_update_host_or_seller" on public.applications;
create policy "apps_update_host_or_seller" on public.applications
  for update using (
    auth.uid() = seller_id
    or exists (select 1 from public.events where id = event_id and owner_id = auth.uid())
    or public.user_role() = 'admin'
  );

-- 4. menus 정책 (셀러만 자기 메뉴 관리, 관리자 조회)
drop policy if exists "menus_select_own" on public.menus;
create policy "menus_select_own" on public.menus
  for select using (
    auth.uid() = seller_id or public.user_role() = 'admin'
  );

drop policy if exists "menus_all_own" on public.menus;
create policy "menus_all_own" on public.menus
  for all using (auth.uid() = seller_id);

-- 5. sales 정책
drop policy if exists "sales_select_own_admin" on public.sales;
create policy "sales_select_own_admin" on public.sales
  for select using (
    auth.uid() = seller_id
    or exists (select 1 from public.events where id = event_id and owner_id = auth.uid())
    or public.user_role() = 'admin'
  );

drop policy if exists "sales_all_own" on public.sales;
create policy "sales_all_own" on public.sales
  for all using (auth.uid() = seller_id);

-- 6. simulations 정책 (셀러만 자기 시뮬 관리, 관리자 조회)
drop policy if exists "sims_select_own_admin" on public.simulations;
create policy "sims_select_own_admin" on public.simulations
  for select using (
    auth.uid() = seller_id or public.user_role() = 'admin'
  );

drop policy if exists "sims_all_own" on public.simulations;
create policy "sims_all_own" on public.simulations
  for all using (auth.uid() = seller_id);

-- ============================================
-- RLS 정책 설정 완료
-- 다음 (선택): seed.sql 실행 → 샘플 데이터
-- ============================================


-- ################## seed.sql ##################

-- ============================================
-- Festival Hub · Seed Data v1
-- schema.sql + policies.sql 실행 후 이 파일 실행
-- Supabase SQL Editor(Service Role)에서 실행 필요
-- ============================================

-- ⚠ 주의
-- 이 스크립트는 auth.users에 직접 INSERT합니다.
-- Supabase Dashboard > SQL Editor에서 반드시 실행 (Anon key로는 실행 불가)
-- 또는 3계정을 앱 회원가입으로 만든 뒤, 이 스크립트의 auth.users INSERT 블록을
-- 삭제하고 나머지 UPDATE/INSERT만 실행해도 됩니다.

-- ============================================
-- 0. 기존 시드 데이터 초기화 (재실행 대비)
-- ============================================
delete from public.simulations where seller_id in (
  select id from public.profiles where email like '%@festival.demo'
);
delete from public.sales where seller_id in (
  select id from public.profiles where email like '%@festival.demo'
);
delete from public.menus where seller_id in (
  select id from public.profiles where email like '%@festival.demo'
);
delete from public.applications where seller_id in (
  select id from public.profiles where email like '%@festival.demo'
);
delete from public.events where owner_id in (
  select id from public.profiles where email like '%@festival.demo'
);

-- ============================================
-- 1. 테스트 계정 3개 (auth.users 직접 삽입)
-- ============================================
-- 비밀번호: festival2026 (모두 동일)
-- 해시는 bcrypt(10)로 사전 계산. Supabase auth는 gotrue-js 방식 준용.

do $$
declare
  v_seller_id uuid := '00000000-0000-4000-8000-000000000001';
  v_host_id uuid := '00000000-0000-4000-8000-000000000002';
  v_admin_id uuid := '00000000-0000-4000-8000-000000000003';
begin
  -- 셀러
  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
  values (
    v_seller_id,
    '00000000-0000-0000-0000-000000000000',
    'seller@festival.demo',
    crypt('festival2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"홍길동","role":"seller"}',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  on conflict (id) do update set encrypted_password = excluded.encrypted_password;

  -- 주최사
  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
  values (
    v_host_id,
    '00000000-0000-0000-0000-000000000000',
    'host@festival.demo',
    crypt('festival2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"성동구청","role":"host"}',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  on conflict (id) do update set encrypted_password = excluded.encrypted_password;

  -- 관리자
  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
  values (
    v_admin_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@festival.demo',
    crypt('festival2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"플랫폼 관리자","role":"admin"}',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  on conflict (id) do update set encrypted_password = excluded.encrypted_password;

  -- profiles 보강 (트리거로 생성되지만 상세 필드는 여기서 채움)
  insert into public.profiles (id, email, name, role, business_name, region, category, phone, intro)
  values (
    v_seller_id,
    'seller@festival.demo',
    '홍길동',
    'seller',
    '트럭펀트',
    '서울',
    '푸드트럭',
    '010-1234-5678',
    '수제 떡볶이와 순대 전문. 3년차 푸드트럭 사업자.'
  )
  on conflict (id) do update set
    business_name = excluded.business_name,
    region = excluded.region,
    category = excluded.category,
    phone = excluded.phone,
    intro = excluded.intro;

  insert into public.profiles (id, email, name, role, business_name, region, phone)
  values (
    v_host_id,
    'host@festival.demo',
    '성동구청',
    'host',
    '성동구청 문화체육과',
    '서울',
    '02-2286-0000'
  )
  on conflict (id) do update set
    business_name = excluded.business_name,
    region = excluded.region,
    phone = excluded.phone;

  insert into public.profiles (id, email, name, role)
  values (v_admin_id, 'admin@festival.demo', '플랫폼 관리자', 'admin')
  on conflict (id) do update set role = excluded.role;
end $$;

-- ============================================
-- 2. Events (호스트 소유 8건)
-- ============================================
insert into public.events (id, owner_id, name, category, organizer, start_date, end_date, region, address, visitors, capacity, fee, fee_rate, deadline, electric, water, gas, parking, description, contact, phone, status)
values
  ('11111111-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002',
   '서울숲 8월 플리마켓', '플리마켓', '성동구청 문화체육과',
   '2026-08-15', '2026-08-17', '서울', '서울 성동구 뚝섬로 273 · 서울숲 문화광장',
   '일 평균 20,000명', '20자리', 150000, 0, '2026-08-08',
   true, true, false, false,
   '성동구 서울숲 일대에서 열리는 여름 플리마켓. 유동인구 일 평균 2만명, 야외 푸드트럭 존 20자리 운영.',
   '문화체육과 김주무관', '02-2286-1234', 'open'),

  ('11111111-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002',
   '2026 강릉 커피축제', '축제', '강릉시청 관광과',
   '2026-09-05', '2026-09-08', '강원', '강원 강릉시 창해로 14번길 20 · 안목해변',
   '일 평균 35,000명', '15자리', 220000, 5.0, '2026-08-15',
   true, true, false, true,
   '강릉 안목해변 일대 4일간 열리는 커피축제. 커피 관련 셀러 우대.',
   '관광과 이주무관', '033-640-4000', 'open'),

  ('11111111-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002',
   '잠실 대단지 썸머 페스티벌', '축제', '송파구청',
   '2026-08-22', '2026-08-24', '서울', '서울 송파구 올림픽로 240 · 롯데월드타워 광장',
   '일 평균 40,000명', '30자리', 180000, 0, '2026-08-11',
   true, true, true, false,
   '잠실 대단지 주민 대상 여름 축제. F&B 30자리.',
   '문화관광과', '02-2147-2000', 'open'),

  ('11111111-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000002',
   '괴산 고추축제 (사전 등록)', '지역축제', '괴산군청',
   '2026-09-20', '2026-09-22', '충북', '충북 괴산군 괴산읍 · 임꺽정로 일대',
   '일 평균 12,000명', '공고 예정', 0, 0, null,
   true, true, false, true,
   '괴산 고추축제 셀러 사전 알림. 정식 공고는 8월 말 예정.',
   '축제사무국', '043-830-3000', 'upcoming'),

  ('11111111-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000002',
   '현대백화점 판교점 F&B 팝업', '팝업', '현대백화점 판교점 MD팀',
   '2026-08-28', '2026-09-03', '경기', '경기 성남시 분당구 판교역로 146번길 20',
   '일 평균 18,000명', '8자리', 300000, 8.0, '2026-08-13',
   true, true, true, true,
   '현대백화점 판교점 야외 광장 F&B 팝업 7일간.',
   'MD팀', '031-5170-2000', 'open'),

  ('11111111-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000002',
   'CJ 임직원 감사 페스티벌', '기업행사', 'CJ그룹 인사팀',
   '2026-09-12', '2026-09-12', '서울', '서울 중구 동호로 330 · CJ타운',
   '5,000명 (사내)', '12자리', 250000, 0, '2026-08-20',
   true, true, false, true,
   'CJ그룹 임직원 대상 하루 페스티벌. 사전 예약 결제.',
   '인사팀 복리후생', '02-6740-0000', 'open'),

  ('11111111-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000002',
   '세종대 해오름제', '대학축제', '세종대학교 총학생회',
   '2026-09-25', '2026-09-27', '서울', '서울 광진구 능동로 209 · 세종대 캠퍼스',
   '일 평균 8,000명', '공고 예정', 0, 0, null,
   true, false, false, false,
   '세종대 대동제. 학내 F&B 부스 신청 알림.',
   '총학생회 문화국', '02-3408-3114', 'upcoming'),

  ('11111111-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000002',
   '한강 몽땅 여름축제', '축제', '서울시 한강사업본부',
   '2026-08-10', '2026-08-20', '서울', '서울 영등포구 여의동로 330 · 여의도한강공원',
   '일 평균 50,000명', '40자리', 200000, 0, '2026-08-06',
   true, true, true, true,
   '서울시 한강 여름 대표 축제 11일간. 여의도 한강공원.',
   '한강사업본부', '02-3780-0800', 'open')

on conflict (id) do nothing;

-- ============================================
-- 3. Applications (셀러가 여러 행사에 신청)
-- ============================================
insert into public.applications (id, event_id, seller_id, status, applied_at)
values
  -- 서울숲 8월 (승인 대기)
  ('22222222-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000001',
   'pending', now() - interval '2 days'),
  -- 강릉 커피축제 (승인 대기)
  ('22222222-0000-4000-8000-000000000002',
   '11111111-0000-4000-8000-000000000002',
   '00000000-0000-4000-8000-000000000001',
   'pending', now() - interval '5 days'),
  -- 한강 몽땅 (승인 완료 · 진행 예정)
  ('22222222-0000-4000-8000-000000000003',
   '11111111-0000-4000-8000-000000000008',
   '00000000-0000-4000-8000-000000000001',
   'approved', now() - interval '10 days')
on conflict (id) do nothing;

update public.applications
set reviewed_by = '00000000-0000-4000-8000-000000000002',
    reviewed_at = now() - interval '9 days',
    memo = '검증 완료 · QR 발급 예정'
where id = '22222222-0000-4000-8000-000000000003';

-- ============================================
-- 4. Menus (셀러 등록 메뉴 4개)
-- ============================================
insert into public.menus (id, seller_id, name, price, cost, category)
values
  ('33333333-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '치즈 떡볶이', 8000, 2800, 'MAIN'),
  ('33333333-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '오리지널 떡볶이', 6000, 2100, 'MAIN'),
  ('33333333-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', '순대 세트', 7500, 2600, 'SIDE'),
  ('33333333-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', '튀김 모듬', 5500, 1900, 'SIDE')
on conflict (id) do nothing;

-- ============================================
-- 5. Sales (과거 매출 이력 3건 · 완료된 행사들)
-- ============================================
-- 과거 참여를 위한 가상 행사 3건 (완료 상태)
insert into public.events (id, owner_id, name, category, organizer, start_date, end_date, region, address, fee, fee_rate, status)
values
  ('11111111-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000002',
   '한강 몽땅 여름축제 (7월)', '축제', '서울시 한강사업본부',
   '2026-07-18', '2026-07-20', '서울', '서울 여의도한강공원',
   200000, 0, 'close'),
  ('11111111-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000002',
   '서초구 청년 팝업스토어', '팝업', '서초구청',
   '2026-07-05', '2026-07-05', '서울', '서울 서초구 강남대로 27',
   180000, 0, 'close'),
  ('11111111-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000002',
   '건대 로데오 야시장', '야시장', '광진구청',
   '2026-06-22', '2026-06-23', '서울', '서울 광진구 자양로 235',
   150000, 3.0, 'close')
on conflict (id) do nothing;

insert into public.sales (seller_id, event_id, orders, revenue, note, recorded_at)
values
  ('00000000-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000101', 165, 1240000, '3일 합계 · QR 82%', '2026-07-21'),
  ('00000000-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000102', 52, 385000, '1일 · 팝업스토어 컬래버', '2026-07-06'),
  ('00000000-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000103', 96, 720000, '2일 · 야시장 저녁 피크', '2026-06-24')
on conflict do nothing;

-- ============================================
-- 6. Simulations (셀러 시뮬레이션 이력 1건)
-- ============================================
insert into public.simulations (seller_id, event_id, event_name, input, result, saved_at)
values (
  '00000000-0000-4000-8000-000000000001',
  '11111111-0000-4000-8000-000000000001',
  '서울숲 8월 플리마켓',
  '{"days":3,"avg_order":7500,"orders_per_day":120,"material_rate":35,"fixed_fee":150000,"sales_fee_rate":0,"other_cost":80000}',
  '{"low":{"revenue":1485000,"profit":205250,"margin":13.8},"base":{"revenue":2700000,"profit":825000,"margin":30.6},"high":{"revenue":4050000,"profit":1552500,"margin":38.3}}',
  now() - interval '3 days'
)
on conflict do nothing;

-- ============================================
-- 시드 완료
-- 로그인 계정
--   셀러:   seller@festival.demo / festival2026
--   주최사: host@festival.demo   / festival2026
--   관리자: admin@festival.demo  / festival2026
-- ============================================


-- ################## schema_v2_documents.sql ##################

-- ============================================
-- Festival Hub · Schema v2 · Documents
-- schema.sql + policies.sql + seed.sql 실행 후 이 파일 실행
-- 셀러 필수 서류 5종 관리
-- ============================================

-- 1. documents 테이블
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in (
    'business_reg',   -- 사업자등록증
    'food_hygiene',   -- 식품위생업 신고증
    'insurance',      -- 영업배상책임보험
    'hygiene_edu',    -- 위생교육 이수증
    'vehicle_reg'     -- 차량등록증 (푸드트럭)
  )),
  file_url text,           -- Supabase Storage 경로 (nullable · 목업 단계)
  file_name text,          -- 원본 파일명
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected', 'expired')),
  expires_at date,         -- 만료일 (보험/위생교육/차량등록증만 유효)
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  memo text,               -- 반려 사유 또는 관리자 메모
  uploaded_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(seller_id, kind)  -- 셀러당 서류 종류별 1건
);

create index if not exists idx_documents_seller on public.documents(seller_id);
create index if not exists idx_documents_status on public.documents(status);
create index if not exists idx_documents_expires on public.documents(expires_at) where expires_at is not null;

-- 2. updated_at 트리거
drop trigger if exists trg_documents_updated on public.documents;
create trigger trg_documents_updated before update on public.documents
  for each row execute function public.set_updated_at();

-- 3. RLS
alter table public.documents enable row level security;

-- 셀러: 본인 서류만 · 관리자: 전체
drop policy if exists "docs_select_own_admin" on public.documents;
create policy "docs_select_own_admin" on public.documents
  for select using (
    auth.uid() = seller_id or public.user_role() = 'admin'
  );

-- 셀러: 본인 서류 CRUD
drop policy if exists "docs_all_own" on public.documents;
create policy "docs_all_own" on public.documents
  for all using (auth.uid() = seller_id);

-- 관리자: 검증 승인/거절 (update만)
drop policy if exists "docs_admin_update" on public.documents;
create policy "docs_admin_update" on public.documents
  for update using (public.user_role() = 'admin');

-- 4. 시드 · 홍길동 셀러의 서류 5종
-- (schema.sql 시드에서 만든 셀러 계정 UUID 사용)
insert into public.documents (seller_id, kind, file_name, status, expires_at, uploaded_at, reviewed_at)
values
  ('00000000-0000-4000-8000-000000000001', 'business_reg', '사업자등록증_트럭펀트.pdf', 'verified', null, now() - interval '60 days', now() - interval '55 days'),
  ('00000000-0000-4000-8000-000000000001', 'food_hygiene', '식품위생업신고증_트럭펀트.pdf', 'verified', null, now() - interval '60 days', now() - interval '55 days'),
  ('00000000-0000-4000-8000-000000000001', 'insurance', '영업배상책임보험_2026.pdf', 'verified', current_date + interval '7 days', now() - interval '355 days', now() - interval '350 days'),
  ('00000000-0000-4000-8000-000000000001', 'hygiene_edu', '위생교육이수증_2026.pdf', 'verified', current_date + interval '150 days', now() - interval '210 days', now() - interval '205 days'),
  ('00000000-0000-4000-8000-000000000001', 'vehicle_reg', '차량등록증_2020모하비.pdf', 'pending', current_date + interval '365 days', now() - interval '2 days', null)
on conflict (seller_id, kind) do update set
  status = excluded.status,
  expires_at = excluded.expires_at;

-- 5. 만료 임박 자동 감지 헬퍼 뷰
create or replace view public.documents_with_urgency as
select
  d.*,
  case
    when d.status = 'rejected' then 'rejected'
    when d.expires_at is not null and d.expires_at < current_date then 'expired'
    when d.expires_at is not null and d.expires_at < current_date + interval '14 days' then 'expiring'
    when d.status = 'verified' then 'verified'
    when d.status = 'pending' then 'pending'
    else 'unknown'
  end as urgency
from public.documents d;

-- ============================================
-- v2 완료
-- 로그인 후 /seller/documents 접속 · 5종 서류 확인
-- ============================================


-- ################## schema_v3.sql ##################

-- ============================================
-- Festival Hub · Schema v3 · 운영 테스트 대비 확장
-- 실행 순서: schema.sql -> policies.sql -> seed.sql -> schema_v2_documents.sql -> (이 파일)
-- 추가 범위: 평가 / 알림 / 개별 지급 정산 / 공개 설정 / 플랫폼 정책
--            + profiles / events / menus 컬럼 보강
-- 결제(PG)는 이번 범위 제외. 정산은 운영형 개별 지급(상태 기록)으로 처리.
-- ============================================

-- --------------------------------------------
-- 0. profiles 보강: 소속, 위생 착용 운영, 주최사 공개 설정
-- --------------------------------------------
alter table public.profiles
  add column if not exists affiliation text,            -- 소속 단체/협동조합 (없으면 '개인 운영')
  add column if not exists hygiene_gear text,           -- 마스크/모자 등 착용 운영 여부/내용
  add column if not exists share_flags jsonb not null default '{}'::jsonb;
-- share_flags 예시 키: sales_revenue, sales_count, biz_no, phone, vehicle, hygiene_gear ...
-- 값이 없으면 기본 공개(true)로 간주하도록 앱단에서 처리

-- --------------------------------------------
-- 1. events 보강: 신청형/정보형 구분 + 정보형 출처
-- --------------------------------------------
alter table public.events
  add column if not exists kind text not null default 'apply' check (kind in ('apply', 'info')),
  add column if not exists source text;                 -- 정보형(info) 출처 (공공 API 등)

create index if not exists idx_events_kind on public.events(kind);

-- --------------------------------------------
-- 2. menus 보강: 설명 / 대표 메뉴 / 사진
-- --------------------------------------------
alter table public.menus
  add column if not exists description text,
  add column if not exists signature boolean not null default false,
  add column if not exists image_url text;

-- --------------------------------------------
-- 3. ratings · 주최사 -> 셀러 평가
-- --------------------------------------------
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  hygiene smallint not null check (hygiene between 1 and 5),   -- 위생 관리
  punctual smallint not null check (punctual between 1 and 5), -- 시간 준수
  service smallint not null check (service between 1 and 5),   -- 고객 응대
  comment text,
  created_at timestamptz default now(),
  unique(seller_id, host_id, event_id)
);

create index if not exists idx_ratings_seller on public.ratings(seller_id);
create index if not exists idx_ratings_host on public.ratings(host_id);

alter table public.ratings enable row level security;

-- 셀러 본인 / 관련 주최사 / 관리자 조회
drop policy if exists "ratings_select" on public.ratings;
create policy "ratings_select" on public.ratings
  for select using (
    auth.uid() = seller_id or auth.uid() = host_id or public.user_role() = 'admin'
  );

-- 주최사만 평가 작성 (본인이 host_id)
drop policy if exists "ratings_insert_host" on public.ratings;
create policy "ratings_insert_host" on public.ratings
  for insert with check (auth.uid() = host_id and public.user_role() = 'host');

-- 관리자: 부적절 평가 삭제
drop policy if exists "ratings_delete_admin" on public.ratings;
create policy "ratings_delete_admin" on public.ratings
  for delete using (public.user_role() = 'admin');

-- 셀러 평균 평점 뷰 (관리자 정책의 최소 공개 수는 앱단에서 반영)
create or replace view public.seller_rating_summary as
select
  seller_id,
  count(*) as review_count,
  round(avg((hygiene + punctual + service) / 3.0)::numeric, 1) as avg_score
from public.ratings
group by seller_id;

-- --------------------------------------------
-- 4. notifications · 알림함 (앱 내 알림 / 이메일 발송 트리거)
-- --------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('deadline', 'review', 'docs', 'new_event', 'settlement')),
  title text not null,
  body text,
  event_id uuid references public.events(id) on delete set null,
  read boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id, read);

alter table public.notifications enable row level security;

drop policy if exists "notif_own" on public.notifications;
create policy "notif_own" on public.notifications
  for all using (auth.uid() = user_id);

-- 알림 설정 (마감 며칠 전 / 채널 / 종류) — 프로필에 jsonb로 보관
alter table public.profiles
  add column if not exists notif_prefs jsonb not null default
    '{"days":3,"app":true,"email":true,"deadline":true,"review":true,"docs":true,"new_event":false}'::jsonb;

-- --------------------------------------------
-- 5. settlements · 주최사 개별 지급 정산 (PG 없이 운영형)
-- --------------------------------------------
create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  sales_id uuid references public.sales(id) on delete set null, -- 셀러 신고 매출 연결
  sales_amount integer not null default 0,   -- 셀러 신고 매출
  payout integer not null default 0,         -- 주최사 지급 예정액
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  memo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_settlements_host on public.settlements(host_id, status);
create index if not exists idx_settlements_seller on public.settlements(seller_id);

drop trigger if exists trg_settlements_updated on public.settlements;
create trigger trg_settlements_updated before update on public.settlements
  for each row execute function public.set_updated_at();

alter table public.settlements enable row level security;

-- 관련 주최사 / 대상 셀러 / 관리자 조회
drop policy if exists "settle_select" on public.settlements;
create policy "settle_select" on public.settlements
  for select using (
    auth.uid() = host_id or auth.uid() = seller_id or public.user_role() = 'admin'
  );

-- 주최사: 본인 행사 정산 생성/수정(지급 완료 처리)
drop policy if exists "settle_write_host" on public.settlements;
create policy "settle_write_host" on public.settlements
  for all using (auth.uid() = host_id and public.user_role() in ('host', 'admin'));

-- --------------------------------------------
-- 6. platform_settings · 평점 정책 (싱글턴 1행)
-- --------------------------------------------
create table if not exists public.platform_settings (
  id smallint primary key default 1 check (id = 1),
  host_rating boolean not null default true,       -- 주최사 평점 부여 허용
  seller_visible boolean not null default true,    -- 셀러에게 평점 노출
  show_comments boolean not null default true,     -- 코멘트 공개
  appeal boolean not null default true,            -- 이의제기 허용
  public_scope text not null default '전체 공개' check (public_scope in ('전체 공개', '주최사에게만', '비공개')),
  min_reviews smallint not null default 2,         -- 공개 최소 평가 수
  updated_at timestamptz default now()
);

insert into public.platform_settings (id) values (1) on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

drop policy if exists "settings_read_all" on public.platform_settings;
create policy "settings_read_all" on public.platform_settings
  for select using (true);

drop policy if exists "settings_write_admin" on public.platform_settings;
create policy "settings_write_admin" on public.platform_settings
  for update using (public.user_role() = 'admin');

-- --------------------------------------------
-- 7. (선택) documents 종류 재조정
--     현재: business_reg / food_hygiene / insurance / hygiene_edu / vehicle_reg
--     프로토타입 반영 시 검토: 보건증(health_cert), 부스/트럭 사진(booth_photo) 추가 여부
--     기존 데이터/앱과 충돌 가능하므로 결정 후 아래 블록 활성화.
-- --------------------------------------------
-- alter table public.documents drop constraint if exists documents_kind_check;
-- alter table public.documents add constraint documents_kind_check
--   check (kind in ('business_reg','food_hygiene','insurance','hygiene_edu','vehicle_reg','health_cert','booth_photo'));

-- ============================================
-- v3 완료
-- 다음: src/lib/types.ts 반영 -> queries.ts 헬퍼 -> 각 페이지 순서 (CLAUDE.md 규칙)
-- ============================================

