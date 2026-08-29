-- ============================================
-- Festival Hub · Schema v41 · 운영 요일
-- 행사 기간 중 특정 요일만 운영하는 경우 (예: 9/1~9/30 중 매주 금·토·일).
-- operating_days: ["금","토","일"] · 비우면 기간 내 매일(연속) 운영.
-- 재실행 안전.
-- ============================================

alter table public.events
  add column if not exists operating_days jsonb not null default '[]'::jsonb;
