-- ============================================
-- Festival Hub · Schema v58 · 공지사항(상단 배너)
--  · announcements: 관리자가 대상(전체/파트너/주최) 선택해 상단 배너로 노출
--  · 기능 업데이트·점검·이벤트 등 시스템 공지
--  · 읽기: 로그인 사용자 중 대상·노출기간 일치분 / 관리자 전체
--  · 쓰기: 관리자만
-- 재실행 안전.
-- ============================================

create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.user_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  url text,                                   -- 선택 상세 링크
  audience text not null default 'all',       -- all | seller | host
  level text not null default 'info',         -- info | update | warning
  published boolean not null default true,
  starts_at timestamptz,                      -- 선택 노출 시작
  ends_at timestamptz,                        -- 선택 노출 종료
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_announcements_live on public.announcements(published, created_at desc);

alter table public.announcements enable row level security;

-- 읽기: 관리자 전체 / 그 외 로그인 사용자는 대상·노출기간 일치분
drop policy if exists ann_read on public.announcements;
create policy ann_read on public.announcements
  for select using (
    public.is_admin() or (
      auth.uid() is not null
      and published
      and (audience = 'all' or audience = public.user_role())
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
    )
  );

-- 쓰기(생성·수정·삭제): 관리자만
drop policy if exists ann_admin_write on public.announcements;
create policy ann_admin_write on public.announcements
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.touch_announcements_updated()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_announcements_touch on public.announcements;
create trigger trg_announcements_touch before update on public.announcements
  for each row execute function public.touch_announcements_updated();
