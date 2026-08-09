-- ============================================
-- Festival Hub · 테스트 데이터 정리
-- 유지: 입점 파트너 '홍길동'(seller@festival.demo) + 신청형 '서울숲 8월 플리마켓' 1개 + 정보형 전체
-- 삭제: 그 외 입점 파트너 계정(3) + 그 외 신청형 행사(13)
-- Supabase SQL Editor(postgres 권한)에서 실행. 트랜잭션 → 오류 시 전체 롤백(안전).
-- ⚠️ 되돌릴 수 없습니다. 계획 확인 후 실행하세요.
-- ============================================

begin;

-- 삭제 대상 정의
create temp table _del_sellers on commit drop as
  select id from public.profiles
  where role = 'seller'
    and id <> '00000000-0000-4000-8000-000000000001';   -- 홍길동 유지

create temp table _del_events on commit drop as
  select id from public.events
  where coalesce(kind, 'apply') = 'apply'
    and id <> '11111111-0000-4000-8000-000000000001';    -- 서울숲 8월 플리마켓 유지 (정보형은 제외되어 유지)

-- 자식 데이터 정리 (행사/파트너 연관)
delete from public.applications  where event_id in (select id from _del_events) or seller_id in (select id from _del_sellers);
delete from public.sales         where event_id in (select id from _del_events) or seller_id in (select id from _del_sellers);
delete from public.simulations   where event_id in (select id from _del_events) or seller_id in (select id from _del_sellers);
delete from public.ratings       where event_id in (select id from _del_events) or seller_id in (select id from _del_sellers);
delete from public.favorites     where event_id in (select id from _del_events) or seller_id in (select id from _del_sellers);
delete from public.settlements   where event_id in (select id from _del_events) or seller_id in (select id from _del_sellers);
delete from public.event_nearby  where event_id in (select id from _del_events);
delete from public.documents      where seller_id in (select id from _del_sellers);
delete from public.menus          where seller_id in (select id from _del_sellers);
delete from public.seller_history where seller_id in (select id from _del_sellers);

-- 행사 삭제
delete from public.events where id in (select id from _del_events);

-- 프로필 + 인증 계정 삭제
delete from public.profiles where id in (select id from _del_sellers);
delete from auth.users     where id in (select id from _del_sellers);

commit;

-- 확인:
--   select email, name, status from public.profiles where role='seller';        -- 홍길동만
--   select count(*) from public.events where coalesce(kind,'apply')='apply';    -- 1
--   select count(*) from public.events where kind='info';                       -- 24 (유지)
