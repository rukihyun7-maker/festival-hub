-- ============================================
-- Festival Hub · Schema v49 · 현수막 위치별 다중 등록
--  · profiles.banners jsonb: [{label, w, h, d, photo_url}] (위치별 규격·사진)
--  · 기존 banner(text)/banner_photo_url은 하위호환 유지(요약·대표사진)
-- 재실행 안전.
-- ============================================

alter table public.profiles
  add column if not exists banners jsonb not null default '[]'::jsonb;
