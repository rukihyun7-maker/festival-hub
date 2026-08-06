'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { fetchMyProfile, fetchHostSettlements, markSettlementPaid } from '@/lib/supabase/queries';
import type { Profile, SettlementWithRelations } from '@/lib/types';

/**
 * 정산 (행사 주최 · 개별 지급)
 * PG 연동 없이 운영형: 파트너 신고 매출 기준 지급 예정액을 확인하고 지급 완료 처리.
 */

export default function HostSettlementPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rows, setRows] = useState<SettlementWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'paid'>('pending');
  const [actionOn, setActionOn] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchMyProfile();
        setProfile(p);
        if (p) setRows(await fetchHostSettlements(p.id));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pending = useMemo(() => rows.filter((r) => r.status === 'pending'), [rows]);
  const paid = useMemo(() => rows.filter((r) => r.status === 'paid'), [rows]);
  const pendingTotal = pending.reduce((s, r) => s + r.payout, 0);
  const paidTotal = paid.reduce((s, r) => s + r.payout, 0);
  const list = tab === 'pending' ? pending : paid;

  async function pay(id: string) {
    setActionOn(id);
    try {
      const updated = await markSettlementPaid(id);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
    } catch (e) {
      alert('지급 처리 실패: ' + (e as Error).message);
    } finally {
      setActionOn(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="host" />
        <div className="container-app py-12">
          <div className="animate-pulse space-y-4 max-w-[720px]">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-20 bg-muted rounded w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (!profile || profile.role !== 'host') {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="host" />
        <div className="container-app py-12">
          <div className="card max-w-[640px]">
            <div className="text-[16px] font-bold text-ink mb-2">행사 주최 계정으로 로그인이 필요합니다</div>
            <Link href="/login" className="btn-primary inline-flex mt-2">로그인</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="host" />
      <div className="container-app py-8 max-w-[860px]">
        <div className="mb-6">
          <div className="t-section text-[20px]">정산</div>
          <div className="t-sub mt-1">파트너 신고 매출 기준 지급 예정액을 확인하고 지급을 완료 처리합니다.</div>
        </div>

        {/* 요약 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="card">
            <div className="text-[12px] text-text-tertiary mb-1">지급 대기</div>
            <div className="text-[22px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>
              ₩{pendingTotal.toLocaleString()}
            </div>
            <div className="text-[12px] text-text-secondary mt-0.5">{pending.length}건</div>
          </div>
          <div className="card">
            <div className="text-[12px] text-text-tertiary mb-1">지급 완료</div>
            <div className="text-[22px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>
              ₩{paidTotal.toLocaleString()}
            </div>
            <div className="text-[12px] text-text-secondary mt-0.5">{paid.length}건</div>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-5">
          <button onClick={() => setTab('pending')} className={`chip ${tab === 'pending' ? 'selected' : ''}`}>지급 대기 ({pending.length})</button>
          <button onClick={() => setTab('paid')} className={`chip ${tab === 'paid' ? 'selected' : ''}`}>완료 ({paid.length})</button>
        </div>

        {list.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-[15px] font-bold text-ink mb-1">
              {tab === 'pending' ? '지급 대기 중인 정산이 없습니다' : '완료된 정산이 없습니다'}
            </div>
            <div className="t-sub">행사 종료 후 파트너가 매출을 신고하면 지급 대상이 이곳에 표시됩니다.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((r) => {
              const name = r.seller?.business_name || r.seller?.name || '(파트너)';
              return (
                <div key={r.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[15px] font-extrabold text-ink truncate">{name}</div>
                      <div className="text-[12px] text-text-tertiary mt-0.5 truncate">{r.event?.name}</div>
                      {r.memo && <div className="text-[12px] text-text-secondary mt-1">{r.memo}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[17px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        ₩{r.payout.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-text-tertiary">신고매출 ₩{r.sales_amount.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-line-faint">
                    {r.status === 'paid' ? (
                      <span className="text-[12px] font-semibold text-success">
                        ✓ 지급 완료{r.paid_at ? ` · ${r.paid_at.slice(0, 10).replace(/-/g, '.')}` : ''}
                      </span>
                    ) : (
                      <>
                        <span className="text-[12px] text-text-tertiary">지급 후 완료 처리하세요</span>
                        <button onClick={() => pay(r.id)} disabled={actionOn === r.id} className="btn-primary">
                          {actionOn === r.id ? '처리 중…' : '지급 완료'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="card mt-6 bg-info-soft" style={{ background: 'var(--info-soft, #F4F7FE)' }}>
          <div className="text-[13px] font-bold text-ink mb-1">지급 안내</div>
          <div className="text-[12px] text-text-secondary leading-relaxed">
            현재는 PG 연동 없이 <b>행사 주최가 파트너에게 직접 지급</b>하는 방식입니다. 지급 예정액은 파트너가 신고한 매출과 사전 합의한 지급률로 산정됩니다. 실제 이체 후 <b>지급 완료</b>를 눌러 기록을 남기세요.
          </div>
        </div>
      </div>
    </main>
  );
}
