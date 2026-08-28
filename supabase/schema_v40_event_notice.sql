-- ============================================
-- Festival Hub · Schema v40 · 행사 모집공고문
-- 주최(특히 지자체)가 공식 모집공고문 파일을 업로드 → 입점 파트너가 열람.
-- notice_url: 공개 URL (menu-photos 버킷 재사용) · notice_name: 원본 파일명
-- 재실행 안전.
-- ============================================

alter table public.events
  add column if not exists notice_url text,
  add column if not exists notice_name text;
