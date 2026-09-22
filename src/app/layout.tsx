import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Festival Hub · 야외행사 QR결제 플랫폼',
  description: '푸드트럭·축제·팝업 결제 SaaS + 판매자 플랫폼',
  manifest: '/manifest.webmanifest',
  // iOS 웹 푸시: 홈 화면에 추가 → standalone 실행이어야 알림 사용 가능
  appleWebApp: { capable: true, title: 'Festival Hub', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#1A140C',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/webfontfiles/variable/split/WantedSansVariable.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
