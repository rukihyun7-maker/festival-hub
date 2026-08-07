-- ============================================
-- Festival Hub · Schema v10 · 매장 정보 필드 보강 (마이페이지 06 대응)
-- 실행 순서: ... -> v9 -> (이 파일)
-- 추가: 차량·부스 규격 / 전기 / 조리 설비 / 운영 인원 / SNS
--       (상호=business_name, 대표자=name, 사업자번호=business_no, 연락처=phone,
--        소속=affiliation, 위생=hygiene_gear, 소개=intro 는 기존 컬럼 사용)
-- ============================================

alter table public.profiles
  add column if not exists vehicle text,   -- 차량·부스 규격 (예: 3.5t 개조 푸드트럭 · 5.2×2.1m)
  add column if not exists power text,      -- 전기 사용량 (예: 3kW · 자체 발전기 보유)
  add column if not exists cooking text,    -- 조리 설비 (예: 가스 2구 + 전기 튀김기 1대)
  add column if not exists crew text,       -- 운영 인원 (예: 상시 2명, 주말 3명)
  add column if not exists sns text;        -- SNS (예: @minji_bunsik · 팔로워 8,400)
