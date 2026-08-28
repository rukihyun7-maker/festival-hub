-- ============================================
-- Festival Hub · Schema v36 · 서류 알림
-- (c) 서류 제출/재등록(pending) 시 관리자에게 검토 요청 알림
-- (a) 만료 사전 알림용 플래그(expiry_notified) — 만료 임박 크론이 1회 발송 후 표시, 재등록 시 리셋
-- 재실행 안전.
-- ============================================

alter table public.documents
  add column if not exists expiry_notified boolean not null default false;

-- 서류가 검토대기(pending, 파일 있음)로 제출/재등록되면 → 모든 관리자에게 알림 + 만료알림 플래그 리셋
create or replace function public.notify_admins_doc_submitted() returns trigger as $$
declare
  a record;
  v_label text := case new.kind
    when 'business_reg' then '사업자등록증'
    when 'food_hygiene' then '식품위생업 신고증'
    when 'hygiene_edu' then '위생교육 이수증'
    when 'booth_exterior' then '외부 사진'
    when 'booth_interior' then '내부 사진'
    when 'booth_storage' then '공간 사진'
    when 'insurance' then '영업배상책임보험'
    else new.kind end;
begin
  if new.status = 'pending' and new.file_url is not null
     and (TG_OP = 'INSERT' or old.file_url is distinct from new.file_url or old.status is distinct from new.status) then
    new.expiry_notified := false;  -- 재등록 시 만료 알림 재개
    for a in select id from public.profiles where role = 'admin' loop
      insert into public.notifications (user_id, kind, title, body)
      values (a.id, 'docs', '서류 검토 요청',
        '입점 파트너가 「' || v_label || '」을(를) 제출했습니다. 검토·승인이 필요합니다.');
    end loop;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_doc_submitted on public.documents;
create trigger trg_doc_submitted before insert or update on public.documents
  for each row execute function public.notify_admins_doc_submitted();
