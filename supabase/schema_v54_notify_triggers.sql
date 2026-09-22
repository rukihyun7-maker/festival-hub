-- ============================================
-- Festival Hub · v54 · 알림 트리거 확대
--  · 주요 이벤트에서 notifications 행 생성(인앱). 푸시/이메일은 웹훅→/api/notify/dispatch에서 발송.
--  · 모두 SECURITY DEFINER (RLS 우회하여 상대방에게 알림 insert) · 재실행 안전.
--  대상: 신규 신청→주최 / 신청 승인·반려→파트너 / 행사 등록 심사→주최 / 정산 지급→파트너 / 가입 승인·반려→회원
-- ============================================

-- 1) 신규 참가 신청 → 행사 주최에게
create or replace function public.notify_new_application() returns trigger as $$
declare v_owner uuid; v_event text; v_seller text;
begin
  if new.status = 'pending' and (TG_OP = 'INSERT' or old.status is distinct from 'pending') then
    select e.owner_id, e.name into v_owner, v_event from public.events e where e.id = new.event_id;
    select coalesce(p.business_name, p.name, '입점 파트너') into v_seller from public.profiles p where p.id = new.seller_id;
    if v_owner is not null then
      insert into public.notifications (user_id, kind, title, body, event_id)
      values (v_owner, 'review', '새 참가 신청',
        v_seller || '님이 「' || coalesce(v_event, '행사') || '」에 참가 신청했습니다. 검토가 필요합니다.', new.event_id);
    end if;
  end if;
  return new;
end; $$ language plpgsql security definer;

drop trigger if exists trg_new_application on public.applications;
create trigger trg_new_application after insert or update on public.applications
  for each row execute function public.notify_new_application();

-- 2) 참가 신청 승인·반려 → 입점 파트너에게
create or replace function public.notify_application_decision() returns trigger as $$
declare v_event text;
begin
  if new.status in ('approved', 'rejected') and new.status is distinct from old.status then
    select e.name into v_event from public.events e where e.id = new.event_id;
    insert into public.notifications (user_id, kind, title, body, event_id)
    values (new.seller_id, 'review',
      case when new.status = 'approved' then '참가 신청이 승인되었습니다' else '참가 신청 결과 안내' end,
      '「' || coalesce(v_event, '행사') || '」 참가 신청이 '
        || case when new.status = 'approved' then '승인되었습니다.' else '반려되었습니다.' end
        || coalesce(' · ' || nullif(new.memo, ''), ''),
      new.event_id);
  end if;
  return new;
end; $$ language plpgsql security definer;

drop trigger if exists trg_application_decision on public.applications;
create trigger trg_application_decision after update on public.applications
  for each row execute function public.notify_application_decision();

-- 3) 행사 등록 심사(승인·반려) → 주최에게
create or replace function public.notify_event_review() returns trigger as $$
begin
  if new.review_status in ('approved', 'rejected') and new.review_status is distinct from old.review_status then
    insert into public.notifications (user_id, kind, title, body, event_id)
    values (new.owner_id, 'review',
      case when new.review_status = 'approved' then '행사 등록이 승인되었습니다' else '행사 등록 심사 결과' end,
      '「' || coalesce(new.name, '행사') || '」 등록 요청이 '
        || case when new.review_status = 'approved' then '승인되어 노출됩니다.' else '반려되었습니다.' end
        || coalesce(' · ' || nullif(new.admin_note, ''), ''),
      new.id);
  end if;
  return new;
end; $$ language plpgsql security definer;

drop trigger if exists trg_event_review on public.events;
create trigger trg_event_review after update on public.events
  for each row execute function public.notify_event_review();

-- 4) 정산 지급 완료 → 입점 파트너에게
create or replace function public.notify_settlement_paid() returns trigger as $$
declare v_event text;
begin
  if new.status = 'paid' and new.status is distinct from old.status then
    select e.name into v_event from public.events e where e.id = new.event_id;
    insert into public.notifications (user_id, kind, title, body, event_id)
    values (new.seller_id, 'settlement', '정산금이 지급되었습니다',
      '「' || coalesce(v_event, '행사') || '」 정산금 '
        || to_char(coalesce(new.payout, 0), 'FM999,999,999') || '원이 지급되었습니다.',
      new.event_id);
  end if;
  return new;
end; $$ language plpgsql security definer;

drop trigger if exists trg_settlement_paid on public.settlements;
create trigger trg_settlement_paid after update on public.settlements
  for each row execute function public.notify_settlement_paid();

-- 5) 가입 심사 결과(승인·반려) → 회원에게
create or replace function public.notify_member_status() returns trigger as $$
begin
  if new.role in ('seller', 'host') and new.status in ('정상', '반려') and new.status is distinct from old.status then
    insert into public.notifications (user_id, kind, title, body)
    values (new.id, 'review',
      case when new.status = '정상' then '가입이 승인되었습니다' else '가입 심사 결과 안내' end,
      case when new.status = '정상'
        then '가입이 승인되었습니다. 이제 모든 기능을 이용하실 수 있습니다.'
        else '가입 심사가 반려되었습니다. 정보를 보완해 다시 신청해 주세요.' end);
  end if;
  return new;
end; $$ language plpgsql security definer;

drop trigger if exists trg_member_status on public.profiles;
create trigger trg_member_status after update on public.profiles
  for each row execute function public.notify_member_status();
