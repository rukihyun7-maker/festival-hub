-- ============================================
-- Festival Hub · v53 · 웹 푸시 구독 (기기별)
--  · push_subscriptions: 사용자가 켠 기기(브라우저)마다 1행
--  · 발송은 서버(web-push, 비밀 VAPID 키)에서만. 이 테이블은 구독 저장용
--  · 알림 마스터 on/off·이메일 수신은 profiles.notif_prefs(JSON)의 push/email 필드 사용
-- 재실행 안전.
-- ============================================

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,          -- 브라우저 푸시 엔드포인트(기기 식별)
  p256dh     text not null,                 -- 암호화 공개키
  auth       text not null,                 -- 암호화 auth secret
  ua         text,                          -- 기기 식별용 User-Agent(앞부분)
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- 본인 구독만 조회/추가/수정/삭제. 발송 서버는 service_role로 RLS 우회.
drop policy if exists push_sub_select_own on public.push_subscriptions;
create policy push_sub_select_own on public.push_subscriptions
  for select using (user_id = auth.uid());

drop policy if exists push_sub_insert_own on public.push_subscriptions;
create policy push_sub_insert_own on public.push_subscriptions
  for insert with check (user_id = auth.uid());

drop policy if exists push_sub_update_own on public.push_subscriptions;
create policy push_sub_update_own on public.push_subscriptions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists push_sub_delete_own on public.push_subscriptions;
create policy push_sub_delete_own on public.push_subscriptions
  for delete using (user_id = auth.uid());
