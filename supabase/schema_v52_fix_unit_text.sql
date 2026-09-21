-- ============================================
-- Festival Hub · v52 · 창고 품목 단위 글자 정리 (일회성 보정)
--  · 낱개 단위/묶음 단위 칸에 숫자가 섞여 들어간 경우 정리
--    예) base_unit '20봉' → '봉', '100개' → '개'
--  · 수량(warehouse_qty/out_qty 등)은 건드리지 않음 (표시 단위 글자만 보정)
-- 재실행 안전.
-- ============================================

-- 낱개 단위에서 숫자 제거 (비면 '개')
update public.inventory_items
set base_unit = coalesce(nullif(trim(regexp_replace(base_unit, '[0-9]', '', 'g')), ''), '개')
where base_unit ~ '[0-9]';

-- 낱개로만 관리하는 품목(pack_size<=1)의 묶음 단위도 동일하게 정리
update public.inventory_items
set unit = coalesce(nullif(trim(regexp_replace(unit, '[0-9]', '', 'g')), ''), base_unit)
where pack_size <= 1 and unit ~ '[0-9]';
