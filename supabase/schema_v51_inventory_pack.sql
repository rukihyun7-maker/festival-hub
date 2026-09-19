-- ============================================
-- Festival Hub · Schema v51 · 창고 박스/낱개 환산
--  · base_unit: 낱개 단위(개), pack_size: 1묶음당 낱개 수(예: 1박스=20개)
--  · 수량(warehouse_qty/out_qty/min_qty/이력 qty)은 모두 '낱개' 기준으로 저장
--  · unit = 묶음 단위 이름(박스/봉…) · pack_size>1이면 "N박스 M개"로 표시
-- 재실행 안전.
-- ============================================

alter table public.inventory_items
  add column if not exists base_unit text not null default '개';
alter table public.inventory_items
  add column if not exists pack_size integer not null default 1;
