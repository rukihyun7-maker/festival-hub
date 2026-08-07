-- TourAPI 실데이터 축제 → 정보형 행사 (자동 생성)
-- 조건: 총 50 · 지역별 5 · 종료>=2026-08-08

-- 기존 TourAPI 수집 축제를 먼저 정리(깔끔한 교체 · 정보형이라 신청 데이터 없음)
delete from public.events where source = '한국관광공사 TourAPI';

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'페인터즈','지역축제','한국관광공사 공개정보','2022-11-01','2026-12-31','서울','서울특별시 중구 정동길 3 (정동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.5681732680976,126.969976113229,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='페인터즈' and start_date='2022-11-01');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'광안리 M(Marvelous) 드론 라이트쇼','지역축제','한국관광공사 공개정보','2026-01-01','2026-12-31','부산','부산광역시 수영구 광안해변로 219 (광안동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.1537727886,129.1185199367,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='광안리 M(Marvelous) 드론 라이트쇼' and start_date='2026-01-01');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'국악공연 진연','지역축제','한국관광공사 공개정보','2026-01-01','2026-12-31','서울','서울특별시 종로구 인사동5길 10 (인사동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.5728652641047,126.985653181823,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='국악공연 진연' and start_date='2026-01-01');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'남산봉수의식 등 전통문화행사','지역축제','한국관광공사 공개정보','2026-01-01','2026-12-31','서울','서울특별시 종로구 종로 54 (관철동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.5697673859634,126.983677617361,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='남산봉수의식 등 전통문화행사' and start_date='2026-01-01');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'서울 왕궁수문장 교대의식','지역축제','한국관광공사 공개정보','2026-01-01','2026-12-31','서울','서울특별시 중구 세종대로 99 (정동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.565054919430565,126.97657463444833,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='서울 왕궁수문장 교대의식' and start_date='2026-01-01');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'2026 숭례문 파수의식','지역축제','한국관광공사 공개정보','2026-01-01','2026-12-31','서울','서울특별시 중구 세종대로 40 (남대문로4가)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.55992837962214,126.97536090852309,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='2026 숭례문 파수의식' and start_date='2026-01-01');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'왕가의 산책','지역축제','한국관광공사 공개정보','2026-01-05','2026-12-31','인천','인천광역시 영종구 공항로 272 (운서동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.458350712273,126.427699293474,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='왕가의 산책' and start_date='2026-01-05');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'APAP 작품투어 (안양공공예술프로젝트)','지역축제','한국관광공사 공개정보','2026-03-10','2026-11-30','경기','경기도 안양시 만안구 예술공원로 180 (안양동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.41945269174406,126.92561681569023,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='APAP 작품투어 (안양공공예술프로젝트)' and start_date='2026-03-10');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'2026 국립극장 쏙쏙들이페스티벌','지역축제','한국관광공사 공개정보','2026-03-14','2026-12-26','경기','경기도 파주시 탄현면 헤이리로 16',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.7832839326,126.6946859929,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='2026 국립극장 쏙쏙들이페스티벌' and start_date='2026-03-14');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'쉼표：비우고, 머무르고, 채우는','지역축제','한국관광공사 공개정보','2026-03-21','2026-08-17','경북','경상북도 경주시 금성로 260-6 (노서동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.8405467269236,129.207631152376,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='쉼표：비우고, 머무르고, 채우는' and start_date='2026-03-21');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'2026 문화가 있는 날','지역축제','한국관광공사 공개정보','2026-04-01','2026-11-29','인천','인천광역시 제물포구 송현동',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.476334,126.632619,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='2026 문화가 있는 날' and start_date='2026-04-01');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'안성 남사당바우덕이 풍물단 상설 공연 ‘곰뱅이텄다’','지역축제','한국관광공사 공개정보','2026-04-04','2026-11-29','경기','경기도 안성시 보개면 남사당로 198-2',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.0317706868448,127.310126633916,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='안성 남사당바우덕이 풍물단 상설 공연 ‘곰뱅이텄다’' and start_date='2026-04-04');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'2026 서귀포 원도심 문화페스티벌','지역축제','한국관광공사 공개정보','2026-04-11','2026-10-30','제주','제주특별자치도 서귀포시 이중섭로 11 (서귀동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',33.24708081676599,126.56445889201075,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='2026 서귀포 원도심 문화페스티벌' and start_date='2026-04-11');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'전주한옥마을 전통연희 퍼레이드-노상놀이야','지역축제','한국관광공사 공개정보','2026-04-18','2026-10-31','전북','전북특별자치도 전주시 완산구 태조로 44 (풍남동3가)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.814171786262136,127.15002124718735,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='전주한옥마을 전통연희 퍼레이드-노상놀이야' and start_date='2026-04-18');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'컬처라운지 경기, 장(場)','지역축제','한국관광공사 공개정보','2026-04-18','2026-12-15','경기','경기도 수원시 영통구 도청로 지하36 (이의동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.2879129895568,127.054491044714,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='컬처라운지 경기, 장(場)' and start_date='2026-04-18');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'나오라쇼','지역축제','한국관광공사 공개정보','2026-04-25','2026-10-31','강원','강원특별자치도 원주시 지정면 소금산길 12',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.36457643111233,127.83403799313135,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='나오라쇼' and start_date='2026-04-25');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'새연교 주말 문화공연 ''금토금토 새연쇼''','지역축제','한국관광공사 공개정보','2026-04-25','2026-10-31','제주','제주특별자치도 서귀포시 남성중로 40 (서홍동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',33.239201142544914,126.5584238742126,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='새연교 주말 문화공연 ''금토금토 새연쇼''' and start_date='2026-04-25');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'충북 괴산 우주특별시：별별탐사대','지역축제','한국관광공사 공개정보','2026-04-30','2026-12-06','충북','충청북도 괴산군 괴산읍 충민로검승1길 6',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',36.8053358842675,127.824356316082,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='충북 괴산 우주특별시：별별탐사대' and start_date='2026-04-30');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'2026 화성행궁 야간개장','지역축제','한국관광공사 공개정보','2026-05-01','2026-11-01','경기','경기도 수원시 팔달구 정조로 825 (남창동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.2818163237,127.0163732353,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='2026 화성행궁 야간개장' and start_date='2026-05-01');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'제24회 동강국제사진제','지역축제','한국관광공사 공개정보','2026-07-17','2026-10-11','강원','강원특별자치도 영월군 영월읍 영월로 1909-10',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.1819133415,128.4614563757,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='제24회 동강국제사진제' and start_date='2026-07-17');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'춘천 썸머워터 페스티벌','지역축제','한국관광공사 공개정보','2026-07-17','2026-08-17','강원','강원특별자치도 춘천시 삼천동 200-9',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.8724857,127.7002608,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='춘천 썸머워터 페스티벌' and start_date='2026-07-17');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'태백 해바라기축제','지역축제','한국관광공사 공개정보','2026-07-17','2026-08-17','강원','강원특별자치도 태백시 구와우길 38-20',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.2068978478,128.9895710269,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='태백 해바라기축제' and start_date='2026-07-17');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'귀몽 제주신화월드','지역축제','한국관광공사 공개정보','2026-07-24','2026-08-17','제주','제주특별자치도 서귀포시 안덕면 신화역사로304번길 98',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',33.3049276506,126.3151497973,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='귀몽 제주신화월드' and start_date='2026-07-24');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'보령머드축제','지역축제','한국관광공사 공개정보','2026-07-24','2026-08-09','충남','충청남도 보령시 신흑동',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',36.314822,126.515029,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='보령머드축제' and start_date='2026-07-24');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'2026 토요상설무대 프러포즈 및 사천 락 페스티벌','지역축제','한국관광공사 공개정보','2026-07-25','2026-08-15','경남','경상남도 사천시 사천대로 35 (대방동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',34.9331652948,128.0507877466,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='2026 토요상설무대 프러포즈 및 사천 락 페스티벌' and start_date='2026-07-25');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'가든 나이트 마켓','지역축제','한국관광공사 공개정보','2026-07-29','2026-08-29','울산','울산광역시 남구 대공원로 94 (옥동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.5310582726,129.2938457635,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='가든 나이트 마켓' and start_date='2026-07-29');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'EX HORROR 시즌 6 : 신라X좀비','지역축제','한국관광공사 공개정보','2026-08-01','2026-08-30','경북','경상북도 경주시 경감로 614 (천군동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.8340147657,129.2895153224,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='EX HORROR 시즌 6 : 신라X좀비' and start_date='2026-08-01');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'홍천강 별빛음악 맥주축제','지역축제','한국관광공사 공개정보','2026-08-05','2026-08-09','강원','강원특별자치도 홍천군 홍천읍 갈마곡리',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.689158,127.893014,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='홍천강 별빛음악 맥주축제' and start_date='2026-08-05');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'우리동네 문화아지트 : LH주택전시관 복합문화행사','지역축제','한국관광공사 공개정보','2026-08-06','2026-08-22','세종','세종특별자치시 대평동 270-8',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',36.4711413718,127.2722214092,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='우리동네 문화아지트 : LH주택전시관 복합문화행사' and start_date='2026-08-06');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'전주 가맥축제','지역축제','한국관광공사 공개정보','2026-08-06','2026-08-08','전북','전북특별자치도 전주시 덕진구 권삼득로 308 (덕진동1가)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.8442101179,127.1292609884,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='전주 가맥축제' and start_date='2026-08-06');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'2026 부산국제불교박람회','지역축제','한국관광공사 공개정보','2026-08-06','2026-08-09','부산','부산광역시 해운대구 APEC로 55 (우동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.1687048508,129.1354937071,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='2026 부산국제불교박람회' and start_date='2026-08-06');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'밀양 수퍼 페스티벌','지역축제','한국관광공사 공개정보','2026-08-07','2026-08-09','경남','경상남도 밀양시 삼문동 1-1번지',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.489859,128.757295,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='밀양 수퍼 페스티벌' and start_date='2026-08-07');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'부산바다축제','지역축제','한국관광공사 공개정보','2026-08-07','2026-08-13','부산','부산광역시 사하구 다대동',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.046996,128.966195,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='부산바다축제' and start_date='2026-08-07');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'송도해변축제','지역축제','한국관광공사 공개정보','2026-08-08','2026-08-15','인천','인천광역시 연수구 아암대로 764 (송도동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',37.3990127926,126.6562376599,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='송도해변축제' and start_date='2026-08-08');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'2026 부산바다도서관','지역축제','한국관광공사 공개정보','2026-08-11','2026-08-13','부산','부산광역시 수영구 민락동 110-19',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.154689,129.132986,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='2026 부산바다도서관' and start_date='2026-08-11');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'통영한산대첩축제','지역축제','한국관광공사 공개정보','2026-08-12','2026-08-16','경남','경상남도 통영시 통영해안로 267 (항남동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',34.84040499,128.4246286625,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='통영한산대첩축제' and start_date='2026-08-12');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'부산인디커넥트페스티벌 2026','지역축제','한국관광공사 공개정보','2026-08-14','2026-08-16','부산','부산광역시 해운대구 APEC로 55 (우동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.1687048508,129.1354937071,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='부산인디커넥트페스티벌 2026' and start_date='2026-08-14');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'진주의 수호자들','지역축제','한국관광공사 공개정보','2026-08-14','2026-09-06','경남','경상남도 진주시 강남로 287 (강남동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.1879338891,128.0858237357,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='진주의 수호자들' and start_date='2026-08-14');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'홍성 국가유산 야행','지역축제','한국관광공사 공개정보','2026-08-14','2026-08-15','충남','충청남도 홍성군 홍성읍 아문길 27',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',36.6017210412,126.6613891711,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='홍성 국가유산 야행' and start_date='2026-08-14');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'2026 경주 e스포츠 페스티벌','지역축제','한국관광공사 공개정보','2026-08-15','2026-08-23','경북','경상북도 경주시 황성공원로 29 (황성동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.8606451724,129.2090805222,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='2026 경주 e스포츠 페스티벌' and start_date='2026-08-15');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'사천시 삼천포항 자연산 전어축제','지역축제','한국관광공사 공개정보','2026-08-20','2026-08-23','경남','경상남도 사천시 팔포3길 56-35 (동금동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',34.9273831672,128.078886292,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='사천시 삼천포항 자연산 전어축제' and start_date='2026-08-20');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'서천 홍원항 자연산 전어 꽃게 축제','지역축제','한국관광공사 공개정보','2026-08-22','2026-09-06','충남','충청남도 서천군 홍원길 88',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',36.1562870722,126.5012838671,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='서천 홍원항 자연산 전어 꽃게 축제' and start_date='2026-08-22');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'오감만족 문경새재맨발페스티벌','지역축제','한국관광공사 공개정보','2026-08-22','2026-08-22','경북','경상북도 문경시 문경읍 새재로 932',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',36.7616034611,128.0769891081,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='오감만족 문경새재맨발페스티벌' and start_date='2026-08-22');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'2026 제5회 제주비엔날레 허끄곡 모닥치곡 이야홍 : 변용의 기술','지역축제','한국관광공사 공개정보','2026-08-25','2026-11-15','제주','제주특별자치도 제주시 1100로 2894-78 (연동)',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',33.4525500193,126.489686091,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='2026 제5회 제주비엔날레 허끄곡 모닥치곡 이야홍 : 변용의 기술' and start_date='2026-08-25');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'영동포도축제','지역축제','한국관광공사 공개정보','2026-08-27','2026-08-30','충북','충청북도 영동군 영동읍 영동힐링로 117',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',36.1563534107,127.786513691,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='영동포도축제' and start_date='2026-08-27');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'세계유산축전','지역축제','한국관광공사 공개정보','2026-08-28','2026-10-25','경북','경상북도 안동시 풍천면 하회종가길 2-1',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',36.5407525056,128.5227975834,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='세계유산축전' and start_date='2026-08-28');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'장항 맥문동 꽃 축제','지역축제','한국관광공사 공개정보','2026-08-28','2026-08-30','충남','충청남도 서천군 장항읍 송림리 산58-48',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',36.0184392979,126.6655625042,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='장항 맥문동 꽃 축제' and start_date='2026-08-28');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'제7회 고창농악 꽃대림축제','지역축제','한국관광공사 공개정보','2026-08-28','2026-08-30','전북','전북특별자치도 고창군 성송면 향산1길 106',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.3835095686,126.6404331137,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='제7회 고창농악 꽃대림축제' and start_date='2026-08-28');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'트레저헌터 in 진안','지역축제','한국관광공사 공개정보','2026-08-29','2026-09-19','전북','전북특별자치도 진안군 진안읍 외사양길 16-19',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',35.7769952225,127.4158812719,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='트레저헌터 in 진안' and start_date='2026-08-29');

insert into public.events (owner_id,name,category,organizer,start_date,end_date,region,address,visitors,capacity,fee,fee_rate,deadline,electric,water,gas,parking,description,contact,phone,status,kind,source,lat,lng,geocoded_at,review_status)
select id,'2026 천안 K-컬처박람회','지역축제','한국관광공사 공개정보','2026-09-02','2026-09-06','충남','충청남도 천안시 동남구 목천읍 독립기념관로 1',null,'공고 예정',0,0,null,false,false,false,false,'공공데이터(한국관광공사 TourAPI)에서 수집한 축제 정보입니다. 신청형 아님(정보 제공).',null,null,'upcoming','info','한국관광공사 TourAPI',36.7773487289308,127.2325927550662,now(),'approved'
from public.profiles where email='admin@festival.demo' and not exists (select 1 from public.events where name='2026 천안 K-컬처박람회' and start_date='2026-09-02');

-- 총 50건 · 지역분포: 서울 5, 부산 5, 인천 3, 경기 5, 경북 5, 제주 4, 전북 4, 강원 5, 충북 2, 충남 5, 경남 5, 울산 1, 세종 1