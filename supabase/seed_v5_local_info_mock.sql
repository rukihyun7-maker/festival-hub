-- ============================================
-- Festival Hub · v5 목업 데이터 (인근지역 정보 데모용)
-- schema_v5_local_info.sql 실행 후 이 파일 실행
-- 실 데이터(카카오 지오코딩·국토부·대학알리미)는 Phase B~D 스크립트로 대체 예정
-- ============================================

-- 1. 서울 소재 이벤트에 목업 지오코딩 (건대입구 좌표)
update public.events
  set lat = 37.5405, lng = 127.0700, geocoded_at = now()
  where region ilike '%서울%';

-- 2. 건대입구 반경 1km 내 목업 인근 정보
insert into public.local_info (category, external_id, name, region, address, lat, lng, data, source) values
  ('apartment','mock-apt-1','더샵 스타시티','서울 광진구','서울 광진구 자양동',37.5385,127.0700,'{"households":1310,"buildings":4,"type":"주상복합"}','manual'),
  ('apartment','mock-apt-2','우성1차아파트','서울 광진구','서울 광진구 화양동',37.5435,127.0685,'{"households":540,"buildings":6,"type":"아파트"}','manual'),
  ('apartment','mock-apt-3','광진 트라팰리스','서울 광진구','서울 광진구 구의동',37.5420,127.0730,'{"households":880,"buildings":5,"type":"주상복합"}','manual'),
  ('university','mock-uni-1','건국대학교','서울 광진구','서울 광진구 능동로 120',37.5407,127.0742,'{"enrolled":15600,"capacity":3100,"campus":"본교","type":"종합대"}','manual'),
  ('university','mock-uni-2','세종대학교','서울 광진구','서울 광진구 능동로 209',37.5445,127.0720,'{"enrolled":10800,"capacity":2400,"campus":"본교","type":"종합대"}','manual'),
  ('festival','mock-fest-1','건국대 녹색지대 축제','서울 광진구','서울 광진구 능동로 120',37.5407,127.0742,'{"start_date":"2026-05-20","end_date":"2026-05-22","lineup":["헤드라이너A","헤드라이너B"],"external_entry":true}','manual'),
  ('transit','mock-transit-1','건대입구역','서울 광진구','서울 광진구 능동로',37.5404,127.0703,'{"lines":["2호선","7호선"]}','manual')
on conflict (category, external_id, source) do nothing;
