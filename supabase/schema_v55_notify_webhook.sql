-- ============================================
-- Festival Hub · v55 · 알림 발송 웹훅 (pg_net 직접)
--  · Supabase 대시보드 Webhook UI가 supabase_functions 스키마 없이 실패 → pg_net로 직접 트리거 생성
--  · notifications INSERT → /api/notify/dispatch 로 POST(비동기) → 서버가 푸시·이메일 발송
--  · x-webhook-secret 은 Vercel env NOTIFY_WEBHOOK_SECRET 과 동일해야 함
-- 재실행 안전.
-- ============================================

create extension if not exists pg_net;

create or replace function public.notify_dispatch_webhook() returns trigger as $$
begin
  perform net.http_post(
    url := 'https://festivalhub.co.kr/api/notify/dispatch',
    body := jsonb_build_object('type', 'INSERT', 'table', 'notifications', 'record', to_jsonb(new)),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', 'w0T_O950B7wyZk2zgZUxZy_8Oy6G9oyt'
    ),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_dispatch on public.notifications;
create trigger trg_notify_dispatch after insert on public.notifications
  for each row execute function public.notify_dispatch_webhook();
