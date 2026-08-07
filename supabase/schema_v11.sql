-- ============================================
-- Festival Hub · Schema v11 · 차량등록증 → 부스/트럭 사진 3컷 + 예시 파일럿 행사
-- 실행 순서: ... -> v10 -> (이 파일)
-- ============================================

-- --------------------------------------------
-- 1. documents.kind 종류 변경
--    제거: vehicle_reg (차량등록증)
--    추가: booth_exterior / booth_interior / booth_storage (부스·트럭 외부/내부/재료보관 사진)
-- --------------------------------------------
-- 기존 차량등록증 데이터 정리(데모)
delete from public.documents where kind = 'vehicle_reg';

alter table public.documents drop constraint if exists documents_kind_check;
alter table public.documents add constraint documents_kind_check
  check (kind in (
    'business_reg', 'food_hygiene', 'insurance', 'hygiene_edu',
    'booth_exterior', 'booth_interior', 'booth_storage'
  ));

-- 데모: 홍길동(트럭펀트) 부스 사진 3컷 (검증 완료 상태)
insert into public.documents (seller_id, kind, file_name, status, uploaded_at, reviewed_at)
select p.id, k.kind, k.fn, 'verified', now() - interval '3 days', now() - interval '2 days'
from public.profiles p
cross join (values
  ('booth_exterior', '부스외부_트럭펀트.jpg'),
  ('booth_interior', '부스내부_트럭펀트.jpg'),
  ('booth_storage',  '재료보관_트럭펀트.jpg')
) as k(kind, fn)
where p.email = 'seller@festival.demo'
on conflict (seller_id, kind) do nothing;

-- --------------------------------------------
-- 2. 예시 파일럿 행사 1건 (관리자 승인 완료 상태로 즉시 노출 · 편집 가능)
--    소유: 행사 주최 데모 계정(성동구청 문화체육과)
-- --------------------------------------------
insert into public.events (
  owner_id, name, category, organizer, start_date, end_date, region, address,
  visitors, capacity, fee, fee_rate, deadline,
  electric, water, gas, parking, description, contact, phone, status, review_status
)
select
  p.id, '[예시] 성수 가을 야시장', '야시장', '성동구청 문화체육과',
  '2026-10-17', '2026-10-19', '서울', '서울 성동구 서울숲 광장',
  '일 평균 15,000명', '20자리', 180000, 0, '2026-10-10',
  true, true, true, false,
  '성수동 일대 가을 야시장. 음식 셀러 20팀 모집. (파일럿 예시 행사 · 관리자에서 편집/삭제 가능)',
  '성동구청', '02-2286-0000', 'open', 'approved'
from public.profiles p
where p.email = 'host@festival.demo'
  and not exists (select 1 from public.events where name = '[예시] 성수 가을 야시장');
