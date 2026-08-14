-- ============================================
-- Festival Hub · 유령 서류(file_url은 있으나 실제 파일 없음) 진단·정리
-- 증상: 주최/관리자 화면에서 파일이 없는데 '열람' 버튼이 활성화됨.
-- 원인: documents.file_url 에 경로가 있지만 storage.objects 에 실제 객체가 없음
--       (시드/테스트 데이터, 또는 파일만 삭제되고 행이 남은 경우).
-- ============================================

-- STEP 1. 진단 — 실제 Storage 파일과 대조해 '유령 행' 목록 확인
--   (storage.objects.name = documents.file_url 매칭이 없으면 유령)
select
  d.id,
  p.name        as seller_name,
  p.business_name,
  d.kind,
  d.status,
  d.file_name,
  d.file_url
from public.documents d
join public.profiles p on p.id = d.seller_id
left join storage.objects o
  on o.bucket_id = 'documents' and o.name = d.file_url
where d.file_url is not null
  and o.id is null           -- 실제 파일이 없는 행만
order by p.name, d.kind;

-- ── 위 결과를 확인한 뒤, 아래 둘 중 하나로 정리하세요 ──

-- STEP 2-A. (권장) 유령 행의 파일 정보만 비우기 → 화면에 '미첨부'로 표시, 이력은 보존
-- update public.documents d
-- set file_url = null, file_name = null, status = 'pending', updated_at = now()
-- from public.profiles p
-- left join storage.objects o
--   on o.bucket_id = 'documents' and o.name = d.file_url
-- where d.seller_id = p.id
--   and d.file_url is not null
--   and o.id is null;

-- STEP 2-B. (완전 삭제) 유령 행 자체를 제거
-- delete from public.documents d
-- using (
--   select d2.id from public.documents d2
--   left join storage.objects o
--     on o.bucket_id = 'documents' and o.name = d2.file_url
--   where d2.file_url is not null and o.id is null
-- ) ghost
-- where d.id = ghost.id;
