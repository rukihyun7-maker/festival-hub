-- ============================================
-- Festival Hub · Schema v44 · 서류 자가검증 방지 (보안 · 핵심 해자)
-- 기존 docs_all_own 정책이 for all using(seller_id) + with check 없음 →
-- 파트너가 자기 서류 status를 직접 'verified'로 바꿔 관리자 검증을 우회할 수 있었음.
-- 수정: 파트너의 insert/update 결과는 반드시 status='pending'이어야 함(재업로드=재심사).
--       verified/rejected 상태 변경은 관리자(docs_admin_update)만 가능.
-- 파트너 정상 재업로드는 upsertDocument가 항상 status='pending'으로 저장하므로 영향 없음.
-- 재실행 안전.
-- ============================================

drop policy if exists "docs_all_own" on public.documents;
create policy "docs_all_own" on public.documents
  for all
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id and status = 'pending');

-- 관리자 검증(승인/반려) 정책은 그대로 유지 (참고용 재선언 · 이미 존재하면 동일)
drop policy if exists "docs_admin_update" on public.documents;
create policy "docs_admin_update" on public.documents
  for update using (public.user_role() = 'admin');
