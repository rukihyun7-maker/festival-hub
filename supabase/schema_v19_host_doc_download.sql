-- ============================================
-- Festival Hub · Schema v19 · 주최사 서류 다운로드 허용 설정
-- 관리자가 켜면, 주최사가 자기 행사 신청자의 제출 서류(사업자등록증 등)를 다운로드할 수 있음.
-- 기본 false(민감 서류는 관리자 검증 영역). 부스 사진은 이 설정과 무관하게 열람/다운로드 가능(v16).
-- 재실행 안전.
-- ============================================

alter table public.platform_settings
  add column if not exists host_doc_download boolean not null default false;

-- 주최사가 신청자 서류(모든 kind)를 열람/다운로드하려면 storage select 정책도 필요.
-- host_doc_download=true일 때만 허용되도록, 신청자 서류 전체에 대한 주최 select 정책 추가.
drop policy if exists "docs_storage_select_host_all" on storage.objects;
create policy "docs_storage_select_host_all" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (select coalesce(host_doc_download, false) from public.platform_settings where id = 1)
    and exists (
      select 1
      from public.applications ap
      join public.events e on e.id = ap.event_id
      where ap.seller_id::text = (storage.foldername(name))[1]
        and e.owner_id = auth.uid()
    )
  );
