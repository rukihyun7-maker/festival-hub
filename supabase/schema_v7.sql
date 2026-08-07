-- ============================================
-- Festival Hub · Schema v7 · 메뉴 사진 버킷 + 주최의 신청자 메뉴 열람
-- 실행 순서: ... -> v6 -> (이 파일)
-- ============================================

-- --------------------------------------------
-- 1. menu-photos 스토리지 버킷 (public 읽기, 셀러 본인 폴더만 쓰기)
-- --------------------------------------------
insert into storage.buckets (id, name, public)
values ('menu-photos', 'menu-photos', true)
on conflict (id) do nothing;

drop policy if exists "menu_photos_read" on storage.objects;
create policy "menu_photos_read" on storage.objects
  for select using (bucket_id = 'menu-photos');

drop policy if exists "menu_photos_insert" on storage.objects;
create policy "menu_photos_insert" on storage.objects
  for insert with check (
    bucket_id = 'menu-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "menu_photos_update" on storage.objects;
create policy "menu_photos_update" on storage.objects
  for update using (
    bucket_id = 'menu-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "menu_photos_delete" on storage.objects;
create policy "menu_photos_delete" on storage.objects
  for delete using (
    bucket_id = 'menu-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- --------------------------------------------
-- 2. 주최가 자기 행사에 신청한 셀러의 판매 메뉴를 열람 (심사용)
-- --------------------------------------------
drop policy if exists "menus_select_host_applicant" on public.menus;
create policy "menus_select_host_applicant" on public.menus
  for select using (
    exists (
      select 1
      from public.applications app
      join public.events ev on ev.id = app.event_id
      where app.seller_id = menus.seller_id
        and ev.owner_id = auth.uid()
    )
  );
