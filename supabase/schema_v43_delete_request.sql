-- ============================================
-- Festival Hub · Schema v43 · 행사 삭제 요청 (관리자 승인)
-- 승인(공개)된 행사는 주최가 직접 삭제하지 못하고, 삭제를 "요청"만 함.
-- 관리자가 삭제 요청을 승인하면 실제로 삭제(CASCADE)되고, 반려하면 요청만 취소됨.
-- delete_requested_at: 요청 시각(NULL = 요청 없음) · delete_reason: 요청 사유
-- 재실행 안전.
-- ============================================

alter table public.events
  add column if not exists delete_requested_at timestamptz,
  add column if not exists delete_reason text;

-- 관리자 삭제 요청함 조회용 인덱스(요청 건만)
create index if not exists idx_events_delete_requested
  on public.events (delete_requested_at)
  where delete_requested_at is not null;
