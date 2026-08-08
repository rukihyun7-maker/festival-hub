-- ============================================
-- Festival Hub · Schema v14 · 입지 수요점수 + 인근 행사
-- 실행 순서: ... v13 → seed_nearby_kakao.sql(인근시설 실데이터) → (이 파일)
-- local_info(카카오 인근시설) 기준으로 각 행사의 입지 수요점수/태그를 산출.
-- 세대수·학생수 데이터 확보 후에는 recompute를 가중치 기반으로 업그레이드 예정.
-- ============================================

-- 1) 행사에 수요점수·태그 컬럼
alter table public.events
  add column if not exists demand_score integer,
  add column if not exists demand_tags text[];

-- 2) 반경 1km 인근시설 개수 기반 수요점수/태그 재계산 (키 불필요)
--    점수 = 아파트*6 + 대학*15 + 지하철*10 + 대형마트*8 (상한 100)
--    태그 = 역세권(지하철≥1)·대학가(대학≥1)·주거밀집(아파트≥5)·상업지(마트≥1)
create or replace function public.recompute_event_demand() returns void as $$
  update public.events e set
    demand_score = s.score,
    demand_tags  = s.tags
  from (
    select
      e2.id,
      least(100, coalesce(c.apt,0)*6 + coalesce(c.uni,0)*15 + coalesce(c.sbw,0)*10 + coalesce(c.com,0)*8) as score,
      array_remove(array[
        case when coalesce(c.sbw,0) > 0  then '역세권'  end,
        case when coalesce(c.uni,0) > 0  then '대학가'  end,
        case when coalesce(c.apt,0) >= 5 then '주거밀집' end,
        case when coalesce(c.com,0) > 0  then '상업지'  end
      ], null) as tags
    from public.events e2
    cross join lateral (
      select
        count(*) filter (where li.category = 'apartment')  as apt,
        count(*) filter (where li.category = 'university') as uni,
        count(*) filter (where li.category = 'transit')    as sbw,
        count(*) filter (where li.category = 'commercial') as com
      from public.local_info li
      where (6371000 * acos(least(1,
        cos(radians(e2.lat)) * cos(radians(li.lat)) * cos(radians(li.lng) - radians(e2.lng))
        + sin(radians(e2.lat)) * sin(radians(li.lat))
      ))) < 1000
    ) c
    where e2.lat is not null
  ) s
  where e.id = s.id;
$$ language sql;

-- 3) 인근 행사(축제) 조회 — 같은 좌표계 반경 내 다른 승인 행사
create or replace function public.find_nearby_events(
  src_id uuid,
  radius_m integer default 20000
) returns table (
  id uuid,
  name text,
  start_date text,
  end_date text,
  kind text,
  distance_m integer
) as $$
  select
    ev.id, ev.name, ev.start_date::text, ev.end_date::text, ev.kind,
    (6371000 * acos(least(1,
      cos(radians(s.lat)) * cos(radians(ev.lat)) * cos(radians(ev.lng) - radians(s.lng))
      + sin(radians(s.lat)) * sin(radians(ev.lat))
    )))::integer as distance_m
  from public.events ev, public.events s
  where s.id = src_id
    and ev.id <> src_id
    and ev.lat is not null and s.lat is not null
    and coalesce(ev.review_status, 'approved') = 'approved'
    and (6371000 * acos(least(1,
      cos(radians(s.lat)) * cos(radians(ev.lat)) * cos(radians(ev.lng) - radians(s.lng))
      + sin(radians(s.lat)) * sin(radians(ev.lat))
    ))) < radius_m
  order by distance_m
  limit 6;
$$ language sql stable;

-- 4) 최초 1회 산출 실행
select public.recompute_event_demand();

-- ============================================
-- v14 완료. 이후 세대수·학생수 확보 시 recompute_event_demand를 가중치 기반으로 교체.
-- ============================================
