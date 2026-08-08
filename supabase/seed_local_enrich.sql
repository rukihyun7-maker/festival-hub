-- ============================================
-- Festival Hub · 인근시설 수치 보강 (참고 지표)
-- 실행 순서: seed_nearby_kakao.sql 뒤에 실행 (local_info에 대학 3곳이 있어야 함)
-- 대학 재학생수 = 학교 전체·공시 근사치("약") · 참고 지표. 캠퍼스별 실수치 아님.
-- 아파트 세대수는 국토부 '공동주택 기본정보 서비스' 연동 후 별도 SQL로 추가 예정.
-- 재실행 안전(data 병합, 기존 키 보존).
-- ============================================

-- 대학 재학생수 (data.enrolled 병합) — 카드에 "재학생 약 N명"으로 표시
update public.local_info
  set data = data || '{"enrolled":15000,"enrolled_note":"학교 전체·공시 약"}'::jsonb
  where category = 'university' and external_id = 'kakao-12840668';   -- 건국대학교 서울캠퍼스

update public.local_info
  set data = data || '{"enrolled":13000,"enrolled_note":"학교 전체·공시 약"}'::jsonb
  where category = 'university' and external_id = 'kakao-21272164';   -- 국립공주대학교

update public.local_info
  set data = data || '{"enrolled":6000,"enrolled_note":"학교 전체·공시 약"}'::jsonb
  where category = 'university' and external_id = 'kakao-24917807';   -- 덕성여자대학교

-- 확인
-- select name, data->>'enrolled' as enrolled from public.local_info where category='university';
