-- ============================================
-- Festival Hub · Storage RLS 정책
-- Supabase 대시보드에서 'documents' 버킷을 먼저 생성한 뒤 실행
-- 대시보드 → Storage → New bucket → Name: documents · Public: OFF
-- ============================================

-- 셀러: 본인 폴더(seller_id 하위)의 파일만 업로드/조회/삭제
-- 파일 경로 규칙: {seller_id}/{kind}/{timestamp_filename}
-- storage.objects.name의 첫 세그먼트가 auth.uid()와 일치해야 통과

-- Select (본인 파일 + 관리자 전체)
drop policy if exists "docs_storage_select" on storage.objects;
create policy "docs_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.user_role() = 'admin'
    )
  );

-- Insert (본인 폴더에만)
drop policy if exists "docs_storage_insert" on storage.objects;
create policy "docs_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update (본인 파일)
drop policy if exists "docs_storage_update" on storage.objects;
create policy "docs_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete (본인 파일 + 관리자)
drop policy if exists "docs_storage_delete" on storage.objects;
create policy "docs_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.user_role() = 'admin'
    )
  );

-- ============================================
-- 정책 완료
-- 파일 URL은 private · signed URL로만 접근 (1시간 만료)
-- ============================================
