-- ============================================
-- Festival Hub · Schema v17 · 행사 주최 명함 정보
-- 주최 가입 허들↓: 명함 정보(소속·직함·연락처) 입력으로 가입 → 즉시 행사 등록.
-- 신원은 명함 정보로 기록되고, 등록 행사는 관리자 검수(review_status) 후 공개 → 운영 안전성.
-- 재실행 안전.
-- ============================================

alter table public.profiles
  add column if not exists position text,            -- 담당자 직함/부서 (명함)
  add column if not exists business_card_url text;   -- (선택) 명함 이미지 storage 경로
