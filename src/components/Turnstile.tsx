'use client';

import { useEffect, useRef } from 'react';

/**
 * Cloudflare Turnstile CAPTCHA (봇 방지)
 * - NEXT_PUBLIC_TURNSTILE_SITE_KEY 가 설정된 경우에만 렌더링/활성화
 * - Supabase Auth 대시보드에서 CAPTCHA(Turnstile) 를 켜고 Secret Key 등록 필요
 * - 미설정 시 아무것도 렌더링하지 않음(기존 동작 유지)
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** 사이트 키가 있으면 CAPTCHA 활성 상태 */
export const captchaEnabled = !!SITE_KEY;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global { interface Window { turnstile?: any } }

export default function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    function render() {
      if (cancelled || !ref.current || !window.turnstile || widgetId.current !== null) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: SITE_KEY,
        callback: (t: string) => cb.current(t),
        'expired-callback': () => cb.current(null),
        'error-callback': () => cb.current(null),
      });
    }

    if (window.turnstile) {
      render();
    } else {
      const id = 'cf-turnstile-script';
      let s = document.getElementById(id) as HTMLScriptElement | null;
      if (!s) {
        s = document.createElement('script');
        s.id = id;
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        s.async = true;
        s.defer = true;
        document.head.appendChild(s);
      }
      s.addEventListener('load', render);
    }
    return () => { cancelled = true; };
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={ref} className="my-2" />;
}
