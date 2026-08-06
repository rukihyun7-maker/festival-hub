-- ============================================
-- Festival Hub · Schema v2 · Documents
-- schema.sql + policies.sql + seed.sql 실행 후 이 파일 실행
-- 셀러 필수 서류 5종 관리
-- ============================================

-- 1. documents 테이블
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in (
    'business_reg',   -- 사업자등록증
    'food_hygiene',   -- 식품위생업 신고증
    'insurance',      -- 영업배상책임보험
    'hygiene_edu',    -- 위생교육 이수증
    'vehicle_reg'     -- 차량등록증 (푸드트럭)
  )),
  file_url text,           -- Supabase Storage 경로 (nullable · 목업 단계)
  file_name text,          -- 원본 파일명
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected', 'expired')),
  expires_at date,         -- 만료일 (보험/위생교육/차량등록증만 유효)
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  memo text,               -- 반려 사유 또는 관리자 메모
  uploaded_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(seller_id, kind)  -- 셀러당 서류 종류별 1건
);

create index if not exists idx_documents_seller on public.documents(seller_id);
create index if not exists idx_documents_status on public.documents(status);
create index if not exists idx_documents_expires on public.documents(expires_at) where expires_at is not null;

-- 2. updated_at 트리거
drop trigger if exists trg_documents_updated on public.documents;
create trigger trg_documents_updated before update on public.documents
  for each row execute function public.set_updated_at();

-- 3. RLS
alter table public.documents enable row level security;

-- 셀러: 본인 서류만 · 관리자: 전체
drop policy if exists "docs_select_own_admin" on public.documents;
create policy "docs_select_own_admin" on public.documents
  for select using (
    auth.uid() = seller_id or public.user_role() = 'admin'
  );

-- 셀러: 본인 서류 CRUD
drop policy if exists "docs_all_own" on public.documents;
create policy "docs_all_own" on public.documents
  for all using (auth.uid() = seller_id);

-- 관리자: 검증 승인/거절 (update만)
drop policy if exists "docs_admin_update" on public.documents;
create policy "docs_admin_update" on public.documents
  for update using (public.user_role() = 'admin');

-- 4. 시드 · 홍길동 셀러의 서류 5종
-- (schema.sql 시드에서 만든 셀러 계정 UUID 사용)
insert into public.documents (seller_id, kind, file_name, status, expires_at, uploaded_at, reviewed_at)
values
  ('00000000-0000-4000-8000-000000000001', 'business_reg', '사업자등록증_트럭펀트.pdf', 'verified', null, now() - interval '60 days', now() - interval '55 days'),
  ('00000000-0000-4000-8000-000000000001', 'food_hygiene', '식품위생업신고증_트럭펀트.pdf', 'verified', null, now() - interval '60 days', now() - interval '55 days'),
  ('00000000-0000-4000-8000-000000000001', 'insurance', '영업배상책임보험_2026.pdf', 'verified', current_date + interval '7 days', now() - interval '355 days', now() - interval '350 days'),
  ('00000000-0000-4000-8000-000000000001', 'hygiene_edu', '위생교육이수증_2026.pdf', 'verified', current_date + interval '150 days', now() - interval '210 days', now() - interval '205 days'),
  ('00000000-0000-4000-8000-000000000001', 'vehicle_reg', '차량등록증_2020모하비.pdf', 'pending', current_date + interval '365 days', now() - interval '2 days', null)
on conflict (seller_id, kind) do update set
  status = excluded.status,
  expires_at = excluded.expires_at;

-- 5. 만료 임박 자동 감지 헬퍼 뷰
create or replace view public.documents_with_urgency as
select
  d.*,
  case
    when d.status = 'rejected' then 'rejected'
    when d.expires_at is not null and d.expires_at < current_date then 'expired'
    when d.expires_at is not null and d.expires_at < current_date + interval '14 days' then 'expiring'
    when d.status = 'verified' then 'verified'
    when d.status = 'pending' then 'pending'
    else 'unknown'
  end as urgency
from public.documents d;

-- ============================================
-- v2 완료
-- 로그인 후 /seller/documents 접속 · 5종 서류 확인
-- ============================================
