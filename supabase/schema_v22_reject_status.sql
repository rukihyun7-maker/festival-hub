-- ============================================
-- Festival Hub · Schema v22 · 입점 파트너 가입 '반려' 상태 추가
-- 관리자가 가입 심사에서 승인 외에 '반려'할 수 있도록 status 값 확장.
-- '반려'도 '정상'이 아니므로 행사 찾기·신청은 차단됨(기존 게이트 유지).
-- 재실행 안전.
-- ============================================

alter table public.profiles
  drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('정상', '가입 심사', '정지', '반려'));
