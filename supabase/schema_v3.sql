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
