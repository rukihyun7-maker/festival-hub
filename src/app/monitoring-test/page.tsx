'use client';

// 임시 · Sentry 연결 확인용 테스트 페이지 (확인 후 제거 예정)
import * as Sentry from '@sentry/nextjs';
import { useState } from 'react';

export default function MonitoringTestPage() {
  const [sent, setSent] = useState(false);

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: 40, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Sentry 모니터링 테스트</h1>
      <p style={{ color: '#555', marginTop: 8 }}>
        아래 버튼을 누르면 테스트 에러가 Sentry로 전송됩니다. Sentry → Issues에서 뜨는지 확인하세요.
      </p>

      <button
        onClick={() => {
          Sentry.captureException(new Error('Festival Hub · Sentry 연결 테스트 (captureException)'));
          setSent(true);
        }}
        style={{ marginTop: 16, padding: '12px 18px', fontWeight: 700, background: '#14120E', color: '#fff', border: 0, borderRadius: 10, cursor: 'pointer' }}
      >
        테스트 에러 보내기
      </button>
      {sent && <p style={{ color: '#1D6B2A', fontWeight: 700, marginTop: 10 }}>✓ 전송했습니다 — 잠시 후 Sentry Issues에서 확인하세요.</p>}

      <div style={{ marginTop: 24 }}>
        <button
          onClick={() => { throw new Error('Festival Hub · uncaught 테스트 에러'); }}
          style={{ padding: '10px 16px', fontWeight: 700, background: '#fff', color: '#9B2C22', border: '1px solid #E0DACB', borderRadius: 10, cursor: 'pointer' }}
        >
          Uncaught 에러 발생 (선택)
        </button>
      </div>
    </main>
  );
}
