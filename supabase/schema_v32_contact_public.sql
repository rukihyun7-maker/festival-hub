-- ============================================
-- Festival Hub · Schema v32 · 문의자 정보 공개 설정
-- 신청형 행사의 담당자·연락처(event_contacts)를 '바로 공개'할지 '승인 후 공개'할지
-- 주최(소유)·관리자가 events.contact_public 으로 설정.
-- 기본값 false = 기존과 동일(승인 후 공개).
-- 재실행 안전.
-- ============================================

alter table public.events
  add column if not exists contact_public boolean not null default false;

-- 조회: 주최(소유) · 관리자 · 승인된 신청자 · '바로 공개'로 설정된 행사
drop policy if exists "evc_select" on public.event_contacts;
create policy "evc_select" on public.event_contacts
  for select using (
    exists (select 1 from public.events e where e.id = event_contacts.event_id and e.owner_id = auth.uid())
    or public.is_admin()
    or exists (
      select 1 from public.applications a
      where a.event_id = event_contacts.event_id
        and a.seller_id = auth.uid()
        and a.status = 'approved'
    )
    or exists (
      select 1 from public.events e
      where e.id = event_contacts.event_id
        and e.contact_public = true
    )
  );
