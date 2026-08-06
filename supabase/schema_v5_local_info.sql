-- ============================================
-- Festival Hub · Schema v5 · Local Info
-- 인근지역 정보 (아파트·대학·축제·상권)
-- 실행 순서: ... schema_v4.sql 다음
-- ============================================

-- events에 위경도 추가 (지오코딩 결과)
alter table public.events
  add column if not exists lat numeric(9,6),
  add column if not exists lng numeric(9,6),
  add column if not exists geocoded_at timestamptz;

create index if not exists idx_events_geo on public.events(lat, lng) where lat is not null;

-- 인근 지역 정보 통합 테이블 (다형)
create table if not exists public.local_info (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('apartment', 'university', 'festival', 'commercial', 'transit')),
  external_id text,        -- 원본 시스템 식별자 (중복 방지용, 예: 국토부 단지고유번호)
  name text not null,
  region text not null,
  address text,
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  data jsonb not null default '{}'::jsonb,  -- category별 자유 필드
  source text not null,     -- 'molit' | 'seoul' | 'academyinfo' | 'manual' | 'crawler'
  synced_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(category, external_id, source)
);

create index if not exists idx_local_info_region on public.local_info(region);
create index if not exists idx_local_info_category on public.local_info(category);
create index if not exists idx_local_info_geo on public.local_info(lat, lng);

-- 이벤트-지역 매칭 캐시 (반경 조회 결과 저장)
create table if not exists public.event_nearby (
  event_id uuid references public.events(id) on delete cascade,
  local_info_id uuid references public.local_info(id) on delete cascade,
  distance_m integer not null,
  primary key (event_id, local_info_id)
);

create index if not exists idx_event_nearby_event on public.event_nearby(event_id);

-- updated_at 자동 갱신
drop trigger if exists trg_local_info_updated on public.local_info;
create trigger trg_local_info_updated before update on public.local_info
  for each row execute function public.set_updated_at();

-- RLS · 조회는 전체 공개, 쓰기는 admin만
alter table public.local_info enable row level security;
alter table public.event_nearby enable row level security;

drop policy if exists "local_info_select_all" on public.local_info;
create policy "local_info_select_all" on public.local_info
  for select using (true);

drop policy if exists "local_info_admin_write" on public.local_info;
create policy "local_info_admin_write" on public.local_info
  for all using (public.user_role() = 'admin');

drop policy if exists "event_nearby_select_all" on public.event_nearby;
create policy "event_nearby_select_all" on public.event_nearby
  for select using (true);

drop policy if exists "event_nearby_admin_write" on public.event_nearby;
create policy "event_nearby_admin_write" on public.event_nearby
  for all using (public.user_role() = 'admin');

-- 반경 조회 함수 (m 단위 · Haversine 근사)
create or replace function public.find_nearby(
  event_lat numeric,
  event_lng numeric,
  radius_m integer default 1000
) returns table (
  id uuid,
  category text,
  name text,
  distance_m integer,
  data jsonb
) as $$
  select
    li.id,
    li.category,
    li.name,
    (6371000 * acos(
      cos(radians(event_lat)) * cos(radians(li.lat)) *
      cos(radians(li.lng) - radians(event_lng)) +
      sin(radians(event_lat)) * sin(radians(li.lat))
    ))::integer as distance_m,
    li.data
  from public.local_info li
  where (6371000 * acos(
      cos(radians(event_lat)) * cos(radians(li.lat)) *
      cos(radians(li.lng) - radians(event_lng)) +
      sin(radians(event_lat)) * sin(radians(li.lat))
    )) < radius_m
  order by distance_m
$$ language sql stable;

-- ============================================
-- v5 완료 (Phase A)
-- 다음: types.ts (LocalInfo·NearbyRow·ApartmentData 등) → queries.ts (fetchNearby·upsertLocalInfo)
--       실 데이터는 Phase B~D 스크립트(카카오·국토부·대학알리미 키 발급 후)
-- ============================================
