// Sentry · 서버(Node 런타임) 에러 모니터링
import * as Sentry from '@sentry/nextjs';

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN
  || 'https://be6d0daa6470b4a4e1eb3f260ee6b9e0@o4512021569994752.ingest.us.sentry.io/4512021589262336';

Sentry.init({
  dsn: DSN,
  enabled: !!DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
});
