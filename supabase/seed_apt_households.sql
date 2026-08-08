-- 국토부 공동주택 기본정보 → 아파트 세대수 (local_info.data.households 병합)
-- 재실행 안전. seed_nearby_kakao.sql 뒤 실행.

update public.local_info set data = data || '{"households":737}'::jsonb where category='apartment' and external_id='kakao-10523526';
update public.local_info set data = data || '{"households":948}'::jsonb where category='apartment' and external_id='kakao-11506175';
update public.local_info set data = data || '{"households":584}'::jsonb where category='apartment' and external_id='kakao-11506255';
update public.local_info set data = data || '{"households":396}'::jsonb where category='apartment' and external_id='kakao-11506211';
update public.local_info set data = data || '{"households":1974}'::jsonb where category='apartment' and external_id='kakao-23209035';
update public.local_info set data = data || '{"households":303}'::jsonb where category='apartment' and external_id='kakao-12984721';
update public.local_info set data = data || '{"households":480}'::jsonb where category='apartment' and external_id='kakao-1594296509';
update public.local_info set data = data || '{"households":305}'::jsonb where category='apartment' and external_id='kakao-908595634';
update public.local_info set data = data || '{"households":1177}'::jsonb where category='apartment' and external_id='kakao-7837099';
update public.local_info set data = data || '{"households":146}'::jsonb where category='apartment' and external_id='kakao-8049304';
update public.local_info set data = data || '{"households":355}'::jsonb where category='apartment' and external_id='kakao-11189080';
update public.local_info set data = data || '{"households":263}'::jsonb where category='apartment' and external_id='kakao-12274298';
update public.local_info set data = data || '{"households":186}'::jsonb where category='apartment' and external_id='kakao-11332633';
update public.local_info set data = data || '{"households":499}'::jsonb where category='apartment' and external_id='kakao-11093494';
update public.local_info set data = data || '{"households":298}'::jsonb where category='apartment' and external_id='kakao-27021009';
update public.local_info set data = data || '{"households":417}'::jsonb where category='apartment' and external_id='kakao-11365152';
update public.local_info set data = data || '{"households":107}'::jsonb where category='apartment' and external_id='kakao-11102636';
update public.local_info set data = data || '{"households":134}'::jsonb where category='apartment' and external_id='kakao-11223435';
update public.local_info set data = data || '{"households":273}'::jsonb where category='apartment' and external_id='kakao-8161787';
update public.local_info set data = data || '{"households":299}'::jsonb where category='apartment' and external_id='kakao-419588378';
update public.local_info set data = data || '{"households":176}'::jsonb where category='apartment' and external_id='kakao-11343832';
update public.local_info set data = data || '{"households":376}'::jsonb where category='apartment' and external_id='kakao-11363381';
update public.local_info set data = data || '{"households":298}'::jsonb where category='apartment' and external_id='kakao-19494594';
update public.local_info set data = data || '{"households":606}'::jsonb where category='apartment' and external_id='kakao-27120847';
update public.local_info set data = data || '{"households":586}'::jsonb where category='apartment' and external_id='kakao-11540445';
update public.local_info set data = data || '{"households":604}'::jsonb where category='apartment' and external_id='kakao-11119831';
update public.local_info set data = data || '{"households":512}'::jsonb where category='apartment' and external_id='kakao-11111080';
update public.local_info set data = data || '{"households":165}'::jsonb where category='apartment' and external_id='kakao-11131360';
update public.local_info set data = data || '{"households":158}'::jsonb where category='apartment' and external_id='kakao-11279211';
update public.local_info set data = data || '{"households":295}'::jsonb where category='apartment' and external_id='kakao-11328597';
update public.local_info set data = data || '{"households":295}'::jsonb where category='apartment' and external_id='kakao-13245790';
update public.local_info set data = data || '{"households":105}'::jsonb where category='apartment' and external_id='kakao-7835717';
update public.local_info set data = data || '{"households":122}'::jsonb where category='apartment' and external_id='kakao-11338369';
update public.local_info set data = data || '{"households":216}'::jsonb where category='apartment' and external_id='kakao-11184021';
update public.local_info set data = data || '{"households":53}'::jsonb where category='apartment' and external_id='kakao-11053075';
update public.local_info set data = data || '{"households":180}'::jsonb where category='apartment' and external_id='kakao-11356254';
update public.local_info set data = data || '{"households":384}'::jsonb where category='apartment' and external_id='kakao-11344696';
update public.local_info set data = data || '{"households":928}'::jsonb where category='apartment' and external_id='kakao-15104320';
update public.local_info set data = data || '{"households":137}'::jsonb where category='apartment' and external_id='kakao-1672184733';
update public.local_info set data = data || '{"households":231}'::jsonb where category='apartment' and external_id='kakao-11360678';
update public.local_info set data = data || '{"households":119}'::jsonb where category='apartment' and external_id='kakao-11219154';
update public.local_info set data = data || '{"households":150}'::jsonb where category='apartment' and external_id='kakao-17283194';
update public.local_info set data = data || '{"households":289}'::jsonb where category='apartment' and external_id='kakao-11011791';
update public.local_info set data = data || '{"households":1611}'::jsonb where category='apartment' and external_id='kakao-2051316578';
update public.local_info set data = data || '{"households":164}'::jsonb where category='apartment' and external_id='kakao-11010185';
update public.local_info set data = data || '{"households":313}'::jsonb where category='apartment' and external_id='kakao-11351345';
update public.local_info set data = data || '{"households":149}'::jsonb where category='apartment' and external_id='kakao-11350097';
update public.local_info set data = data || '{"households":291}'::jsonb where category='apartment' and external_id='kakao-11343390';
update public.local_info set data = data || '{"households":99}'::jsonb where category='apartment' and external_id='kakao-8270786';
update public.local_info set data = data || '{"households":414}'::jsonb where category='apartment' and external_id='kakao-359363331';
update public.local_info set data = data || '{"households":608}'::jsonb where category='apartment' and external_id='kakao-1091150845';
update public.local_info set data = data || '{"households":90}'::jsonb where category='apartment' and external_id='kakao-11007755';
update public.local_info set data = data || '{"households":169}'::jsonb where category='apartment' and external_id='kakao-11294754';
update public.local_info set data = data || '{"households":198}'::jsonb where category='apartment' and external_id='kakao-17357272';
update public.local_info set data = data || '{"households":210}'::jsonb where category='apartment' and external_id='kakao-11238199';
update public.local_info set data = data || '{"households":98}'::jsonb where category='apartment' and external_id='kakao-893311314';
update public.local_info set data = data || '{"households":180}'::jsonb where category='apartment' and external_id='kakao-17110920';
update public.local_info set data = data || '{"households":174}'::jsonb where category='apartment' and external_id='kakao-23979387';
update public.local_info set data = data || '{"households":168}'::jsonb where category='apartment' and external_id='kakao-23814988';
update public.local_info set data = data || '{"households":219}'::jsonb where category='apartment' and external_id='kakao-1130423737';
update public.local_info set data = data || '{"households":250}'::jsonb where category='apartment' and external_id='kakao-23813995';
update public.local_info set data = data || '{"households":270}'::jsonb where category='apartment' and external_id='kakao-11359934';

-- 세대수 반영 후 수요점수 재계산은 schema_v15.sql에서 인구기반으로 수행
-- 매칭 62건