'use client';

import { useEffect, useMemo, useState } from 'react';

/**
 * 홈 "내 지역 7일 날씨" (기상청 단기+중기 · /api/weather?sido=)
 * - 기본 시도: 프로필 '활동 지역'(자유입력)에서 추출 → 없으면 저장값 → 서울
 * - 시도 드롭다운으로 변경(선택값 localStorage 저장)
 * - 키(DATA_GO_KR_KEY) 미설정이면 숨김
 */
type WDay = {
  date: string; dow: string; today: boolean; weekend: boolean;
  rain: number | null; tmin: number | null; tmax: number | null; sky: string;
};
type WData = { configured: boolean; sido?: string; sidos?: string[]; shortTerm?: boolean; days?: WDay[] };
type AirLevel = { value: number; grade: number; label: string };
type AirData = { configured: boolean; pm25?: AirLevel | null; pm10?: AirLevel | null; dataTime?: string | null };

// 등급 색: 좋음·보통·나쁨·매우나쁨
const GRADE_COLOR = ['#1E88E5', '#1D6B2A', '#E8902A', '#C0392B'];

const SIDOS = ['서울', '인천', '경기', '강원', '충북', '충남', '대전', '세종', '전북', '전남·광주', '경북', '대구', '경남', '부산', '울산', '제주'];
const ALIASES: Record<string, string[]> = {
  서울: ['서울'], 인천: ['인천'], 경기: ['경기'], 강원: ['강원'],
  충북: ['충북', '충청북'], 충남: ['충남', '충청남'], 대전: ['대전'], 세종: ['세종'],
  전북: ['전북', '전라북'], '전남·광주': ['전남', '광주', '전라남'],
  경북: ['경북', '경상북'], 대구: ['대구'], 경남: ['경남', '경상남'], 부산: ['부산'], 울산: ['울산'], 제주: ['제주'],
};

/** 프로필 활동지역 자유텍스트("서울 성동구")에서 시도 추출 */
function sidoFromRegion(region?: string | null): string {
  const r = (region ?? '').trim();
  if (!r) return '';
  for (const s of SIDOS) {
    if ((ALIASES[s] ?? [s]).some((a) => r.startsWith(a) || r.includes(a))) return s;
  }
  return '';
}

function skyEmoji(sky: string, rain: number | null): string {
  if (/눈/.test(sky)) return '🌨';
  if (/소나기/.test(sky)) return '🌦';
  if (/비/.test(sky)) return '🌧';
  if (/흐림/.test(sky)) return '☁️';
  if (/구름/.test(sky)) return '⛅';
  if (/맑/.test(sky)) return '☀️';
  if (rain != null && rain >= 60) return '🌧';
  if (rain != null && rain >= 30) return '🌦';
  return '🌤';
}

export default function WeatherWeek({ defaultRegion }: { defaultRegion?: string | null }) {
  const regionSido = useMemo(() => sidoFromRegion(defaultRegion), [defaultRegion]);
  const [sido, setSido] = useState<string>('');
  const [data, setData] = useState<WData | null>(null);
  const [air, setAir] = useState<AirData | null>(null);
  const [loading, setLoading] = useState(true);

  // 초기 시도 결정: 저장값 > 프로필지역 > 서울
  useEffect(() => {
    let saved = '';
    try { saved = localStorage.getItem('fh_weather_sido') || ''; } catch { /* no-op */ }
    setSido(saved || regionSido || '서울');
  }, [regionSido]);

  useEffect(() => {
    if (!sido) return;
    let cancelled = false;
    setLoading(true);
    const q = encodeURIComponent(sido);
    fetch(`/api/weather?sido=${q}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData({ configured: false }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    // 현재 대기질(미세먼지) · 실패해도 날씨엔 영향 없음
    fetch(`/api/airquality?sido=${q}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setAir(d); })
      .catch(() => { if (!cancelled) setAir(null); });
    return () => { cancelled = true; };
  }, [sido]);

  const onPick = (v: string) => {
    setSido(v);
    try { localStorage.setItem('fh_weather_sido', v); } catch { /* no-op */ }
  };

  if (data && !data.configured) return null; // 키 미설정 → 숨김

  const days = data?.days ?? [];
  const noShortTerm = data?.configured && data.shortTerm === false;

  return (
    <section className="card animate-fh-up" style={{ background: 'var(--info-soft, #F4F7FE)' }}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="text-[14px] font-extrabold text-ink flex items-center gap-1.5">
          🌤 내 지역 7일 날씨
          <span className="text-[11px] font-normal text-text-tertiary">기상청</span>
        </div>
        <label className="flex items-center gap-1.5 text-[12px] text-text-secondary">
          지역
          <select
            value={sido}
            onChange={(e) => onPick(e.target.value)}
            className="rounded-input border border-line-faint bg-surface px-2 py-1 text-[13px] font-semibold text-ink"
            aria-label="날씨 지역 선택"
          >
            {(data?.sidos ?? SIDOS).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      {loading && days.length === 0 ? (
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-[92px] rounded-input bg-surface/60 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {days.map((d) => {
            const empty = d.rain == null && d.tmin == null && d.tmax == null && !d.sky;
            return (
              <div
                key={d.date}
                className={`rounded-input px-1.5 py-2.5 text-center border ${d.today ? 'border-info bg-surface' : 'border-line-faint bg-surface/80'}`}
              >
                <div className={`text-[12px] font-bold ${d.today ? 'text-info' : d.weekend ? 'text-danger' : 'text-ink'}`}>
                  {d.today ? '오늘' : d.dow}
                </div>
                <div className="text-[10.5px] text-text-tertiary mb-1">{d.date}</div>
                {empty ? (
                  <div className="text-[11px] text-text-tertiary py-2">—</div>
                ) : (
                  <>
                    <div className="text-[20px] leading-none mb-1">{skyEmoji(d.sky, d.rain)}</div>
                    <div className="text-[11px] text-info font-semibold">{d.rain != null ? `${d.rain}%` : '·'}</div>
                    <div className="text-[11.5px] text-text-secondary mt-0.5">
                      {d.tmin != null ? `${d.tmin}°` : '·'}<span className="text-text-tertiary">/</span>{d.tmax != null ? `${d.tmax}°` : '·'}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {air?.configured && (air.pm25 || air.pm10) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-input bg-surface/80 border border-line-faint px-2.5 py-1.5 text-[12px]">
          <span className="text-[11px] font-bold text-text-tertiary">현재 대기질</span>
          {air.pm25 && (
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: GRADE_COLOR[air.pm25.grade] }} />
              <span className="text-ink font-semibold">초미세먼지</span>
              <span style={{ color: GRADE_COLOR[air.pm25.grade] }} className="font-bold">{air.pm25.label}</span>
              <span className="text-text-tertiary" style={{ fontVariantNumeric: 'tabular-nums' }}>{air.pm25.value}㎍</span>
            </span>
          )}
          {air.pm10 && (
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: GRADE_COLOR[air.pm10.grade] }} />
              <span className="text-ink font-semibold">미세먼지</span>
              <span style={{ color: GRADE_COLOR[air.pm10.grade] }} className="font-bold">{air.pm10.label}</span>
              <span className="text-text-tertiary" style={{ fontVariantNumeric: 'tabular-nums' }}>{air.pm10.value}㎍</span>
            </span>
          )}
        </div>
      )}

      <div className="mt-2 text-[11px] text-text-tertiary">
        강수확률 · 최저/최고 기온 · {data?.sido ?? sido} 기준.
        {noShortTerm && <span className="text-warning"> 오늘·내일 상세는 기상청 단기예보 승인 후 표시됩니다.</span>}
      </div>
    </section>
  );
}
