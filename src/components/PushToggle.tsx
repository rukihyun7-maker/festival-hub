'use client';

import { useEffect, useState } from 'react';
import { savePushSubscription, dropPushSubscription } from '@/lib/supabase/queries';

/**
 * 이 기기로 푸시를 받을지. "회원 설정"이 아니라 "기기 설정"입니다 —
 * 브라우저 알림 권한이 기기마다 따로 붙기 때문에, 폰에서 켜도 노트북은 따로 켜야 합니다.
 * VAPID 공개키는 NEXT_PUBLIC_VAPID_PUBLIC_KEY(공개 가능).
 */
export function PushToggle() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
  const [state, setState] = useState<'loading' | 'unsupported' | 'denied' | 'on' | 'off'>('loading');
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || !vapidKey) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'denied') { setState('denied'); return; }
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? 'on' : 'off'))
      .catch(() => setState('unsupported'));
  }, [vapidKey]);

  async function turnOn() {
    setBusy(true); setMsg({});
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'off'); return; }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(vapidKey) });
      const j = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      await savePushSubscription({
        endpoint: j.endpoint ?? '',
        p256dh: j.keys?.p256dh ?? '',
        auth: j.keys?.auth ?? '',
        ua: navigator.userAgent.slice(0, 200),
      });
      setState('on');
      setMsg({ ok: '이 기기로 알림을 받습니다.' });
    } catch (e) {
      setMsg({ error: `알림을 켜지 못했습니다 — ${(e as Error).message}` });
    } finally { setBusy(false); }
  }

  async function turnOff() {
    setBusy(true); setMsg({});
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await dropPushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState('off');
      setMsg({ ok: '이 기기의 알림을 껐습니다.' });
    } catch (e) {
      setMsg({ error: (e as Error).message });
    } finally { setBusy(false); }
  }

  const desc =
    state === 'on' ? '켜져 있습니다. 승인·심사·서류·정산 알림이 바로 뜹니다.'
    : state === 'denied' ? '브라우저에서 알림을 막아 두셨습니다. 주소창 옆 자물쇠 → 알림 허용으로 바꿔 주세요.'
    : state === 'unsupported' ? '이 브라우저에서는 쓸 수 없습니다. 아이폰은 홈 화면에 추가한 뒤 열어야 합니다.'
    : '기기마다 따로 켭니다. 폰에서 켜도 노트북은 따로입니다.';

  return (
    <div className="py-2.5 border-b border-line-faint last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 pr-2">
          <div className="text-[14px] font-semibold text-ink">이 기기로 알림 받기</div>
          <div className="text-[12px] text-text-tertiary mt-0.5">{desc}</div>
        </div>
        {(state === 'on' || state === 'off') && (
          <button
            type="button"
            onClick={state === 'on' ? turnOff : turnOn}
            disabled={busy}
            className={state === 'on'
              ? 'btn-secondary shrink-0 text-[13px] disabled:opacity-60'
              : 'btn-primary shrink-0 text-[13px] disabled:opacity-60'}
          >
            {busy ? '잠시만…' : state === 'on' ? '끄기' : '켜기'}
          </button>
        )}
        {state === 'loading' && <span className="text-[12px] text-text-tertiary shrink-0">확인 중…</span>}
      </div>
      {msg.error && <div className="mt-2 text-[12px] text-danger bg-danger-bg rounded-input px-3 py-2">{msg.error}</div>}
      {msg.ok && <div className="mt-2 text-[12px] text-success">{msg.ok}</div>}
    </div>
  );
}

/** VAPID 공개키는 base64url 문자열, 브라우저는 Uint8Array를 받습니다 */
function urlB64(s: string) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
