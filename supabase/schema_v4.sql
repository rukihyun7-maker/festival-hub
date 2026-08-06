-- ============================================
-- Festival Hub · Schema v4
-- 실행 순서: ... schema_v3.sql 다음
-- 추가: (1) 입점 승인 확인 QR  (2) 셀러 수기/외부 참여이력
-- ============================================

-- --------------------------------------------
-- 1. 입점 승인 확인 QR
--    승인된 신청에 QR 토큰 발급 → 현장/주최사가 스캔해 입점 자격 확인 (결제 아님)
-- --------------------------------------------
alter table public.applications
  add column if not exists qr_token uuid,
  add column if not exists qr_issued_at timestamptz;

-- 승인 전환 시 QR 토큰 자동 발급
create or replace function public.issue_qr_on_approve()
returns trigger as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    if new.qr_token is null then
      new.qr_token := gen_random_uuid();
    end if;
    new.qr_issued_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_issue_qr on public.applications;
create trigger trg_issue_qr before update on public.applications
  for each row execute function public.issue_qr_on_approve();

-- 기존 승인 신청 백필 (시드로 직접 insert된 건 트리거를 안 타므로)
update public.applications
  set qr_token = gen_random_uuid(),
      qr_issued_at = coalesce(reviewed_at, now())
  where status = 'approved' and qr_token is null;

-- QR 검증 RPC (현장 스캔 · 토큰으로 승인 입점 확인) · 공개 실행 허용
create or replace function public.verify_qr(p_token uuid)
returns table (
  seller_name text,
  business_name text,
  event_name text,
  event_start date,
  event_end date,
  status text,
  approved_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select sp.name, sp.business_name, e.name, e.start_date, e.end_date, a.status, a.reviewed_at
  from public.applications a
  join public.events e on e.id = a.event_id
  join public.profiles sp on sp.id = a.seller_id
  where a.qr_token = p_token and a.status = 'approved';
$$;

grant execute on function public.verify_qr(uuid) to anon, authenticated;

-- --------------------------------------------
-- 2. seller_history · 셀러 수기/외부 참여이력
--    신규 셀러가 가입 시 과거 주요 행사 실적을 직접 등록해 신뢰도 확보.
--    플랫폼 실적(sales)과 별개로, self_reported=true 로 구분 표시.
-- --------------------------------------------
create table if not exists public.seller_history (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  event_name text not null,
  event_date date,
  region text,
  orders integer,       -- 판매건수 (선택)
  revenue integer,      -- 매출 (선택)
  note text,
  self_reported boolean not null default true, -- 직접 등록(외부 실적) 여부
  created_at timestamptz default now()
);

create index if not exists idx_seller_history_seller on public.seller_history(seller_id);

alter table public.seller_history enable row level security;

-- 본인 + 관련 주최사/관리자 조회 (심사 시 열람)
drop policy if exists "hist_select" on public.seller_history;
create policy "hist_select" on public.seller_history
  for select using (
    auth.uid() = seller_id or public.user_role() in ('host', 'admin')
  );

-- 본인만 등록/수정/삭제
drop policy if exists "hist_own_write" on public.seller_history;
create policy "hist_own_write" on public.seller_history
  for all using (auth.uid() = seller_id);

-- ============================================
-- v4 완료
-- 다음: types.ts (Application.qr_token, SellerHistory, verify_qr 반환형)
--       → queries.ts (수기이력 CRUD, 매출 기록, QR 검증)
--       → 페이지 (온보딩 수기이력 폼, 매출 기록 폼, /verify/[token], 주최사 QR)
-- ============================================
