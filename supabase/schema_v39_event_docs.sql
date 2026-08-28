-- ============================================
-- Festival Hub · Schema v39 · 행사별 필수서류 가변
-- 열람/검증 기준(표준 6종)은 유지. 주최가 행사별로:
--   required_docs = { "standard": [DocKind...], "extra": [{ "label": "...", "desc": "..." }] }
--   - standard: 이 행사에서 '확인 요청'할 표준 서류(기본 전체) · 검토 강조용
--   - extra: 이 행사 전용 추가 서류 → 파트너가 신청 시 업로드
-- application_documents: 신청 시 업로드한 추가 서류 (신청자·주최·관리자만 열람)
-- 재실행 안전.
-- ============================================

alter table public.events
  add column if not exists required_docs jsonb not null default '{}'::jsonb;

create table if not exists public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  label text not null,
  file_url text,
  file_name text,
  created_at timestamptz default now()
);
create index if not exists idx_app_docs_app on public.application_documents(application_id);

alter table public.application_documents enable row level security;

-- 조회: 신청자 본인 · 해당 행사 주최 · 관리자
drop policy if exists "appdoc_select" on public.application_documents;
create policy "appdoc_select" on public.application_documents for select using (
  exists (
    select 1 from public.applications a
    join public.events e on e.id = a.event_id
    where a.id = application_documents.application_id
      and (a.seller_id = auth.uid() or e.owner_id = auth.uid())
  ) or public.is_admin()
);

-- 등록/수정/삭제: 신청자 본인
drop policy if exists "appdoc_write" on public.application_documents;
create policy "appdoc_write" on public.application_documents for all using (
  exists (select 1 from public.applications a where a.id = application_documents.application_id and a.seller_id = auth.uid())
) with check (
  exists (select 1 from public.applications a where a.id = application_documents.application_id and a.seller_id = auth.uid())
);
