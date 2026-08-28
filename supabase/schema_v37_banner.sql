-- ============================================
-- Festival Hub · Schema v37 · 매장정보 현수막
-- 입점 파트너 현수막 규격·부착 정보(banner) + 위치 사진(banner_photo_url)
-- 재실행 안전.
-- ============================================

alter table public.profiles
  add column if not exists banner text,            -- 현수막 부착 가능 여부·규격(가로/세로/높이)
  add column if not exists banner_photo_url text;   -- 현수막 위치 사진 URL
