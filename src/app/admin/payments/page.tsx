'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { fetchMyProfile, fetchPaymentRows, type PaymentRow } from '@/lib/supabase/queries';
import { periodLabel } from '@/lib/types';
import type { Profile } from '@/lib/types';

/**
 * 결제 관제 · Admin only
 * 행사별 정산 상태 · 이슈 발생 케이스 우선 표시
 */

type StatusFilter = 'all' | 'awaiting' | 'settled' | 'issue';

export default function AdminPaymentsPage() {
  const [me, setMe] = useState<Profile | null>(null);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, data] = await Promise.all([fetchMyProfile(), fetchPaymentRows()]);
        setMe(p);
        setRows(data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(
    () => (statusFilter === 'all' ? rows : rows.filter((r) => r.status === statusFilter)),
    [rows, statusFilter]
  );

  const summary = useMemo(() => {
    return {
      awaitingCount: rows.filter((r) => r.status === 'awaiting').length,
      issueCount: rows.filter((r) => r.status === 'issue').length,
      settledCount: rows.filter((r) => r.status === 'settled').length,
      totalExpected: rows.reduce((s, r) => s + r.expectedFee, 0),
      totalGmv: rows.reduce((s, r) => s + r.actualGmv, 0),
      totalPlatformFee: rows.reduce((s, r) => s + r.platformFee, 0),
    };
  }, [rows]);

  if (me && me.role !== 'admin') {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="admin" />
        <div className="container-app py-12">
          <div className="card">
            <div className="text-[16px] font-bold text-ink mb-2">관리자 권한이 필요합니다</div>
            <Link href="/login" className="btn-primary">관리자로 로그인 →</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="admin" />

      <div className="container-app py-8 md:py-12">
        <nav className="text-[12px] font-semibold text-text-tertiary mb-4">
          <Link href="/admin" className="hover:text-ink">인사이트</Link>
          <span className="mx-2">/</span>
          <span className="text-ink">결제 관제</span>
        </nav>

        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="t-title mb-1">결제 관제</h1>
            <p className="t-sub">
              전체 {rows.length}건 · <span className="text-danger font-bold">이슈 {summary.issueCount}</span> · 대기 {summary.awaitingCount} · 완료 {summary.settledCount}
            </p>
          </div>
        </div>

        {/* 요약 3개 */}
        <div className="grid gap-3 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <SummaryCard label="예상 참가비 수익" value={`₩${summary.totalExpected.toLocaleString()}`} note="확정 파트너 기준" />
          <SummaryCard label="실제 GMV" value={`₩${summary.totalGmv.toLocaleString()}`} note="종료 행사 합계" highlight />
          <SummaryCard label="플랫폼 수수료" value={`₩${summary.totalPlatformFee.toLocaleString()}`} note="5% 기준" />
        </div>

        {/* 필터 */}
        <div className="card mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[12px] font-bold uppercase tracking-[0.05em] text-text-tertiary">상태</span>
            <button className={`chip ${statusFilter === 'all' ? 'selected' : ''}`} onClick={() => setStatusFilter('all')}>전체</button>
            <button className={`chip ${statusFilter === 'issue' ? 'selected' : ''}`} onClick={() => setStatusFilter('issue')}>
              이슈{summary.issueCount > 0 && <span className="ml-1 text-danger">·{summary.issueCount}</span>}
            </button>
            <button className={`chip ${statusFilter === 'awaiting' ? 'selected' : ''}`} onClick={() => setStatusFilter('awaiting')}>정산 대기</button>
            <button className={`chip ${statusFilter === 'settled' ? 'selected' : ''}`} onClick={() => setStatusFilter('settled')}>정산 완료</button>
          </div>
        </div>

        {error && (
          <div className="card mb-6" style={{ borderColor: '#E0DACB' }}>
            <div className="text-[13px] font-bold text-warning mb-1">오류</div>
            <div className="text-[12px] text-text-secondary">{error}</div>
          </div>
        )}

        {/* 테이블 */}
        {loading ? (
          <div className="card">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-[15px] font-semibold text-ink mb-2">해당 조건의 결제 건이 없습니다</div>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            {filtered.map((r, i) => (
              <div key={r.id} className={`p-5 ${i !== filtered.length - 1 ? 'border-b border-line-faint' : ''} hover:bg-surface-sunken transition-colors`}>
                <div className="grid gap-4 items-start" style={{ gridTemplateColumns: 'minmax(240px, 2fr) minmax(200px, 1fr) auto' }}>
                  {/* 행사 정보 */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Link href={`/events/${r.eventId}`} className="text-[15px] font-extrabold text-ink hover:underline truncate">
                        {r.eventName}
                      </Link>
                      <PaymentBadge status={r.status} />
                    </div>
                    <div className="text-[12px] text-text-secondary mb-1">
                      {r.organizer} · {periodLabel(r.startDate, r.endDate)} · {r.totalDays}일
                    </div>
                    <div className="text-[11px] text-text-tertiary">
                      확정 파트너 {r.approvedSellers}명 · 일 참가비 ₩{r.fee.toLocaleString()}{r.feeRate > 0 && ` + ${r.feeRate}%`} · 정산 예정 {r.settleBy}
                    </div>
                  </div>

                  {/* 금액 */}
                  <div className="text-right">
                    <div className="grid gap-1 text-[12px]">
                      <div className="flex justify-between gap-3">
                        <span className="text-text-tertiary">예상 참가비</span>
                        <span className="font-semibold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>₩{r.expectedFee.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-text-tertiary">실 GMV</span>
                        <span className={`font-semibold ${r.actualGmv > 0 ? 'text-ink' : 'text-danger'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                          ₩{r.actualGmv.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 pt-1 border-t border-line-faint">
                        <span className="text-text-tertiary font-bold">플랫폼 수수료</span>
                        <span className="font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>₩{r.platformFee.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* 액션 */}
                  <div className="flex gap-2 shrink-0 flex-col">
                    {r.status === 'awaiting' && (
                      <button className="btn-secondary text-[12px] py-1.5 px-3 whitespace-nowrap" onClick={() => alert('정산 실행은 PG 연동 후 활성화됩니다')}>
                        정산 실행
                      </button>
                    )}
                    {r.status === 'issue' && (
                      <button className="text-[12px] text-danger hover:underline font-semibold whitespace-nowrap" onClick={() => alert('이슈 상세는 별도 티켓팅 후 처리')}>
                        이슈 처리
                      </button>
                    )}
                    {r.status === 'settled' && (
                      <button className="text-[12px] text-text-tertiary hover:text-ink font-semibold whitespace-nowrap" onClick={() => alert('정산 명세서 PDF 다운로드')}>
                        명세서
                      </button>
                    )}
                    <button className="text-[11px] text-text-tertiary hover:text-ink whitespace-nowrap" onClick={() => alert('환불은 PG 연동 후 활성화됩니다')}>
                      환불
                    </button>
                  </div>
                </div>

                {/* 이슈 사유 */}
                {r.status === 'issue' && (
                  <div className="mt-3 p-2.5 rounded-input bg-danger-bg border border-danger/20">
                    <div className="text-[11px] font-bold text-danger mb-0.5">이슈 사유</div>
                    <div className="text-[11px] text-danger">
                      {r.actualGmv === 0 && r.approvedSellers > 0
                        ? '종료 행사인데 매출 기록 없음 · 파트너가 매출 미신고 상태'
                        : r.approvedSellers === 0
                        ? '확정 파트너 없이 종료됨'
                        : '취소된 행사'}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 rounded-card bg-surface-sunken border border-line-faint">
          <div className="text-[12px] font-bold text-ink mb-1">참고</div>
          <div className="text-[11px] text-text-secondary leading-[1.6]">
            정산 상태는 자동 계산 · 종료(close) + 매출 있음 = 완료, 매출 없음 = 이슈, 진행 중 = 대기. 실제 정산 실행/환불은 PG(포트원·토스페이먼츠 등) 연동 후 활성화됩니다.
          </div>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({ label, value, note, highlight }: { label: string; value: string; note: string; highlight?: boolean }) {
  return (
    <div className={`card ${highlight ? 'border-2 border-ink' : ''}`}>
      <div className="t-sub mb-2">{label}</div>
      <div className="text-[24px] font-extrabold text-ink tracking-[-0.03em] mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div className="text-[11px] text-text-tertiary">{note}</div>
    </div>
  );
}

function PaymentBadge({ status }: { status: PaymentRow['status'] }) {
  const map = {
    awaiting: { label: '정산 대기', cls: 'badge-info' },
    settled: { label: '정산 완료', cls: 'badge-success' },
    issue: { label: '이슈', cls: 'badge-danger' },
  };
  const b = map[status];
  return <span className={`badge ${b.cls}`}>{b.label}</span>;
}
