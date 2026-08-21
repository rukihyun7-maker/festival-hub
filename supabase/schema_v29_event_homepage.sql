-- ============================================
-- Festival Hub · Schema v29 · 행사 공식 홈페이지 컬럼
-- 정보형 축제(TourAPI)의 공식 홈페이지 URL 저장. 재실행 안전.
-- ※ 이 SQL을 먼저 실행한 뒤 seed_tourapi_festivals_v2.sql 을 실행하세요.
-- ============================================
alter table public.events
  add column if not exists homepage text;

comment on column public.events.homepage is '정보형 행사 공식 홈페이지 URL (TourAPI detailCommon2)';
