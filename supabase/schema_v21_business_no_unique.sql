-- ============================================
-- Festival Hub · Schema v21 · 사업자등록번호 중복 가입 차단
-- 한 사업자번호로 여러 계정 생성 방지 (부분 유니크 인덱스) + 가입 전 확인용 함수.
-- 재실행 안전. (현재 중복 없음 확인됨)
-- ============================================

-- 사업자번호 부분 유니크 (null/빈값은 제외 → 여러 개 허용)
create unique index if not exists uniq_profiles_business_no
  on public.profiles (business_no)
  where business_no is not null and business_no <> '';

-- 가입 전 중복 확인 (anon 호출 가능 · security definer)
create or replace function public.business_no_taken(p text)
returns boolean
language sql
security definer
stable
as $$
  select exists(
    select 1 from public.profiles
    where business_no = p and coalesce(p, '') <> ''
  );
$$;

grant execute on function public.business_no_taken(text) to anon, authenticated;
