-- 카카오 지오코딩: 행사 주소 → 좌표(위경도) UPDATE

update public.events set lat=37.7726408737014, lng=128.947232196754, geocoded_at=now() where id='11111111-0000-4000-8000-000000000002';
update public.events set lat=37.39279369494, lng=127.112017130086, geocoded_at=now() where id='11111111-0000-4000-8000-000000000005';
update public.events set lat=37.5418533847037, lng=127.028318752907, geocoded_at=now() where id='cbeed2b9-ef7f-4aad-96b0-b0a824406097';
update public.events set lat=37.5418533847037, lng=127.028318752907, geocoded_at=now() where id='72e3c8c9-030f-4cf5-8dbd-5be033f4fedb';
update public.events set lat=37.4864453737544, lng=127.48091501109, geocoded_at=now() where id='a29b2aaf-51f8-4b3d-ad6a-22b957bbf489';

-- 성공 5/6건