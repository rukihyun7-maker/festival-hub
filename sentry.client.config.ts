// Sentry · 브라우저(클라이언트) 에러 모니터링
// DSN이 없으면 자동 비활성(no-op) → 로컬/미설정 환경에서도 안전.
import * as Sentry from '@sentry/nextjs';

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: DSN,
  enabled: !!DSN,
  // 성능 트레이스는 소량만 (비용 절감)
  tracesSampleRate: 0.1,
  // 세션 리플레이는 사용 안 함 (개인정보·용량 고려)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  // 환경 구분 (production / preview)
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
});
