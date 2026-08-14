-- ============================================
-- Festival Hub · Schema v25 · RLS 비밀보장 강화 (STEP 1 + STEP 3)
-- 목적: profiles·seller_history의 "누구나/모든 호스트 조회"를 관계 기반으로 좁힘.
--       → 비로그인·무관한 사용자의 개인정보(전화·사업자번호·이메일) 무차별 조회 차단.
-- 클라이언트 수정 불필요(임베드 관계는 그대로 유지). 재실행 안전.
-- ※ events 연락처(STEP 2)는 클라이언트 리팩터가 필요해 v26에서 별도 적용.
-- ============================================

-- 재귀 방지용 헬퍼: 정책이 profiles를 다시 읽어도 무한재귀 안 나도록
-- security definer(테이블 소유자 권한)로 RLS 우회하여 role/admin 판별.
create or replace function public.user_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ── STEP 1. profiles 조회 범위 축소 ──────────────
-- 기존: profiles_select_all = using(true)  (누구나 전 컬럼 조회)
-- 변경: 본인 / 관리자 / 관계 있는 당사자(내 신청자 호스트, 평가·정산 상대)만
-- ※ 관리자 판별은 is_admin()(재귀 방지) 사용
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_select_scoped" on public.profiles;
create policy "profiles_select_scoped" on public.profiles
  for select using (
    auth.uid() = id
    or public.is_admin()
    -- 호스트: 내 행사에 신청한 셀러의 프로필
    or exists (
      select 1 from public.applications a
      join public.events e on e.id = a.event_id
      where a.seller_id = profiles.id and e.owner_id = auth.uid()
    )
    -- 평가 당사자(호스트↔셀러 상호)
    or exists (
      select 1 from public.ratings r
      where (r.seller_id = profiles.id and r.host_id = auth.uid())
         or (r.host_id   = profiles.id and r.seller_id = auth.uid())
    )
    -- 정산 당사자(호스트↔셀러 상호)
    or exists (
      select 1 from public.settlements s
      where (s.seller_id = profiles.id and s.host_id = auth.uid())
         or (s.host_id   = profiles.id and s.seller_id = auth.uid())
    )
  );

-- (기존 유지) 본인 수정 / 관리자 전체
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin());

-- ── STEP 3. seller_history 조회 범위 축소 ──────────
-- 기존: hist_select = 본인 OR 모든 host/admin  (모든 호스트가 전체 셀러 이력 조회)
-- 변경: 본인 / 관리자 / 내 행사에 신청한 셀러만
drop policy if exists "hist_select" on public.seller_history;
create policy "hist_select" on public.seller_history
  for select using (
    auth.uid() = seller_id
    or public.user_role() = 'admin'
    or exists (
      select 1 from public.applications a
      join public.events e on e.id = a.event_id
      where a.seller_id = seller_history.seller_id and e.owner_id = auth.uid()
    )
  );

-- ============================================
-- 적용 후 확인(권장):
--  · 관리자 계정: 사용자/행사/서류 목록 정상
--  · 주최 계정: 신청자 관리에서 신청자 이름·업종·이력 정상 표시
--  · 셀러 계정: 내 대시보드·신청현황 정상
-- 문제 없으면 → v26(events 연락처)로 진행
-- ============================================
