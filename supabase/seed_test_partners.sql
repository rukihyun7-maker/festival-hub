-- ============================================
-- Festival Hub · 입점 파트너 테스트 계정 2개 (QA용)
--  A test-light@festival.demo : 정상 계정 + 필수서류 2/6만 검증 → 신청형 잠금(정보형만) 테스트
--  B test-full@festival.demo  : 매장정보 완비 + 필수서류 6종 검증 + 메뉴/대표메뉴 → 신청형 열람·신청 테스트
--  비밀번호 공통 festival2026 · 이메일 인증 완료 상태로 생성 · 재실행 안전(on conflict)
--  주의: 서류 '파일'은 SQL로 못 올림 → status만 verified. 신청 흐름 테스트는 가능,
--        열람 시 실제 파일 없음(실 파트너가 업로드하면 정상). 부스사진은 '미제출'로 표시됨.
-- ============================================
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a1'; -- light
  b uuid := '00000000-0000-4000-8000-0000000000b1'; -- full
begin
  -- ── auth.users ──
  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
  values
    (a, '00000000-0000-0000-0000-000000000000', 'test-light@festival.demo', crypt('festival2026', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"name":"김라이트","role":"seller","business_no":"111-11-11111"}', 'authenticated','authenticated', now(), now()),
    (b, '00000000-0000-0000-0000-000000000000', 'test-full@festival.demo', crypt('festival2026', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"name":"박풀세팅","role":"seller","business_no":"222-22-22222"}', 'authenticated','authenticated', now(), now())
  on conflict (id) do update set encrypted_password = excluded.encrypted_password;

  -- ── profiles (트리거가 생성하지만 상세 필드는 여기서 채움) ──
  -- A: 매장정보 일부만 (신청 자격 미충족)
  insert into public.profiles (id, email, name, role, business_name, business_no, region, category, phone, status)
  values (a, 'test-light@festival.demo', '김라이트', 'seller', '라이트분식', '111-11-11111', '서울', '푸드트럭', '010-1111-1111', '정상')
  on conflict (id) do update set
    name=excluded.name, business_name=excluded.business_name, business_no=excluded.business_no,
    region=excluded.region, category=excluded.category, phone=excluded.phone, status='정상';

  -- B: 매장정보 완비 (필수 전 항목)
  insert into public.profiles (id, email, name, role, business_name, business_no, region, category, phone, vehicle, power, cooking, hygiene_gear, intro, status)
  values (b, 'test-full@festival.demo', '박풀세팅', 'seller', '풀세팅푸드트럭', '222-22-22222', '서울', '푸드트럭', '010-2222-2222',
          '3.5t 개조 푸드트럭 · 5.2×2.1m', '3kW · 자체 발전기 보유', '가스 2구 + 전기 튀김기 1대', '마스크·모자·장갑 상시 착용', '3년차 푸드트럭. 수제버거·감자튀김 전문.', '정상')
  on conflict (id) do update set
    name=excluded.name, business_name=excluded.business_name, business_no=excluded.business_no,
    region=excluded.region, category=excluded.category, phone=excluded.phone,
    vehicle=excluded.vehicle, power=excluded.power, cooking=excluded.cooking, hygiene_gear=excluded.hygiene_gear,
    intro=excluded.intro, status='정상';

  -- ── documents (status=verified · 파일은 없음) ──
  -- A: 2종만 검증 (business_reg, food_hygiene)
  insert into public.documents (id, seller_id, kind, file_url, file_name, status, reviewed_at, uploaded_at, updated_at)
  values
    (gen_random_uuid(), a, 'business_reg', null, '사업자등록증(테스트).pdf', 'verified', now(), now(), now()),
    (gen_random_uuid(), a, 'food_hygiene', null, '식품위생업신고증(테스트).pdf', 'verified', now(), now(), now())
  on conflict (seller_id, kind) do update set status='verified', reviewed_at=now(), updated_at=now();

  -- B: 필수 6종 + 보험(선택)까지 검증
  insert into public.documents (id, seller_id, kind, file_url, file_name, status, expires_at, reviewed_at, uploaded_at, updated_at)
  values
    (gen_random_uuid(), b, 'business_reg',   null, '사업자등록증(테스트).pdf',   'verified', null,          now(), now(), now()),
    (gen_random_uuid(), b, 'food_hygiene',   null, '식품위생신고증(테스트).pdf', 'verified', null,          now(), now(), now()),
    (gen_random_uuid(), b, 'hygiene_edu',    null, '위생교육이수증(테스트).pdf', 'verified', current_date + 300, now(), now(), now()),
    (gen_random_uuid(), b, 'insurance',      null, '영업배상책임보험(테스트).pdf','verified', current_date + 300, now(), now(), now()),
    (gen_random_uuid(), b, 'booth_exterior', null, '부스외부(테스트).jpg',       'verified', null,          now(), now(), now()),
    (gen_random_uuid(), b, 'booth_interior', null, '부스내부(테스트).jpg',       'verified', null,          now(), now(), now()),
    (gen_random_uuid(), b, 'booth_storage',  null, '재료보관(테스트).jpg',       'verified', null,          now(), now(), now())
  on conflict (seller_id, kind) do update set status='verified', reviewed_at=now(), updated_at=now();

  -- ── menus (재실행 시 중복 방지: 기존 삭제 후 삽입) ──
  delete from public.menus where seller_id in (a, b);
  -- A: 1개
  insert into public.menus (id, seller_id, name, price, cost, category, description, signature)
  values (gen_random_uuid(), a, '떡볶이', 5000, 1800, 'MAIN', '기본 떡볶이', false);
  -- B: 3개 (대표 2개)
  insert into public.menus (id, seller_id, name, price, cost, category, description, signature)
  values
    (gen_random_uuid(), b, '수제버거', 8000, 3000, 'MAIN', '100% 순쇠고기 패티', true),
    (gen_random_uuid(), b, '트러플 감자튀김', 6000, 2000, 'SIDE', '트러플오일 듬뿍', true),
    (gen_random_uuid(), b, '수제 콜라', 3000, 900, 'DRINK', '직접 만든 시럽', false);
end $$;

-- ── 로그인 보강: identities + NULL 토큰 컬럼 채우기 ──
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.email in ('test-light@festival.demo','test-full@festival.demo')
on conflict do nothing;

update auth.users
set confirmation_token=coalesce(confirmation_token,''), recovery_token=coalesce(recovery_token,''),
    email_change=coalesce(email_change,''), email_change_token_new=coalesce(email_change_token_new,''),
    email_change_token_current=coalesce(email_change_token_current,''), reauthentication_token=coalesce(reauthentication_token,''),
    phone_change=coalesce(phone_change,''), phone_change_token=coalesce(phone_change_token,'')
where email in ('test-light@festival.demo','test-full@festival.demo');
