-- ============================================
-- Festival Hub · Schema v33 · 평가(리뷰) 구조 v2
-- 주최→파트너 평가: 당근식 태그 + 재섭외 + 보류공개(행사종료+14일) + 개선점 비공개(집계+본인만) + 닉네임.
-- 개별 평가 원본(ratings)은 기존 RLS 유지(셀러/작성주최/관리자) → host_id·improve_tags 보호.
-- 공개 후기는 뷰(partner_reviews_public)로만 노출: 닉네임 익명화 + 개선점 제외 + 공개예정 지난 것만.
-- 재실행 안전.
-- ============================================

alter table public.ratings
  add column if not exists praise_tags text[] not null default '{}',   -- 칭찬(공개)
  add column if not exists improve_tags text[] not null default '{}',  -- 개선점(비공개: 집계+본인만)
  add column if not exists rehire text check (rehire in ('recommend','ok','no')), -- 재섭외 의향
  add column if not exists reveal_at timestamptz;                       -- 공개예정(행사종료+14일)

-- 기존 슬라이더는 선택값으로 (새 태그 흐름은 미사용). 기존 데이터/뷰 호환 위해 컬럼은 유지.
alter table public.ratings alter column hygiene drop not null;
alter table public.ratings alter column punctual drop not null;
alter table public.ratings alter column service drop not null;

-- 공개 후기 뷰 (닉네임 익명화 · 공개예정 지난 것만 · host_id/개선점 제외)
create or replace view public.partner_reviews_public as
select
  r.id,
  r.seller_id,
  r.praise_tags,
  r.rehire,
  r.comment,
  r.created_at,
  r.reveal_at,
  '주최' || upper(substr(md5(r.host_id::text), 1, 4)) as reviewer_nick
from public.ratings r
where r.reveal_at is null or r.reveal_at <= now();

grant select on public.partner_reviews_public to anon, authenticated;

-- 파트너 본인 전용 뷰: 개선점 포함 · host_id 제외(닉네임만) · 공개예정 지난 것만.
-- auth.uid()로 자기 것만 반환 → 원본에서 host_id 노출 없이 개선점 열람.
create or replace view public.my_received_reviews as
select
  r.id,
  r.seller_id,
  r.praise_tags,
  r.improve_tags,
  r.rehire,
  r.comment,
  r.created_at,
  r.reveal_at,
  '주최' || upper(substr(md5(r.host_id::text), 1, 4)) as reviewer_nick
from public.ratings r
where r.seller_id = auth.uid()
  and (r.reveal_at is null or r.reveal_at <= now());

grant select on public.my_received_reviews to authenticated;

-- 원본 ratings 조회 권한에서 '셀러 본인'을 제거 → host_id·개선점 원본은 작성주최·관리자만.
-- (셀러는 위 my_received_reviews 뷰로만 열람 = 닉네임·개선점만, host_id 비노출)
drop policy if exists "ratings_select" on public.ratings;
create policy "ratings_select" on public.ratings
  for select using (
    auth.uid() = host_id or public.user_role() = 'admin'
  );

-- 집계 뷰 재정의 (공개된 것만 · 재섭외/슬라이더 혼합 점수)
-- 기존 뷰 컬럼(seller_id, review_count, avg_score) 순서 유지 + recommend_count는 맨 뒤 추가
-- (CREATE OR REPLACE VIEW는 기존 컬럼 순서 변경 불가 → drop 후 재생성)
drop view if exists public.seller_rating_summary;
create view public.seller_rating_summary as
select
  seller_id,
  count(*) as review_count,
  round(avg(
    coalesce(
      case rehire when 'recommend' then 5.0 when 'ok' then 3.5 when 'no' then 1.5 end,
      (hygiene + punctual + service) / 3.0
    )
  )::numeric, 1) as avg_score,
  count(*) filter (where rehire = 'recommend') as recommend_count
from public.ratings
where reveal_at is null or reveal_at <= now()
group by seller_id;

grant select on public.seller_rating_summary to anon, authenticated;

-- 확인:
--   select * from public.partner_reviews_public limit 5;
--   select * from public.seller_rating_summary limit 5;
