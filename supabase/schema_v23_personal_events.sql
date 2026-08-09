-- ============================================
-- Festival Hub · Schema v23 · 개인(수기) 일정
-- 플랫폼 신청/등록 행사 외에, 사용자가 직접 적는 일정을 캘린더에 함께 관리.
-- 본인만 CRUD (RLS). 재실행 안전.
-- ============================================

create table if not exists public.personal_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  memo text,
  created_at timestamptz default now()
);

create index if not exists idx_personal_events_user on public.personal_events(user_id);

alter table public.personal_events enable row level security;

drop policy if exists "personal_events_own" on public.personal_events;
create policy "personal_events_own" on public.personal_events
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
