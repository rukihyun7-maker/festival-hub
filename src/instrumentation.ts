// Next.js instrumentation · 런타임별 Sentry 서버 설정 로드 + 서버 요청 에러 캡처
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

// App Router 서버 컴포넌트·route handler에서 발생한 에러를 Sentry로 전송
export const onRequestError = Sentry.captureRequestError;
