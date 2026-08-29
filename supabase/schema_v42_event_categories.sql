-- ============================================
-- Festival Hub · Schema v42 · 행사 카테고리 관리
-- 관리자가 행사 카테고리(순서·내용)를 편집 → platform_settings.event_categories
-- 재실행 안전.
-- ============================================

alter table public.platform_settings
  add column if not exists event_categories jsonb not null
  default '["플리마켓","축제","팝업","지역축제","기업행사","대학축제","야시장"]'::jsonb;
