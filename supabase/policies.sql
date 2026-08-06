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
