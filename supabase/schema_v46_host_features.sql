-- ============================================
-- Festival Hub · Schema v46 · 주최 기능 개선
--  · 참가비 부가세 표기 (vat_included)
--  · 정산 방식 (settlement_method)
--  · 누적 조회수 (view_count) + 증가 RPC
--  · 행사별 찜(관심) 수 집계 RPC (RLS 우회 · 집계만 공개)
-- 재실행 안전.
-- ============================================

-- 1) 신규 컬럼
alter table public.events
  add column if not exists vat_included boolean not null default false;
alter table public.events
  add column if not exists settlement_method text;
alter table public.events
  add column if not exists view_count integer not null default 0;

-- 2) 조회수 +1 (상세 진입 시 · 비로그인 포함 누구나 호출 가능)
create or replace function public.increment_event_view(p_event_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.events set view_count = coalesce(view_count, 0) + 1 where id = p_event_id;
$$;
grant execute on function public.increment_event_view(uuid) to anon, authenticated;

-- 3) 행사별 찜 수 (단건)
create or replace function public.event_favorite_count(p_event_id uuid)
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int from public.favorites where event_id = p_event_id;
$$;
grant execute on function public.event_favorite_count(uuid) to anon, authenticated;

-- 4) 행사별 찜 수 (여러 건 · 주최 대시보드 일괄)
create or replace function public.event_favorite_counts(p_event_ids uuid[])
returns table(event_id uuid, cnt integer)
language sql
security definer
stable
set search_path = public
as $$
  select f.event_id, count(*)::int as cnt
  from public.favorites f
  where f.event_id = any(p_event_ids)
  group by f.event_id;
$$;
grant execute on function public.event_favorite_counts(uuid[]) to anon, authenticated;
