import { NextResponse } from 'next/server';
import { dispatchNotificationRow } from '@/lib/notify-server';
import type { NotifKind } from '@/lib/types';

/**
 * Supabase Database Webhook 수신 → 새 알림을 푸시·이메일로 발송
 * 설정: Supabase → Database → Webhooks → notifications INSERT → POST 이 URL,
 *       헤더 x-webhook-secret: <NOTIFY_WEBHOOK_SECRET> (Vercel env와 동일 값)
 * 인앱 알림 자체는 DB 트리거가 이미 생성하므로 여기서는 발송만 한다.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type WebhookPayload = {
  type?: string;
  table?: string;
  record?: {
    user_id?: string;
    kind?: string;
    title?: string;
    body?: string | null;
    event_id?: string | null;
  } | null;
};

export async function POST(req: Request) {
  const secret = process.env.NOTIFY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'NOTIFY_WEBHOOK_SECRET 미설정' }, { status: 503 });

  const got = req.headers.get('x-webhook-secret') ?? new URL(req.url).searchParams.get('secret');
  if (got !== secret) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let payload: WebhookPayload = {};
  try { payload = (await req.json()) as WebhookPayload; } catch { /* empty */ }

  if (payload.type !== 'INSERT' || payload.table !== 'notifications') {
    return NextResponse.json({ ok: true, skipped: 'not a notification insert' });
  }
  const r = payload.record;
  if (!r?.user_id || !r?.title) return NextResponse.json({ ok: true, skipped: 'incomplete' });

  const result = await dispatchNotificationRow({
    user_id: r.user_id,
    kind: (r.kind as NotifKind) ?? 'review',
    title: r.title,
    body: r.body ?? null,
    event_id: r.event_id ?? null,
  });
  return NextResponse.json({ ok: true, ...result });
}
