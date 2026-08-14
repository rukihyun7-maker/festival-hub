-- ============================================
-- Festival Hub · Schema v24 · 푸드트럭 현장 상세(site_details)
-- A안: 전용 컬럼·필터 없이 jsonb 1개로 현장 인프라 상세를 담는다.
-- 예: { "power": "부스당 3kW", "generator": "가능", "water": "가능",
--       "drainage": "배수구 10m", "lpg": "제한적", "vehicle": "길이 6m·폭 2.2m",
--       "booth": "3x3m·아스팔트", "items": "주류 불가", "weather": "우천 시 순연" }
-- 민감정보 아님(현장 시설 정보). 상세 노출은 앱단 blind 게이트로 통제.
-- 재실행 안전.
-- ============================================

alter table public.events
  add column if not exists site_details jsonb;

comment on column public.events.site_details is '푸드트럭 현장 인프라 상세(전기용량·발전기·급배수·LPG·차량제원·부스사양·품목제한·우천정책). 앱 폼에서 입력.';
