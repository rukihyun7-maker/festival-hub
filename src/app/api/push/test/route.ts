import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPushToUser, pushReady } from '@/lib/notify-server';

/**
 * 테스트 푸시 · 로그인한 본인의 모든 기기로 1건 발송
 * POST (본문 없음) → { ok, devices }
 * 설정 화면 "테스트 알림 보내기" 버튼에서 호출. 인앱/이메일은 건드리지 않음(푸시만).
 */
export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  if (!pushReady) return NextResponse.json({ error: '서버에 푸시 키(VAPID)가 설정되지 않았습니다' }, { status: 503 });

  const devices = await sendPushToUser(user.id, {
    title: 'Festival Hub 테스트 알림',
    body: '푸시 알림이 정상적으로 도착했습니다.',
    href: '/settings',
    tag: 'test',
  });

  if (devices === 0) {
    return NextResponse.json({ ok: false, devices: 0, note: '이 계정에 등록된 기기가 없습니다. 먼저 "이 기기로 알림 받기"를 켜 주세요.' });
  }
  return NextResponse.json({ ok: true, devices });
}
