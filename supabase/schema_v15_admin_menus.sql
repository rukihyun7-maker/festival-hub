-- ============================================
-- Festival Hub · Schema v15 · 관리자 판매메뉴 열람 정책
-- 가입 심사 시 관리자가 입점 파트너의 판매 메뉴를 열람할 수 있어야 함.
-- (문서는 admin 정책이 이미 있음 · 메뉴만 admin select 누락 보강)
-- 재실행 안전.
-- ============================================

drop policy if exists "menus_select_admin" on public.menus;
create policy "menus_select_admin" on public.menus
  for select using (public.user_role() = 'admin');
