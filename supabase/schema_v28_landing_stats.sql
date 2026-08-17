-- ============================================
-- Festival Hub · Schema v28 · 랜딩/로그인 노출 지표 (관리자 수기 조정)
-- 로그인 화면에 "입점 파트너 수 / 등록 행사 수 / 모집 중" 을 노출.
-- 관리자 설정(admin/settings)에서 직접 수정. 비로그인도 읽기 가능(settings_read_all).
-- 재실행 안전.
-- ============================================
alter table public.platform_settings
  add column if not exists landing_partners  int default 0,
  add column if not exists landing_events     int default 0,
  add column if not exists landing_recruiting int default 0;

-- 초기값(예시) — 관리자 설정에서 실제 수치로 조정하세요
update public.platform_settings
set landing_partners  = coalesce(nullif(landing_partners,0), 0),
    landing_events     = coalesce(nullif(landing_events,0), 0),
    landing_recruiting = coalesce(nullif(landing_recruiting,0), 0)
where id = 1;
