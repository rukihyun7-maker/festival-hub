-- ============================================
-- Festival Hub · Schema v47 · 관리자 지표 보정 + 담당자 비공개 옵션
--  · fav_boost: 관심(찜) 표시 가산치 (관리자 수기 · 초기 활성감 세팅)
--  · 찜 수 집계 함수가 (실제 찜 + fav_boost)를 반환하도록 갱신
--  · 조회수(view_count)는 events 컬럼 직접 수정(관리자 RLS: events_update_own)
--  · contact_hidden: 담당자·연락처 완전 비공개(승인돼도 노출 안 함 · 소통은 플랫폼)
-- 재실행 안전.
-- ============================================

alter table public.events
  add column if not exists fav_boost integer not null default 0;
alter table public.events
  add column if not exists contact_hidden boolean not null default false;

-- 단건: 실제 찜 + 가산치 (0 미만은 0으로)
create or replace function public.event_favorite_count(p_event_id uuid)
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select greatest(
    0,
    (select count(*) from public.favorites where event_id = p_event_id)
    + coalesce((select fav_boost from public.events where id = p_event_id), 0)
  )::int;
$$;
grant execute on function public.event_favorite_count(uuid) to anon, authenticated;

-- 여러 건: 요청한 모든 행사에 대해 (실제 찜 + 가산치) 반환 (찜 0건 행사도 포함)
create or replace function public.event_favorite_counts(p_event_ids uuid[])
returns table(event_id uuid, cnt integer)
language sql
security definer
stable
set search_path = public
as $$
  select e.id as event_id,
         greatest(0, coalesce(f.cnt, 0) + coalesce(e.fav_boost, 0))::int as cnt
  from public.events e
  left join (
    select event_id, count(*)::int as cnt
    from public.favorites
    where event_id = any(p_event_ids)
    group by event_id
  ) f on f.event_id = e.id
  where e.id = any(p_event_ids);
$$;
grant execute on function public.event_favorite_counts(uuid[]) to anon, authenticated;
