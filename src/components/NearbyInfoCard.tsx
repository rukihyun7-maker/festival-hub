'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchNearby, fetchNearbyEvents } from '@/lib/supabase/queries';
import type { NearbyRow, LocalInfoCategory, NearbyEvent } from '@/lib/types';

/**
 * 인근지역 정보 카드 (반경 1km 상권·인구 시설)
 * 이벤트 상세에서 fetchNearby(eventId) 결과를 category별 요약.
 * 데이터: 카카오 로컬(장소·위치·거리) — 개수/거리 기반. 세대수·재학생수 등 상세 수치는 미표기(실측 없음).
 * 디자인: 인포 블루 톤 (DESIGN_SYSTEM v2.0)
 */

const CAT_META: Record<string, { label: string; icon: string; order: number }> = {
  apartment: { label: '아파트 단지', icon: '🏢', order: 1 },
  university: { label: '대학교', icon: '🎓', order: 2 },
  transit: { label: '지하철역', icon: '🚇', order: 3 },
  commercial: { label: '대형마트', icon: '🛒', order: 4 },
  festival: { label: '인근 축제', icon: '🎪', order: 5 },
};

function fmtDist(m: number): string {
  if (!m && m !== 0) return '';
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

function num(data: Record<string, unknown>, key: string): number | null {
  const v = data?.[key];
  return typeof v === 'number' ? v : null;
}

/** 사람수 축약: 10,000 이상 '만' 단위 */
function fmtPeople(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}만명` : `${n.toLocaleString()}명`;
}

/** 각 시설의 부가 수치 (세대수·재학생수) — data에 있을 때만 */
function itemExtra(cat: LocalInfoCategory, data: Record<string, unknown>): string | null {
  if (cat === 'apartment') {
    const h = num(data, 'households');
    return h ? `${h.toLocaleString()}세대` : null;
  }
  if (cat === 'university') {
    const e = num(data, 'enrolled');
    return e ? `재학생 약 ${fmtPeople(e)}` : null;
  }
  return null;
}

/** 그룹 헤더 요약 — 합계 수치가 있으면 표기, 없으면 개수 */
function headSummary(cat: LocalInfoCategory, items: NearbyRow[]): string {
  if (cat === 'apartment') {
    const withHH = items.filter((it) => num(it.data, 'households'));
    const total = withHH.reduce((s, it) => s + (num(it.data, 'households') ?? 0), 0);
    if (withHH.length === items.length && total > 0) return `${items.length}단지 · 총 ${total.toLocaleString()}세대`;
    if (withHH.length > 0) return `${items.length}곳 · 확인 ${total.toLocaleString()}세대`;
    return `${items.length}곳`;
  }
  if (cat === 'university') {
    const total = items.reduce((s, it) => s + (num(it.data, 'enrolled') ?? 0), 0);
    return total > 0 ? `${items.length}개 · 재학생 약 ${fmtPeople(total)}` : `${items.length}개`;
  }
  return `${items.length}곳`;
}

export default function NearbyInfoCard({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<NearbyRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  const [fests, setFests] = useState<NearbyEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [r, ev] = await Promise.all([
          fetchNearby(eventId, 1000),
          fetchNearbyEvents(eventId, 20000),
        ]);
        if (!cancelled) { setRows(r); setFests(ev); }
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [eventId]);

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      </div>
    );
  }

  // 위경도 미지정이거나 인근 정보 없음(시설·행사 모두) → 카드 숨김
  if ((!rows || rows.length === 0) && fests.length === 0) return null;

  // category별 그룹 (거리순은 이미 find_nearby가 정렬)
  const groups = new Map<LocalInfoCategory, NearbyRow[]>();
  for (const r of rows ?? []) {
    if (!groups.has(r.category)) groups.set(r.category, []);
    groups.get(r.category)!.push(r);
  }
  const hasFacilities = (rows?.length ?? 0) > 0;
  const ordered = [...groups.entries()].sort(
    (a, b) => (CAT_META[a[0]]?.order ?? 9) - (CAT_META[b[0]]?.order ?? 9)
  );

  return (
    <div className="card" style={{ borderColor: 'var(--info-bar, #8FA6DE)' }}>
      <div className="flex items-baseline justify-between mb-1">
        <div className="t-section">{hasFacilities ? '반경 1km 주변 시설' : '주변 정보'}</div>
        <span className="text-[11px] text-text-tertiary">출처: 카카오맵</span>
      </div>
      <div className="t-sub mb-4">행사 자리의 주변 유동인구를 가늠하는 참고 지표입니다.</div>

      {hasFacilities && (
      <div className="space-y-3">
        {ordered.map(([cat, items]) => {
          const meta = CAT_META[cat] ?? { label: cat, icon: '📍' };
          const top = items.slice(0, 4);
          const head = headSummary(cat, items);
          return (
            <div
              key={cat}
              className="p-3 rounded-input"
              style={{ background: 'var(--info-soft, #F4F7FE)' }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-bold" style={{ color: 'var(--info, #2B4B9B)' }}>
                  {meta.icon} {meta.label}
                </span>
                <span
                  className="text-[13px] font-extrabold text-ink"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {head}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-text-secondary leading-relaxed">
                {top.map((it) => {
                  const extra = itemExtra(cat, it.data);
                  return (
                    <span key={it.id} className="whitespace-nowrap">
                      {it.name}
                      {extra && <span className="font-semibold text-ink"> {extra}</span>}
                      <span className="text-text-tertiary"> {fmtDist(it.distance_m)}</span>
                    </span>
                  );
                })}
                {items.length > top.length && (
                  <span className="text-text-tertiary">외 {items.length - top.length}곳</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {fests.length > 0 && (
        <div className={hasFacilities ? 'mt-4 pt-4 border-t border-line-faint' : ''}>
          <div className="text-[13px] font-bold mb-2" style={{ color: 'var(--info, #2B4B9B)' }}>
            🎪 인근 축제·행사 {fests.length}건
          </div>
          <div className="space-y-1.5">
            {fests.map((f) => (
              <Link
                key={f.id}
                href={`/events/${f.id}`}
                className="flex items-baseline justify-between gap-2 text-[12px] hover:opacity-70"
              >
                <span className="font-semibold text-ink line-clamp-1">{f.name}</span>
                <span className="shrink-0 text-text-tertiary whitespace-nowrap">
                  {fmtEventDate(f.start_date)} · {fmtDist(f.distance_m)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function fmtEventDate(d: string): string {
  return d ? d.slice(5).replace('-', '.') : '';
}
