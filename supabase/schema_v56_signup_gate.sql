-- ============================================
-- Festival Hub · v56 · 가입 승인 게이트 정리
--  · 가입 승인/반려 안내는 관리자 UI가 부르는 tailored 메일(/api/admin/notify-account)로 단일화.
--  · v54의 notify_member_status 트리거를 제거 → 승인 시 제네릭 메일 중복 발송·불필요한 푸시 방지.
--    (가입 승인 시점엔 사용자가 로그인 전이라 인앱/푸시가 의미 없음)
--  · 신규 가입이 '가입 심사'로 들어가는 것은 v31에서 이미 처리됨(자동승인 off 기본).
-- 재실행 안전.
-- ============================================

drop trigger if exists trg_member_status on public.profiles;
drop function if exists public.notify_member_status();

-- 참고: 자동 승인이 꺼져 있어야(수동 심사) 로그인 게이트가 의미 있음. 확인용:
--   select seller_auto_approve, host_auto_approve from public.platform_settings where id = 1;
--   (둘 다 false여야 신규 가입이 '가입 심사'로 들어감)
