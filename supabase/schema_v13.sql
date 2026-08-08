-- ============================================
-- Festival Hub · Schema v13 · 매출 기록에 비용(순익 계산용)
-- 실행 순서: ... -> v12 -> (이 파일)
-- 셀러가 매출 기록 시 비용을 선택 입력 → 순익 = revenue - cost (가벼운 순익 기록)
-- ============================================

alter table public.sales
  add column if not exists cost integer not null default 0;  -- 재료·인건·기타 비용 합계
