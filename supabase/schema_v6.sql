-- ============================================
-- Festival Hub · Schema v6 · 찜한 행사 + 축제 API·카테고리 운영
-- 실행 순서: schema -> policies -> seed -> v2 -> v3 -> v4 -> v5 -> (이 파일)
-- 추가 범위: favorites(셀러 찜), api_sources(공공 API 연동), category_rules(카테고리 운영)
-- ============================================

-- --------------------------------------------
-- 1. favorites · 셀러가 찜한 행사 (마감 알림 on/off)
-- --------------------------------------------
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  notify boolean not null default true,     -- 마감 사전 알림 수신
  created_at timestamptz default now(),
  unique(seller_id, event_id)
);

create index if not exists idx_favorites_seller on public.favorites(seller_id);

alter table public.favorites enable row level security;

-- 본인 찜만 조회/생성/수정/삭제
drop policy if exists "fav_own" on public.favorites;
create policy "fav_own" on public.favorites
  for all using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

-- --------------------------------------------
-- 2. api_sources · 공공 API 연동 소스 (관리자)
-- --------------------------------------------
create table if not exists public.api_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,        -- tourapi | localgov | seoul
  enabled boolean not null default false,
  cycle text not null default '일 1회',
  last_sync timestamptz,
  count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.api_sources enable row level security;

-- 관리자만 전체 관리, 그 외는 접근 불가
drop policy if exists "api_sources_admin" on public.api_sources;
create policy "api_sources_admin" on public.api_sources
  for all using (public.user_role() = 'admin') with check (public.user_role() = 'admin');

-- --------------------------------------------
-- 3. category_rules · 카테고리 운영 규칙 (관리자)
-- --------------------------------------------
create table if not exists public.category_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,                -- 카테고리명 유니크(중복 시드 방지)
  keywords text[] not null default '{}',   -- 원천 분류 매핑 키워드
  visible boolean not null default true,    -- 셀러 노출 여부
  count integer not null default 0,         -- 매핑된 행사 수 (표시용)
  created_at timestamptz default now()
);

alter table public.category_rules enable row level security;

-- 관리자 전체 관리 + 노출(visible) 규칙은 로그인 사용자 조회 허용
drop policy if exists "cat_admin" on public.category_rules;
create policy "cat_admin" on public.category_rules
  for all using (public.user_role() = 'admin') with check (public.user_role() = 'admin');

drop policy if exists "cat_read_visible" on public.category_rules;
create policy "cat_read_visible" on public.category_rules
  for select using (visible = true or public.user_role() = 'admin');

-- --------------------------------------------
-- 4. 시드
-- --------------------------------------------

-- 4-1. 공공 API 소스 3종 (README 11장 기준)
insert into public.api_sources (name, code, enabled, cycle, last_sync, count) values
  ('한국관광공사 TourAPI (축제/행사)', 'tourapi', true,  '일 1회', now() - interval '5 hours', 1284),
  ('공공데이터포털 지자체 축제',        'localgov', true, '일 1회', now() - interval '1 day',   642),
  ('서울열린데이터광장 문화행사',       'seoul',    false, '일 1회', null,                        0)
on conflict (code) do nothing;

-- 4-2. 카테고리 운영 규칙 (README 6장 category 예시)
insert into public.category_rules (name, keywords, visible, count) values
  ('플리마켓',   array['플리마켓','마켓','벼룩'],       true,  38),
  ('지역축제',   array['축제','페스티벌','문화제'],     true,  71),
  ('야시장',     array['야시장','나이트마켓'],          true,  16),
  ('상시운영',   array['상설','상시','팝업'],           true,  9),
  ('기업행사',   array['임직원','기업','사내'],         true,  5),
  ('종교행사',   array['교회','사찰','법회'],           false, 3)
on conflict (name) do nothing;

-- 4-3. 셀러 데모 계정에 찜 2건 (마감 임박 행사 위주)
insert into public.favorites (seller_id, event_id, notify)
select p.id, e.id, true
from public.profiles p
cross join public.events e
where p.email = 'seller@festival.demo'
  and e.name in ('서울숲 8월 플리마켓', '잠실 대단지 썸머 페스티벌')
on conflict (seller_id, event_id) do nothing;
