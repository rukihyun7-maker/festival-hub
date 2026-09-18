-- ============================================
-- Festival Hub · Schema v50 · 내 창고(재고 관리) · 입점 파트너 전용
--  · inventory_items: 품목 마스터 (창고재고 / 현장(출고)재고 2버킷)
--  · inventory_moves: 입출고 이력 (in 입고 / out 출고 / settle 종료정산 / adjust 조정)
--  · 본인만 접근(RLS) — 비공개 개인 도구
-- 재실행 안전.
-- ============================================

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  image_url text,
  spec text,                       -- 규격(용량·사이즈 등)
  unit text not null default '개', -- 단위(개/박스/kg…)
  warehouse_qty integer not null default 0, -- 창고 재고
  out_qty integer not null default 0,       -- 현장(출고) 재고
  min_qty integer not null default 0,       -- 최소재고(재발주점)
  purchase_price integer,          -- 구매 단가(선택)
  purchase_url text,               -- 구매처 링크
  memo text,                       -- 비고
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_inventory_items_seller on public.inventory_items(seller_id, created_at desc);

create table if not exists public.inventory_moves (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  type text not null,              -- in | out | settle | adjust
  qty integer not null default 0,  -- settle의 qty = 소진량(출고−잔여)
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_inventory_moves_item on public.inventory_moves(item_id, created_at desc);

alter table public.inventory_items enable row level security;
alter table public.inventory_moves enable row level security;

drop policy if exists inv_items_own on public.inventory_items;
create policy inv_items_own on public.inventory_items
  for all using (seller_id = auth.uid()) with check (seller_id = auth.uid());

drop policy if exists inv_moves_own on public.inventory_moves;
create policy inv_moves_own on public.inventory_moves
  for all using (seller_id = auth.uid()) with check (seller_id = auth.uid());
