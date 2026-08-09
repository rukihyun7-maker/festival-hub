-- ============================================
-- Festival Hub · 테스트 데이터 정리 (임시테이블 없이 · ID 직접 지정)
-- 유지: 입점 파트너 '홍길동'(00000000-…0001) + 신청형 '서울숲 8월 플리마켓'(11111111-…0001) + 정보형 전체
-- 삭제: 입점 파트너 3명 + 그 외 신청형 행사 전체
-- Supabase SQL Editor에서 실행. 트랜잭션 → 오류 시 전체 롤백(안전).
-- ⚠️ 되돌릴 수 없습니다.
-- ============================================

begin;

-- 삭제할 입점 파트너 3명(홍길동 제외):
--   699346f7… rukihyun@naver.com / c1083532… pilot-test / d08da5e2… rukihyun7@gmail.com
-- 삭제할 신청형 행사: coalesce(kind,'apply')='apply' AND id <> 서울숲(11111111-…0001)

-- 1) 자식 데이터 정리 (행사·파트너 연관)
delete from public.applications
  where event_id in (select id from public.events where coalesce(kind,'apply')='apply' and id <> '11111111-0000-4000-8000-000000000001')
     or seller_id in ('699346f7-794c-4a31-b1c2-3a93c5beb763','c1083532-7d7c-47c4-9dec-7e336276dde4','d08da5e2-0e11-4b6f-8eb3-568365363128');

delete from public.sales
  where event_id in (select id from public.events where coalesce(kind,'apply')='apply' and id <> '11111111-0000-4000-8000-000000000001')
     or seller_id in ('699346f7-794c-4a31-b1c2-3a93c5beb763','c1083532-7d7c-47c4-9dec-7e336276dde4','d08da5e2-0e11-4b6f-8eb3-568365363128');

delete from public.simulations
  where event_id in (select id from public.events where coalesce(kind,'apply')='apply' and id <> '11111111-0000-4000-8000-000000000001')
     or seller_id in ('699346f7-794c-4a31-b1c2-3a93c5beb763','c1083532-7d7c-47c4-9dec-7e336276dde4','d08da5e2-0e11-4b6f-8eb3-568365363128');

delete from public.ratings
  where event_id in (select id from public.events where coalesce(kind,'apply')='apply' and id <> '11111111-0000-4000-8000-000000000001')
     or seller_id in ('699346f7-794c-4a31-b1c2-3a93c5beb763','c1083532-7d7c-47c4-9dec-7e336276dde4','d08da5e2-0e11-4b6f-8eb3-568365363128');

delete from public.favorites
  where event_id in (select id from public.events where coalesce(kind,'apply')='apply' and id <> '11111111-0000-4000-8000-000000000001')
     or seller_id in ('699346f7-794c-4a31-b1c2-3a93c5beb763','c1083532-7d7c-47c4-9dec-7e336276dde4','d08da5e2-0e11-4b6f-8eb3-568365363128');

delete from public.settlements
  where event_id in (select id from public.events where coalesce(kind,'apply')='apply' and id <> '11111111-0000-4000-8000-000000000001')
     or seller_id in ('699346f7-794c-4a31-b1c2-3a93c5beb763','c1083532-7d7c-47c4-9dec-7e336276dde4','d08da5e2-0e11-4b6f-8eb3-568365363128');

delete from public.event_nearby
  where event_id in (select id from public.events where coalesce(kind,'apply')='apply' and id <> '11111111-0000-4000-8000-000000000001');

delete from public.documents      where seller_id in ('699346f7-794c-4a31-b1c2-3a93c5beb763','c1083532-7d7c-47c4-9dec-7e336276dde4','d08da5e2-0e11-4b6f-8eb3-568365363128');
delete from public.menus          where seller_id in ('699346f7-794c-4a31-b1c2-3a93c5beb763','c1083532-7d7c-47c4-9dec-7e336276dde4','d08da5e2-0e11-4b6f-8eb3-568365363128');
delete from public.seller_history where seller_id in ('699346f7-794c-4a31-b1c2-3a93c5beb763','c1083532-7d7c-47c4-9dec-7e336276dde4','d08da5e2-0e11-4b6f-8eb3-568365363128');

-- 2) 신청형 행사 삭제 (서울숲 제외 · 정보형 유지)
delete from public.events where coalesce(kind,'apply')='apply' and id <> '11111111-0000-4000-8000-000000000001';

-- 3) 프로필 + 인증 계정 삭제 (홍길동 제외)
delete from public.profiles where id in ('699346f7-794c-4a31-b1c2-3a93c5beb763','c1083532-7d7c-47c4-9dec-7e336276dde4','d08da5e2-0e11-4b6f-8eb3-568365363128');
delete from auth.users     where id in ('699346f7-794c-4a31-b1c2-3a93c5beb763','c1083532-7d7c-47c4-9dec-7e336276dde4','d08da5e2-0e11-4b6f-8eb3-568365363128');

commit;

-- 확인:
--   select email, name, status from public.profiles where role='seller';        -- 홍길동만
--   select count(*) from public.events where coalesce(kind,'apply')='apply';    -- 1
--   select count(*) from public.events where kind='info';                       -- 24 (유지)
