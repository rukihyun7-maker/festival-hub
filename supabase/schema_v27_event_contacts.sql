-- ============================================
-- Festival Hub · Schema v27 · 행사 연락처 분리(비밀보장 STEP 2)
-- events.contact/phone 을 별도 테이블 event_contacts 로 옮기고 events 컬럼은 null 처리.
-- → events는 계속 누구나 조회 가능(임베드 유지)하되 연락처는 빠짐.
--   실제 연락처는 event_contacts에서 RLS로 보호: 주최·관리자·'승인된 신청자'만 열람.
-- 비파괴(컬럼 drop 안 함) · 재실행 안전.
-- ============================================

-- is_admin 함수 (없을 수 있으므로 여기서 보장 · 재귀 방지 security definer)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create table if not exists public.event_contacts (
  event_id uuid primary key references public.events(id) on delete cascade,
  contact  text,
  phone    text,
  updated_at timestamptz default now()
);

-- 기존 events의 연락처 이관 (한 번만 효과, on conflict로 재실행 안전)
insert into public.event_contacts (event_id, contact, phone)
select id, contact, phone
from public.events
where contact is not null or phone is not null
on conflict (event_id) do nothing;

-- events 원본 컬럼 비우기 (select('*') 노출 차단). 데이터는 event_contacts에 보존됨.
update public.events set contact = null, phone = null
where contact is not null or phone is not null;

-- 권한 (RLS가 실제 행 접근을 통제 · grant는 테이블 접근 자체 허용)
grant select, insert, update, delete on public.event_contacts to authenticated;
grant select on public.event_contacts to anon;

-- RLS
alter table public.event_contacts enable row level security;

-- 조회: 주최(소유) · 관리자 · 승인된 신청자
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
  );

-- 쓰기(등록/수정): 주최(소유) · 관리자
drop policy if exists "evc_write" on public.event_contacts;
create policy "evc_write" on public.event_contacts
  for all
  using (
    exists (select 1 from public.events e where e.id = event_contacts.event_id and e.owner_id = auth.uid())
    or public.is_admin()
  )
  with check (
    exists (select 1 from public.events e where e.id = event_contacts.event_id and e.owner_id = auth.uid())
    or public.is_admin()
  );

-- ============================================
-- 적용 후: 클라이언트가 연락처를 event_contacts에서 읽고/쓰도록 배포되어야 함(v27 코드).
--  · 행사 상세 '문의' → 승인 당사자/주최/관리자에게만 표시
--  · 행사 편집 폼 → 주최가 자기 연락처 프리필
-- ============================================
