'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Cloudflare Turnstile CAPTCHA (봇 방지)
 * - NEXT_PUBLIC_TURNSTILE_SITE_KEY 가 설정된 경우에만 렌더링/활성화
 * - Supabase Auth 대시보드에서 CAPTCHA(Turnstile) 를 켜고 Secret Key 등록 필요
 * - 미설정 시 아무것도 렌더링하지 않음(기존 동작 유지)
 * - v50: 연결 실패(사내망·광고차단 등) 시 안내 + '다시 시도'로 재렌더 → 로그인 락아웃 완화
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** 사이트 키가 있으면 CAPTCHA 활성 상태 */
export const captchaEnabled = !!SITE_KEY;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global { interface Window { turnstile?: any } }

type Status = 'loading' | 'ready' | 'error';

export default function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;
  const [status, setStatus] = useState<Status>('loading');

  function doRender() {
    if (!ref.current || !window.turnstile) return;
    // 재시도 시 기존 위젯 제거 후 다시 렌더
    if (widgetId.current !== null) {
      try { window.turnstile.remove(widgetId.current); } catch { /* noop */ }
      widgetId.current = null;
    }
    try {
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: SITE_KEY,
        callback: (t: string) => { cb.current(t); setStatus('ready'); },
        'expired-callback': () => {
          cb.current(null); setStatus('loading');
          try { window.turnstile.reset(widgetId.current); } catch { /* noop */ }
        },
        'error-callback': () => { cb.current(null); setStatus('error'); },
      });
    } catch { setStatus('error'); }
  }

  function loadAndRender() {
    if (!SITE_KEY) return;
    if (window.turnstile) { doRender(); return; }
    const id = 'cf-turnstile-script';
    let s = document.getElementById(id) as HTMLScriptElement | null;
    if (!s) {
      s = document.createElement('script');
      s.id = id;
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.defer = true;
      s.addEventListener('error', () => setStatus('error'));
      document.head.appendChild(s);
    }
    s.addEventListener('load', doRender);
    // 스크립트가 일정 시간 내 로드되지 않으면(차단 등) 실패 안내
    window.setTimeout(() => { if (!window.turnstile) setStatus('error'); }, 8000);
  }

  useEffect(() => {
    loadAndRender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function retry() {
    cb.current(null);
    setStatus('loading');
    loadAndRender();
  }

  if (!SITE_KEY) return null;

  return (
    <div className="my-2">
      <div ref={ref} />
      {status === 'error' && (
        <div className="mt-2 rounded-input p-3 text-[12px] leading-relaxed" style={{ background: 'var(--danger-bg, #FBEDEA)', border: '1px solid #E5B8AE' }}>
          <div className="font-semibold text-danger mb-1">보안 확인에 연결하지 못했습니다</div>
          <div className="text-text-secondary mb-2">
            사내망·광고차단·개인정보보호 확장이 차단하는 경우가 있습니다. 다른 네트워크(휴대폰 테더링)나 시크릿 창을 이용하거나 아래 버튼으로 다시 시도해 주세요.
          </div>
          <button type="button" onClick={retry} className="btn-secondary text-[12px] py-1.5 px-3">보안 확인 다시 시도</button>
        </div>
      )}
    </div>
  );
}
