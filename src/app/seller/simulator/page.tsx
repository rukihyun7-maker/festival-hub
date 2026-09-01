'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { fetchEvents, fetchMyProfile, saveSimulation, fetchMyDocumentSlots, countVerified } from '@/lib/supabase/queries';
import type { EventRow, Profile } from '@/lib/types';

/**
 * 손익 시뮬레이터 · Supabase 연동
 * 입력값 7개 + 3 시나리오 자동 계산 + 시뮬 저장 (simulations 테이블)
 * 행사를 선택하면 참가비·수수료 자동 입력
 */

const SCENARIOS = [
  { key: 'low' as const, label: '보수적', mul: 0.55, color: 'bg-warning' },
  { key: 'base' as const, label: '기본', mul: 1.0, color: 'bg-accent' },
  { key: 'high' as const, label: '낙관적', mul: 1.5, color: 'bg-success' },
];

export default function SimulatorPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [docReady, setDocReady] = useState(true); // 서류 80% 이상 → 등록 행사 선택 가능
  const [docPct, setDocPct] = useState(100);

  const [days, setDays] = useState(3);
  const [avgOrder, setAvgOrder] = useState(7500);
  const [ordersPerDay, setOrdersPerDay] = useState(120);
  const [materialRate, setMaterialRate] = useState(35);
  const [fixedFee, setFixedFee] = useState(150_000);
  const [salesFeeRate, setSalesFeeRate] = useState(0);
  const [otherCost, setOtherCost] = useState(80_000);

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, e] = await Promise.all([fetchMyProfile(), fetchEvents()]);
        setProfile(p);
        setEvents(e);
        // 입점 파트너: 필수 서류 80% 이상이어야 등록 행사 선택 가능
        if (p?.role === 'seller') {
          const slots = await fetchMyDocumentSlots(p.id);
          const total = slots.length || 1;
          const pct = Math.round((countVerified(slots) / total) * 100);
          setDocPct(pct);
          setDocReady(pct >= 80);
        }
      } catch {
        // silent — 로그인 안 되어 있어도 시뮬은 사용 가능
      }
    })();
  }, []);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  // 행사 선택 시 참가비·수수료·일수 자동 반영
  function applyEvent(id: string) {
    setSelectedEventId(id);
    if (!id) return;
    const e = events.find((x) => x.id === id);
    if (!e) return;
    setFixedFee(e.fee);
    setSalesFeeRate(e.fee_rate);
    const d = Math.max(1, Math.ceil((new Date(e.end_date).getTime() - new Date(e.start_date).getTime()) / 86400000) + 1);
    setDays(d);
  }

  const scenarios = useMemo(() => {
    return SCENARIOS.map((s) => {
      const dailyOrders = ordersPerDay * s.mul;
      const dailyRevenue = dailyOrders * avgOrder;
      const totalRevenue = dailyRevenue * days;
      const materialCost = totalRevenue * (materialRate / 100);
      const fixedCost = fixedFee * days;
      const feeCost = totalRevenue * (salesFeeRate / 100);
      const otherTotal = otherCost * days;
      const totalCost = materialCost + fixedCost + feeCost + otherTotal;
      const profit = totalRevenue - totalCost;
      const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
      return { ...s, dailyOrders: Math.round(dailyOrders), totalRevenue, materialCost, fixedCost, feeCost, otherTotal, totalCost, profit, margin };
    });
  }, [days, avgOrder, ordersPerDay, materialRate, fixedFee, salesFeeRate, otherCost]);

  async function handleSave() {
    if (!profile) {
      setSaveError('로그인이 필요합니다');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const input = { days, avg_order: avgOrder, orders_per_day: ordersPerDay, material_rate: materialRate, fixed_fee: fixedFee, sales_fee_rate: salesFeeRate, other_cost: otherCost };
      const result = {
        low: { revenue: scenarios[0].totalRevenue, profit: scenarios[0].profit, margin: scenarios[0].margin },
        base: { revenue: scenarios[1].totalRevenue, profit: scenarios[1].profit, margin: scenarios[1].margin },
        high: { revenue: scenarios[2].totalRevenue, profit: scenarios[2].profit, margin: scenarios[2].margin },
      };
      await saveSimulation(profile.id, selectedEvent?.name ?? null, selectedEvent?.id ?? null, input, result);
      setSavedAt(new Date());
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="seller" />

      <div className="container-app py-8 md:py-12">
        <div className="mb-8">
          <div className="text-[13px] font-semibold uppercase tracking-[0.05em] text-accent-warm mb-2">손익 시뮬레이터</div>
          <h1 className="t-title mb-2">참여 전 30초 계산</h1>
          <p className="t-body text-text-secondary max-w-[600px]">
            보수적·기본·낙관적 시나리오로 자동 계산합니다. 행사를 선택하면 참가비·수수료가 자동 입력됩니다.
          </p>
        </div>

        {/* 행사 선택 */}
        <div className="card mb-6">
          <label className="flex flex-col gap-2">
            <span className="text-[12px] font-bold uppercase tracking-[0.05em] text-text-tertiary">
              행사 선택 (선택 사항)
            </span>
            <select
              value={selectedEventId}
              onChange={(e) => applyEvent(e.target.value)}
              className="input"
              disabled={!docReady}
            >
              <option value="">직접 입력</option>
              {docReady && events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} · 일 {e.fee > 0 ? `${(e.fee / 10000).toFixed(0)}만원` : '무료'}{e.fee_rate > 0 ? ` + ${e.fee_rate}%` : ''}
                </option>
              ))}
            </select>
            {!docReady ? (
              <div className="text-[12px] text-warning mt-1 leading-relaxed">
                🔒 등록 행사 선택은 <b>필수 서류 80% 이상</b>부터 가능합니다 (현재 {docPct}%). 지금은 <b>값을 직접 입력해 계산</b>하는 것만 가능합니다.{' '}
                <Link href="/seller/documents" className="text-info font-semibold underline">서류 등록 →</Link>
              </div>
            ) : selectedEvent && (
              <div className="text-[12px] text-success mt-1">
                ✓ 참가비 · 수수료 · 일수 자동 입력됨
              </div>
            )}
          </label>
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {/* 좌측 · 입력 */}
          <div className="card">
            <div className="t-section mb-5">입력 값</div>
            <div className="space-y-5">
              <NumInput label="참여 일수" unit="일" value={days} onChange={setDays} min={1} max={30} step={1} />
              <NumInput label="평균 주문 단가" unit="원" value={avgOrder} onChange={setAvgOrder} min={1000} max={100000} step={500} />
              <NumInput label="일 예상 주문 건수" unit="건/일" value={ordersPerDay} onChange={setOrdersPerDay} min={10} max={500} step={10} note="기본 시나리오 기준" />

              <div className="border-t border-line-faint pt-5">
                <div className="text-[12px] font-bold uppercase tracking-[0.05em] text-text-tertiary mb-3">비용 항목</div>
                <div className="space-y-5">
                  <NumInput label="재료비율" unit="%" value={materialRate} onChange={setMaterialRate} min={0} max={90} step={1} note="매출 대비 재료비" />
                  <NumInput label="일 참가비 (고정)" unit="원/일" value={fixedFee} onChange={setFixedFee} min={0} max={1_000_000} step={10_000} />
                  <NumInput label="매출 수수료율" unit="%" value={salesFeeRate} onChange={setSalesFeeRate} min={0} max={30} step={0.5} note="매출 중 주최에 내는 비율" />
                  <NumInput label="기타 일일 비용" unit="원/일" value={otherCost} onChange={setOtherCost} min={0} max={500_000} step={5_000} note="인건비·전기·연료" />
                </div>
              </div>
            </div>

            {/* 저장 */}
            <div className="mt-6 pt-5 border-t border-line-faint">
              {saveError && (
                <div className="text-[12px] text-danger bg-danger-bg rounded-input px-3 py-2 border border-danger/20 mb-3">
                  {saveError}
                </div>
              )}
              {savedAt && !saveError && (
                <div className="text-[12px] text-success bg-success-bg rounded-input px-3 py-2 border border-success/20 mb-3">
                  ✓ 저장 완료 · {savedAt.toLocaleString('ko-KR')}
                </div>
              )}
              <button onClick={handleSave} disabled={saving || !profile} className="btn-primary w-full">
                {saving ? '저장 중…' : profile ? '시뮬레이션 저장' : '로그인 필요'}
              </button>
              {!profile && (
                <Link href="/login" className="block text-center text-[12px] text-accent-warm hover:text-accent-deep mt-2 font-semibold">
                  로그인하고 저장하기 →
                </Link>
              )}
            </div>
          </div>

          {/* 우측 · 결과 3 시나리오 */}
          <div className="space-y-3">
            {scenarios.map((s, idx) => (
              <div key={s.key} className={`card ${idx === 1 ? 'border-2 border-ink' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${s.color}`} />
                    <span className="text-[15px] font-extrabold text-ink">{s.label} 시나리오</span>
                    {idx === 1 && <span className="badge">기준</span>}
                  </div>
                  <span className="text-[11px] font-semibold text-text-tertiary">일 {s.dailyOrders}건 · x{s.mul}</span>
                </div>

                <div className="mb-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-text-tertiary mb-1">예상 순이익</div>
                  <div className={`text-[32px] font-extrabold tracking-[-0.03em] ${s.profit >= 0 ? 'text-ink' : 'text-danger'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    ₩{s.profit.toLocaleString()}
                  </div>
                  <div className={`text-[12px] font-semibold ${s.margin >= 20 ? 'text-success' : s.margin >= 10 ? 'text-warning' : 'text-danger'} mt-0.5`}>
                    마진 {s.margin.toFixed(1)}%
                  </div>
                </div>

                <div className="space-y-1.5 text-[13px]">
                  <BreakRow label="총 매출" value={s.totalRevenue} strong />
                  <BreakRow label="- 재료비" value={-s.materialCost} />
                  <BreakRow label="- 참가비" value={-s.fixedCost} />
                  {s.feeCost > 0 && <BreakRow label="- 매출 수수료" value={-s.feeCost} />}
                  <BreakRow label="- 기타 비용" value={-s.otherTotal} />
                  <div className="border-t border-line-faint pt-1.5 mt-1.5">
                    <BreakRow label="순이익" value={s.profit} bold />
                  </div>
                </div>
              </div>
            ))}

            <div className="p-4 rounded-card bg-surface-sunken border border-line">
              <div className="text-[12px] font-bold text-ink mb-1">참고</div>
              <div className="text-[11px] text-text-secondary leading-[1.6]">
                이 시뮬레이션은 유사 행사의 평균값을 기준으로 합니다. 유동인구·날씨·경쟁 파트너 수에 따라 실제 결과는 달라질 수 있습니다.
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function NumInput({ label, unit, value, onChange, min, max, step, note }: { label: string; unit: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; note?: string; }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-[13px] font-bold text-ink">{label}</label>
        <div className="flex items-baseline gap-1">
          <span className="text-[16px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>{value.toLocaleString()}</span>
          <span className="text-[11px] font-semibold text-text-tertiary">{unit}</span>
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-ink" />
      {note && <div className="text-[11px] text-text-tertiary mt-1.5">{note}</div>}
    </div>
  );
}

function BreakRow({ label, value, strong, bold }: { label: string; value: number; strong?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`${bold ? 'text-[14px] font-bold text-ink' : strong ? 'font-semibold text-ink' : 'text-text-secondary'}`}>{label}</span>
      <span className={`${bold ? 'text-[15px] font-extrabold text-ink' : strong ? 'font-bold text-ink' : 'text-text-secondary'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value < 0 ? '- ' : ''}₩{Math.abs(value).toLocaleString()}
      </span>
    </div>
  );
}
