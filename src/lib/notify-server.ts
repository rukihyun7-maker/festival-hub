import 'server-only';
import webpush from 'web-push';
import { createClient as createAdmin, type SupabaseClient } from '@supabase/supabase-js';
import type { NotifKind, NotifPrefs } from '@/lib/types';

/**
 * 알림 발송 (서버 전용) · 비밀 VAPID/서비스롤 키가 클라이언트로 새지 않도록 이 파일은 서버에서만.
 *  - dispatchNotificationRow(): 이미 생성된 알림 행을 (설정에 따라) 웹 푸시 + 이메일 발송 (웹훅에서 호출)
 *  - sendPushToUser(): 특정 사용자의 모든 기기에 푸시 (테스트/저수준)
 * 발송 실패는 삼킵니다 — 알림이 안 갔다고 승인·처리가 취소되면 안 됩니다.
 *
 * 필요 env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *          NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, (선택) VAPID_SUBJECT,
 *          RESEND_API_KEY, (선택) EMAIL_FROM
 */

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:help@festivalhub.co.kr';
const RESEND_KEY = process.env.RESEND_API_KEY ?? '';
const MAIL_FROM = process.env.EMAIL_FROM || 'Festival Hub <noreply@festivalhub.co.kr>';
const APP_URL = 'https://festivalhub.co.kr';

export const pushReady = Boolean(VAPID_PUBLIC && VAPID_PRIVATE);
export const mailReady = Boolean(RESEND_KEY);

if (pushReady) {
  try { webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE); } catch { /* noop */ }
}

function admin(): SupabaseClient {
  return createAdmin(SUPA_URL, SVC_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** 알림 종류 → 사용자 수신 설정 키 (없으면 항상 수신) */
function prefKeyFor(kind: NotifKind): keyof NotifPrefs | null {
  switch (kind) {
    case 'deadline': return 'deadline';
    case 'review': return 'review';
    case 'docs': return 'docs';
    case 'new_event': return 'new_event';
    default: return null; // settlement 등은 항상
  }
}

type PushPayload = { title: string; body?: string | null; href?: string | null; tag?: string };

/** 특정 사용자의 모든 기기로 푸시 · 죽은 구독 자동 정리 · 던진 기기 수 반환 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!pushReady) return 0;
  const db = admin();
  const { data: subs } = await db
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);
  if (!subs || subs.length === 0) return 0;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body ?? '',
    href: payload.href ?? '/dashboard',
    icon: '/icon.svg',
    tag: payload.tag,
  });

  const dead: string[] = [];
  let ok = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
      );
      ok += 1;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) dead.push(s.endpoint); // 만료·해지된 구독
    }
  }
  if (dead.length) await db.from('push_subscriptions').delete().in('endpoint', dead);
  return ok;
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function mailHtml(title: string, bodyText: string, href: string | null, name: string) {
  const link = href ? `${APP_URL}${href}` : APP_URL;
  return `<div style="background:#F6F1E7;padding:32px 0;font-family:'Apple SD Gothic Neo',-apple-system,BlinkMacSystemFont,'Malgun Gothic',sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#FFFDF8;border:1px solid #ECE3D2;border-radius:16px;overflow:hidden;">
      <div style="padding:22px 28px;border-bottom:1px solid #F0E9DA;"><span style="font-size:17px;font-weight:800;color:#1A140C;">Festival&nbsp;Hub</span></div>
      <div style="padding:28px;">
        <p style="margin:0 0 4px;font-size:12px;color:#9A9182;">${esc(name)} 님</p>
        <div style="font-size:18px;font-weight:800;color:#1A140C;margin:0 0 10px;">${esc(title)}</div>
        ${bodyText ? `<p style="font-size:14px;color:#4A4436;line-height:1.75;margin:0 0 20px;">${esc(bodyText)}</p>` : ''}
        <a href="${link}" style="display:inline-block;background:#E8A33D;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px;">확인하기 →</a>
      </div>
      <div style="padding:18px 28px;border-top:1px solid #F0E9DA;color:#9A9182;font-size:11px;line-height:1.6;">
        알림 설정은 앱의 설정 화면에서 변경할 수 있습니다 · Festival Hub
      </div>
    </div>
  </div>`;
}

async function sendMail(to: string, subject: string, html: string) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: MAIL_FROM, to: [to], subject, html }),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}

/** 알림 종류별 클릭 시 이동 경로 (역할 무관 안전 기본값) */
function hrefForKind(kind: NotifKind): string {
  switch (kind) {
    case 'settlement': return '/dashboard';
    case 'docs': return '/dashboard';
    default: return '/dashboard';
  }
}

/**
 * 이미 생성된 notifications 행을 푸시·이메일로 발송 (인앱 insert는 하지 않음).
 * DB 트리거가 만든 알림을 웹훅(/api/notify/dispatch)이 이 함수로 넘겨 발송.
 * 설정(notif_prefs: 종류별·push 마스터·email) 반영. 실패해도 던지지 않습니다.
 */
export async function dispatchNotificationRow(row: {
  user_id: string;
  kind: NotifKind;
  title: string;
  body?: string | null;
  event_id?: string | null;
}): Promise<{ push: number; email: boolean }> {
  const db = admin();

  // 설정 + 연락처
  let prefs: Partial<NotifPrefs> = {};
  let email: string | null = null;
  let name = '회원';
  try {
    const { data: prof } = await db
      .from('profiles')
      .select('email, name, business_name, notif_prefs')
      .eq('id', row.user_id)
      .maybeSingle();
    prefs = (prof?.notif_prefs ?? {}) as Partial<NotifPrefs>;
    email = prof?.email ?? null;
    name = prof?.business_name || prof?.name || '회원';
  } catch { /* 설정 못 읽으면 기본값(수신)로 진행 */ }

  const kindKey = prefKeyFor(row.kind);
  const kindOn = kindKey ? prefs[kindKey] !== false : true; // 기본 on
  if (!kindOn) return { push: 0, email: false }; // 이 종류를 끔 → 발송 생략(인앱은 이미 남음)

  const href = hrefForKind(row.kind);

  // 웹 푸시 (마스터 on 기본)
  let push = 0;
  if (pushReady && prefs.push !== false) {
    try {
      push = await sendPushToUser(row.user_id, { title: row.title, body: row.body ?? '', href, tag: row.kind });
    } catch { /* noop */ }
  }

  // 이메일 (설정 on 기본)
  let emailed = false;
  if (mailReady && prefs.email !== false && email) {
    try {
      await sendMail(email, `[Festival Hub] ${row.title}`, mailHtml(row.title, row.body ?? '', href, name));
      emailed = true;
    } catch { /* noop */ }
  }

  return { push, email: emailed };
}
