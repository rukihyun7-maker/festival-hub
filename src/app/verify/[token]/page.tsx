'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { verifyQr } from '@/lib/supabase/queries';
import { periodLabel } from '@/lib/types';
import type { VerifyQrResult } from '@/lib/types';

/**
 * 입점 승인 확인 · 공개 페이지 (/verify/[token])
 * 승인된 셀러 QR 스캔 시 이 페이지로 이동, verify_qr RPC로 입점 자격 확인.
 * 결제 아님 · 현장/주최사 확인용.
 */
export default function VerifyPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [result, setResult] = useState<VerifyQrResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const r = await verifyQr(token);
        if (r) setResult(r);
        else setNotFound(true);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <main className="min-h-screen bg-page flex items-center justify-center p-5">
      <div className="w-full" style={{ maxWidth: 440 }}>
        <div className="flex items-center gap-2 mb-6 justify-center">
          <span className="w-7 h-7 rounded-[7px] bg-accent flex items-center justify-center text-ink font-extrabold text-[15px]">F</span>
          <span className="font-bold text-ink">Festival Hub</span>
          <span className="t-sub">입점 확인</span>
        </div>

        {loading ? (
          <div className="card text-center py-16">
            <div className="animate-pulse t-sub">확인 중…</div>
          </div>
        ) : notFound ? (
          <div className="card text-center py-14">
            <div className="w-14 h-14 rounded-pill bg-danger-bg flex items-center justify-center text-danger text-[26px] font-extrabold mx-auto mb-4">✕</div>
            <div className="text-[17px] font-extrabold text-ink mb-2">확인할 수 없는 QR입니다</div>
            <div className="t-sub">승인된 입점이 아니거나, 유효하지 않은 코드입니다.</div>
          </div>
        ) : result ? (
          <div className="card">
            <div className="text-center pb-5 border-b border-line-faint">
              <div className="w-14 h-14 rounded-pill bg-success-bg flex items-center justify-center text-success text-[26px] font-extrabold mx-auto mb-4">✓</div>
              <div className="badge badge-success mb-2">승인된 입점</div>
              <div className="text-[19px] font-extrabold text-ink">{result.business_name || result.seller_name}</div>
              {result.business_name && <div className="t-sub mt-1">{result.seller_name}</div>}
            </div>
            <dl className="mt-5 space-y-3">
              <Row label="행사" value={result.event_name} />
              <Row label="일정" value={periodLabel(result.event_start, result.event_end)} />
              <Row label="상태" value="입점 승인 완료" />
              {result.approved_at && <Row label="승인일" value={result.approved_at.slice(0, 10).replace(/-/g, '.')} />}
            </dl>
            <div className="mt-5 p-3 rounded-input bg-surface-sunken text-[12px] text-text-tertiary text-center">
              이 화면은 입점 자격 확인용입니다. 결제 기능이 아닙니다.
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="t-sub shrink-0">{label}</dt>
      <dd className="text-[14px] font-semibold text-ink text-right">{value}</dd>
    </div>
  );
}
