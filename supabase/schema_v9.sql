-- ============================================
-- Festival Hub · Schema v9 · 주최가 신청자 서류 상태 열람 (심사용)
-- 실행 순서: ... -> v8 -> (이 파일)
-- ============================================

-- 주최가 자기 행사에 신청한 셀러의 서류(제출 여부/상태)를 열람
drop policy if exists "docs_select_host_applicant" on public.documents;
create policy "docs_select_host_applicant" on public.documents
  for select using (
    exists (
      select 1
      from public.applications app
      join public.events ev on ev.id = app.event_id
      where app.seller_id = documents.seller_id
        and ev.owner_id = auth.uid()
    )
  );
