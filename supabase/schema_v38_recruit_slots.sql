-- ============================================
-- Festival Hub · Schema v38 · 부문별 모집
-- 한 행사에서 여러 부문(플리마켓·푸드트럭·음식부스 등)을 각각 다른 모집 수로 모집.
-- events.recruit_slots: [{ "type": "푸드트럭", "count": 10 }, ...]
-- applications.slot_type: 신청한 부문
-- 재실행 안전.
-- ============================================

alter table public.events
  add column if not exists recruit_slots jsonb not null default '[]'::jsonb;

alter table public.applications
  add column if not exists slot_type text;
