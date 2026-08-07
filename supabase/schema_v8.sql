-- ============================================
-- Festival Hub · Schema v8 · 승인 절차(게이트) 도입
-- 실행 순서: ... -> v7 -> (이 파일)
-- 추가: 셀러 가입 심사(profiles.status) + 행사 등록 요청 승인(events.review_status)
-- ============================================

-- --------------------------------------------
-- 1. profiles.status · 셀러 가입 심사 상태
--    기존 계정은 모두 '정상'으로 유지, 신규 셀러 가입만 '가입 심사'
-- --------------------------------------------
alter table public.profiles
  add column if not exists status text not null default '정상'
    check (status in ('정상', '가입 심사', '정지'));

-- --------------------------------------------
-- 2. events.review_status · 행사 등록 요청 심사 상태
--    기존 행사는 모두 'approved'(노출 유지), 신규 주최 등록만 'pending'
-- --------------------------------------------
alter table public.events
  add column if not exists review_status text not null default 'approved'
    check (review_status in ('pending', 'approved', 'rejected')),
  add column if not exists admin_note text;   -- 반려 사유

create index if not exists idx_events_review on public.events(review_status);

-- --------------------------------------------
-- 3. 셀러 본인이 신청하려면 status='정상'이어야 함 (기존 정책 교체)
--    가입 심사/정지 상태 셀러의 신규 신청 차단
-- --------------------------------------------
drop policy if exists "apps_insert_seller" on public.applications;
create policy "apps_insert_seller" on public.applications
  for insert with check (
    public.user_role() = 'seller'
    and auth.uid() = seller_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = '정상')
  );

-- --------------------------------------------
-- 4. 신규 셀러 가입은 '가입 심사'로 시작 (트리거 갱신)
--    주최/관리자는 '정상'. 기존 계정은 영향 없음.
-- --------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'seller'),
    case when coalesce(new.raw_user_meta_data->>'role', 'seller') = 'seller' then '가입 심사' else '정상' end
  );
  return new;
end;
$$ language plpgsql security definer;
