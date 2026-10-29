-- ============================================
-- Festival Hub · Schema v57 · 뉴스레터(소식) 게시판
--  · newsletter_posts: 관리자 큐레이션 게시글 (수동 작성·순서조정·노출토글)
--  · 읽기: 로그인 사용자(주최·파트너)는 노출글 열람 / 관리자는 전체
--  · 쓰기: 관리자만
--  · 자동 뉴스피드는 저장 없이 /api/news(Google 뉴스 RSS)에서 실시간 조회
-- 재실행 안전.
-- ============================================

-- is_admin 함수 보장(재귀 방지 · security definer)
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create table if not exists public.newsletter_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,                       -- 요약/본문(짧은 글)
  url text,                           -- 외부 원문 링크(선택)
  image_url text,                     -- 대표 이미지(선택)
  source text,                        -- 출처 표기(선택)
  sort_order integer not null default 0,  -- 작을수록 위
  published boolean not null default true, -- 노출 여부
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_newsletter_posts_order on public.newsletter_posts(published, sort_order, created_at desc);

alter table public.newsletter_posts enable row level security;

-- 읽기: 로그인 사용자는 노출글, 관리자는 전체
drop policy if exists np_read on public.newsletter_posts;
create policy np_read on public.newsletter_posts
  for select using ((published and auth.uid() is not null) or public.is_admin());

-- 쓰기(생성·수정·삭제): 관리자만
drop policy if exists np_admin_write on public.newsletter_posts;
create policy np_admin_write on public.newsletter_posts
  for all using (public.is_admin()) with check (public.is_admin());

-- updated_at 자동 갱신
create or replace function public.touch_newsletter_updated()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_newsletter_touch on public.newsletter_posts;
create trigger trg_newsletter_touch before update on public.newsletter_posts
  for each row execute function public.touch_newsletter_updated();
