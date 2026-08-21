-- Festival Hub · v30 · 외부 축제 자동 갱신용 식별자(ext_id)
-- TourAPI contentid를 저장해 매일 자동 갱신(upsert) 시 같은 축제를 매칭.
-- (source, ext_id) 고유 인덱스로 중복 방지. ext_id는 외부 연동 행사만 채워짐.
alter table public.events add column if not exists ext_id text;

-- 같은 출처의 같은 외부 ID는 1건만. (일반 사용자 행사는 source/ext_id 모두 null → NULL은 서로 구별되어 충돌 없음)
create unique index if not exists events_source_ext_id_key
  on public.events (source, ext_id);
