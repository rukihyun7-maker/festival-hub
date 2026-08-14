-- ============================================
-- Festival Hub · Schema v26 · 신청 자격 DB단 강제
-- 화면(UI) 게이트를 DB에서도 강제 → API 우회로 자격 미달 신청 삽입 차단.
-- 기준: 계정 정상 + 필수 매장정보 + 필수 서류 6종 관리자 검증 + 판매 메뉴 1개 이상.
-- (소속·운영인원·SNS·매장소개·영업배상책임보험은 선택)
-- 재실행 안전.
-- ============================================

-- 신청 자격 판정 함수 (security definer로 profiles/documents/menus를 RLS 우회 조회)
create or replace function public.can_apply(p_seller uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- 1) 계정 정상 + 필수 매장정보 모두 입력
    exists (
      select 1 from public.profiles pr
      where pr.id = p_seller
        and coalesce(pr.status, '정상') = '정상'
        and nullif(btrim(pr.business_name), '') is not null
        and nullif(btrim(pr.name), '')          is not null
        and nullif(btrim(pr.region), '')        is not null
        and nullif(btrim(pr.business_no), '')   is not null
        and nullif(btrim(pr.phone), '')         is not null
        and nullif(btrim(pr.vehicle), '')       is not null
        and nullif(btrim(pr.power), '')         is not null
        and nullif(btrim(pr.cooking), '')       is not null
        and nullif(btrim(pr.hygiene_gear), '')  is not null
    )
    -- 2) 필수 서류 6종 모두 '검증됨'(만료 안 됨)
    and (
      select count(distinct d.kind)
      from public.documents d
      where d.seller_id = p_seller
        and d.kind in ('business_reg','food_hygiene','hygiene_edu','booth_exterior','booth_interior','booth_storage')
        and d.status = 'verified'
        and (d.expires_at is null or d.expires_at >= current_date)
    ) = 6
    -- 3) 판매 메뉴 1개 이상
    and exists (select 1 from public.menus m where m.seller_id = p_seller);
$$;

-- 신청 INSERT 정책 강화: 본인 셀러 + 자격 충족일 때만 삽입 허용
drop policy if exists "apps_insert_seller" on public.applications;
create policy "apps_insert_seller" on public.applications
  for insert with check (
    public.user_role() = 'seller'
    and auth.uid() = seller_id
    and public.can_apply(seller_id)
  );

-- ============================================
-- 확인:
--  · 자격 충족 파트너 → 신청 성공
--  · 자격 미달 파트너(서류 미검증 등) → 신청 실패(정책 위반)로 차단
-- 롤백:
--  drop policy if exists "apps_insert_seller" on public.applications;
--  create policy "apps_insert_seller" on public.applications for insert with check (
--    public.user_role() = 'seller' and auth.uid() = seller_id
--    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = '정상'));
-- ============================================
