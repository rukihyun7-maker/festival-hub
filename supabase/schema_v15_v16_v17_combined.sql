-- ============================================
-- Festival Hub · 통합 SQL (v15 + v16 + v17)
-- 해자 강화 A/B단계 지원. 한 번에 실행. 재실행 안전(idempotent).
--   v15: 관리자 판매메뉴 열람 RLS
--   v16: 주최사 신청자 부스사진 열람 storage RLS
--   v17: 주최 명함 정보 컬럼(profiles.position / business_card_url)
-- 실행 순서: 기존 스키마(v1~v14) 이후 아무 때나.
-- ============================================


-- ── v15 · 관리자 판매메뉴 열람 ──────────────────
-- 가입 심사 시 관리자가 입점 파트너의 판매 메뉴를 열람할 수 있어야 함.
drop policy if exists "menus_select_admin" on public.menus;
create policy "menus_select_admin" on public.menus
  for select using (public.user_role() = 'admin');


-- ── v16 · 주최사 신청자 부스사진 열람 ────────────
-- 심사 공정성: 주최사는 자기 행사에 신청한 입점 파트너의 "부스 사진 3종"만 열람.
-- 민감 서류(사업자등록증·보건증 등)는 제외. 경로: documents/{sellerId}/{kind}/...
drop policy if exists "docs_storage_select_host_booth" on storage.objects;
create policy "docs_storage_select_host_booth" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[2] in ('booth_exterior', 'booth_interior', 'booth_storage')
    and exists (
      select 1
      from public.applications ap
      join public.events e on e.id = ap.event_id
      where ap.seller_id::text = (storage.foldername(name))[1]
        and e.owner_id = auth.uid()
    )
  );


-- ── v17 · 주최 명함 정보 컬럼 ────────────────────
-- 주최 가입 허들↓: 명함 정보(소속·직함·연락처) 입력으로 가입 → 즉시 행사 등록.
alter table public.profiles
  add column if not exists position text,            -- 담당자 직함/부서 (명함)
  add column if not exists business_card_url text;   -- (선택) 명함 이미지 storage 경로


-- ============================================
-- 완료. 확인:
--   select count(*) from pg_policies where policyname in ('menus_select_admin','docs_storage_select_host_booth');  -- 2
--   select column_name from information_schema.columns where table_name='profiles' and column_name in ('position','business_card_url');  -- 2행
-- ============================================
