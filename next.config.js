const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 14.2: instrumentation.ts 사용을 위해 필요
  experimental: { instrumentationHook: true },
};

// Sentry: 소스맵 업로드는 SENTRY_AUTH_TOKEN(+ORG/PROJECT)가 있을 때만 동작.
// 토큰이 없으면 업로드만 생략하고 빌드는 정상 진행됩니다.
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
  // 소스맵을 서버에는 두고 클라이언트 번들에서 숨김
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
