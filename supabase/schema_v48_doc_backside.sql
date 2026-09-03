-- ============================================
-- Festival Hub · Schema v48 · 서류 뒷면 첨부
--  · 식품위생업 신고증 등 앞면/뒷면 2면 첨부 지원 (documents.file_url_back)
-- 재실행 안전.
-- ============================================

alter table public.documents
  add column if not exists file_url_back text;
alter table public.documents
  add column if not exists file_name_back text;
