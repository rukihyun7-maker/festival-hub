-- TourAPI 실데이터 축제 → 정보형 행사 (자동 생성)
-- 소유: 관리자 계정, kind=info, review_status=approved (즉시 노출)

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'가든 나이트 마켓','지역축제','한국관광공사 공개정보','2026-07-29','2026-08-29','울산','울산광역시 남구 대공원로 94 (옥동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.5310582726,129.2938457635,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='가든 나이트 마켓' and start_date='2026-07-29');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'감악산 꽃별 여행','지역축제','한국관광공사 공개정보','2026-09-18','2026-10-11','경남','경상남도 거창군 신원면 연수사길 452',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.5896217023,127.9175083031,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='감악산 꽃별 여행' and start_date='2026-09-18');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'강동선사문화축제','지역축제','한국관광공사 공개정보','2026-10-16','2026-10-18','서울','서울특별시 강동구 올림픽로 875 (암사동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.55906143476573,127.13060065465167,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='강동선사문화축제' and start_date='2026-10-16');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'강릉 국가유산 야행','지역축제','한국관광공사 공개정보','2026-08-14','2026-08-16','강원','강원특별자치도 강릉시 임영로131번길 6',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.7532215016,128.8920940489,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='강릉 국가유산 야행' and start_date='2026-08-14');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'강릉커피축제','지역축제','한국관광공사 공개정보','2026-10-21','2026-10-25','강원','강원특별자치도 강릉시 창해로14번길 20-1 (견소동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.7726104945,128.9473094259,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='강릉커피축제' and start_date='2026-10-21');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'거제맥주축제','지역축제','한국관광공사 공개정보','2026-09-11','2026-09-12','경남','경상남도 거제시 장승로 138 (장승포동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',34.8663308815,128.7245993248,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='거제맥주축제' and start_date='2026-09-11');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'경남고성공룡세계엑스포','지역축제','한국관광공사 공개정보','2026-09-22','2026-11-01','경남','경상남도 고성군 당항만로 1116',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.0533072967,128.3915143393,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='경남고성공룡세계엑스포' and start_date='2026-09-22');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'경북영주 풍기인삼축제','지역축제','한국관광공사 공개정보','2026-10-03','2026-10-11','경북','경상북도 영주시 풍기읍 성내리',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',36.868718,128.521518,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='경북영주 풍기인삼축제' and start_date='2026-10-03');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'계룡軍문화축제','지역축제','한국관광공사 공개정보','2026-10-01','2026-10-05','충남','충청남도 계룡시 신도안면 정장리',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',36.3067687,127.2371112,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='계룡軍문화축제' and start_date='2026-10-01');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'계촌 휴[休] 북&뮤직 페스티벌','지역축제','한국관광공사 공개정보','2026-09-12','2026-09-13','강원','강원특별자치도 평창군 방림면 계촌리',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.452191,128.302352,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='계촌 휴[休] 북&뮤직 페스티벌' and start_date='2026-09-12');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'고령 국가유산 야행','지역축제','한국관광공사 공개정보','2026-09-04','2026-09-06','경북','경상북도 고령군 대가야읍 대가야로 1216',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.7192916,128.2605623,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='고령 국가유산 야행' and start_date='2026-09-04');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'고양행주한우 숯불구이축제','지역축제','한국관광공사 공개정보','2026-10-31','2026-11-01','경기','경기도 고양시 덕양구 원당로 16 (주교동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.654669772497314,126.83276387204035,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='고양행주한우 숯불구이축제' and start_date='2026-10-31');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'고양호수예술축제','지역축제','한국관광공사 공개정보','2026-09-18','2026-09-20','경기','경기도 고양시 일산동구 호수로 595 (장항동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.6552847261,126.7689082803,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='고양호수예술축제' and start_date='2026-09-18');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'고창모양성제','지역축제','한국관광공사 공개정보','2026-10-15','2026-10-19','전북','전북특별자치도 고창군 고창읍 모양성로 11',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.43314793158578,126.70350182663505,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='고창모양성제' and start_date='2026-10-15');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'공주 국가유산 야행','지역축제','한국관광공사 공개정보','2026-09-04','2026-09-06','충남','충청남도 공주시 우체국길 8',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',36.4543392909,127.1220001033,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='공주 국가유산 야행' and start_date='2026-09-04');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'과천공연예술축제','지역축제','한국관광공사 공개정보','2026-09-18','2026-09-20','경기','경기도 과천시 관문로 64 (중앙동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.4273687532,126.989303818,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='과천공연예술축제' and start_date='2026-09-18');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'관악강감찬축제','지역축제','한국관광공사 공개정보','2026-10-16','2026-10-18','서울','서울특별시 관악구 낙성대로 77 (봉천동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.4715875501,126.9587204342,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='관악강감찬축제' and start_date='2026-10-16');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'광안리 M(Marvelous) 드론 라이트쇼','지역축제','한국관광공사 공개정보','2026-01-01','2026-12-31','부산','부산광역시 수영구 광안해변로 219 (광안동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.1537727886,129.1185199367,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='광안리 M(Marvelous) 드론 라이트쇼' and start_date='2026-01-01');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'괴산고추축제','지역축제','한국관광공사 공개정보','2026-09-03','2026-09-06','충북','충청북도 괴산군 괴산읍 임꺽정로 92',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',36.8146523386,127.7862009278,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='괴산고추축제' and start_date='2026-09-03');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'구미라면 축제','지역축제','한국관광공사 공개정보','2026-11-06','2026-11-08','경북','경상북도 구미시 원평동',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',36.129404,128.331422,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='구미라면 축제' and start_date='2026-11-06');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'국악공연 진연','지역축제','한국관광공사 공개정보','2026-01-01','2026-12-31','서울','서울특별시 종로구 인사동5길 10 (인사동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.5728652641047,126.985653181823,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='국악공연 진연' and start_date='2026-01-01');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'군산시간여행축제','지역축제','한국관광공사 공개정보','2026-10-02','2026-10-05','전북','전북특별자치도 군산시 중앙로1가',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.987791,126.711671,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='군산시간여행축제' and start_date='2026-10-02');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'귀몽 제주신화월드','지역축제','한국관광공사 공개정보','2026-07-24','2026-08-17','제주','제주특별자치도 서귀포시 안덕면 신화역사로304번길 98',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',33.3049276506,126.3151497973,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='귀몽 제주신화월드' and start_date='2026-07-24');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'금산세계인삼축제','지역축제','한국관광공사 공개정보','2026-10-02','2026-10-11','충남','충청남도 금산군 금산읍 인삼광장로 30',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',36.1001535022,127.5005221346,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='금산세계인삼축제' and start_date='2026-10-02');

-- 총 24건