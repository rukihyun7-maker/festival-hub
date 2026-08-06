'use client';

import { useEffect, useState } from 'react';
import { fetchNearby } from '@/lib/supabase/queries';
import type { NearbyRow, ApartmentData, UniversityData, FestivalData } from '@/lib/types';

/**
 * 인근지역 정보 카드 (반경 1km 잠재 수요)
 * 이벤트 상세에서 fetchNearby(eventId) 결과를 category별 요약.
 * 디자인: 인포 블루 톤, 옐로우 강조 X (DESIGN_SYSTEM v2.0)
 * 출처: 국토부 · 대학알리미 등 (실 데이터 연동 시 표기)
 */
export default function NearbyInfoCard({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<NearbyRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchNearby(eventId, 1000);
        if (!cancelled) setRows(r);
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

  // 위경도 미지정이거나 인근 정보 없음
  if (!rows || rows.length === 0) return null;

  const apts = rows.filter((r) => r.category === 'apartment');
  const unis = rows.filter((r) => r.category === 'university');
  const fests = rows.filter((r) => r.category === 'festival');
  const transits = rows.filter((r) => r.category === 'transit');

  const totalHouseholds = apts.reduce((s, a) => s + ((a.data as unknown as ApartmentData).households ?? 0), 0);
  const totalStudents = unis.reduce((s, u) => s + ((u.data as unknown as UniversityData).enrolled ?? 0), 0);

  return (
    <div className="card" style={{ borderColor: 'var(--info-bar, #8FA6DE)' }}>
      <div className="flex items-baseline justify-between mb-1">
        <div className="t-section">반경 1km 내 잠재 수요</div>
        <span className="text-[11px] text-text-tertiary">출처: 공공데이터</span>
      </div>
      <div className="t-sub mb-4">행사 자리의 주변 유동인구를 가늠하는 참고 지표입니다.</div>

      <div className="space-y-3">
        {apts.length > 0 && (
          <NearbyRowView
            label="아파트"
            head={`${apts.length}단지 · 총 ${totalHouseholds.toLocaleString()}세대`}
            items={apts.slice(0, 3).map((a) => `${a.name} ${((a.data as unknown as ApartmentData).households ?? 0).toLocaleString()}세대`)}
          />
        )}
        {unis.length > 0 && (
          <NearbyRowView
            label="대학교"
            head={`${unis.length}개 · 재학생 ${totalStudents.toLocaleString()}명`}
            items={unis.map((u) => `${u.name} ${((u.data as unknown as UniversityData).enrolled ?? 0).toLocaleString()}명`)}
          />
        )}
        {fests.length > 0 && (
          <NearbyRowView
            label="대학축제"
            head={`${fests.length}건`}
            items={fests.map((f) => {
              const d = f.data as unknown as FestivalData;
              return `${f.name} ${fmtDate(d.start_date)}~${fmtDate(d.end_date)}`;
            })}
          />
        )}
        {transits.length > 0 && (
          <NearbyRowView
            label="지하철역"
            head={`${transits.length}개`}
            items={[transits.map((t) => t.name).join(' · ')]}
          />
        )}
      </div>
    </div>
  );
}

function NearbyRowView({ label, head, items }: { label: string; head: string; items: string[] }) {
  return (
    <div className="p-3 rounded-input bg-info-soft" style={{ background: 'var(--info-soft, #F4F7FE)' }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-bold" style={{ color: 'var(--info, #2B4B9B)' }}>{label}</span>
        <span className="text-[13px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>{head}</span>
      </div>
      {items.length > 0 && (
        <div className="mt-1.5 text-[12px] text-text-secondary leading-relaxed">
          {items.join(' / ')}
        </div>
      )}
    </div>
  );
}

function fmtDate(d: string): string {
  return d ? d.slice(5).replace('-', '.') : '';
}
