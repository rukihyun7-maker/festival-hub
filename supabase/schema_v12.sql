-- ============================================
-- Festival Hub · Schema v12 · 정산 주기 / 결제 방식 등록값
-- 실행 순서: ... -> v11 -> (이 파일)
-- QR결제 필수 아님 → 주최/관리자가 등록 시 입력한 값을 상세에 노출
-- ============================================

alter table public.events
  add column if not exists settlement_cycle text,  -- 정산 주기 (예: 행사 종료 후 3영업일)
  add column if not exists payment_method text;     -- 결제 방식 (예: 현금 / 카드 / QR)
