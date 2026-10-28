'use client';

import { useEffect, useState } from 'react';

/**
 * 행사 찾기 상단 "이번 주말 지역별 날씨" (기상청 중기예보 · /api/weather)
 * - 키(DATA_GO_KR_KEY) 미설정이면 아무것도 렌더하지 않음(조용히 숨김)
 */
type WItem = { sido: string; rain: number | null; tmin: number | null; tmax: number | null; sky: string };
type WData = { configured: boolean; weekend?: { sat: string; sun: string }; items?: WItem[] };

function rainIcon(rain: number | null): string {
  if (rain == null) return '🌦';
  if (rain >= 60) return '🌧';
  if (rain >= 30) return '🌦';
  return '☀️';
}

export default function WeatherStrip() {
  const [data, setData] = useState<WData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/weather')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData({ configured: false }); });
    return () => { cancelled = true; };
  }, []);

  if (!data || !data.configured || !data.items?.length) return null;

  return (
    <section className="card mb-4" style={{ background: 'var(--info-soft, #F4F7FE)' }}>
      <div className="text-[13px] font-bold text-ink mb-2">
        🌤 이번 주말 {data.weekend ? `${data.weekend.sat}(토)·${data.weekend.sun}(일)` : ''} 지역별 날씨
        <span className="ml-1.5 text-[11px] font-normal text-text-tertiary">기상청 중기예보</span>
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {data.items.map((w) => (
          <div key={w.sido} className="flex items-center gap-1.5 rounded-input px-2.5 py-1.5 bg-surface border border-line-faint text-[12px]" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <span className="shrink-0">{rainIcon(w.rain)}</span>
            <span className="font-semibold text-ink shrink-0">{w.sido}</span>
            {w.rain != null && <span className="text-info">{w.rain}%</span>}
            {w.tmin != null && w.tmax != null && <span className="text-text-secondary ml-auto">{w.tmin}°/{w.tmax}°</span>}
          </div>
        ))}
      </div>
      <div className="mt-2 text-[11px] text-text-tertiary">숫자는 주말 강수확률 · 최저/최고 기온입니다. (기상청 중기예보 · day4~10)</div>
    </section>
  );
}
