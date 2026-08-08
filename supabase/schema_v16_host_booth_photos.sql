-- ============================================
-- Festival Hub · Schema v16 · 주최사 신청자 부스사진 열람
-- 심사 공정성: 주최사는 자기 행사에 신청한 입점 파트너의 "부스 사진 3종"을 열람할 수 있어야 함.
-- 민감 서류(사업자등록증·보건증 등)는 제외 — 부스 사진(booth_*)만 허용.
-- 경로 규칙: documents/{sellerId}/{kind}/{ts}_{name} → [1]=sellerId, [2]=kind
-- 재실행 안전.
-- ============================================

drop policy if exists "docs_storage_select_host_booth" on storage.objects;
create policy "docs_storage_select_host_booth" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[2] in ('booth_exterior', 'booth_interior', 'booth_storage')
    and exists (
      select 1
      from public.applications ap
      join public.events e on e.id = ap.event_id
      where ap.seller_id::text = (storage.foldername(name))[1]
        and e.owner_id = auth.uid()
    )
  );
