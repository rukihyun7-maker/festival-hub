'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';

/**
 * 행사장 위치 미니 지도 (행사 상세 전용 · 가벼움 우선)
 * - Leaflet + OpenStreetMap (API 키 불필요)
 * - 화면에 들어올 때만 Leaflet을 동적 import → 메인/상세 번들에 지도 JS 미포함(지연 로드)
 * - 실패 시에도 "지도 앱에서 열기"로 길찾기 가능
 */
export default function EventMiniMap({
  lat, lng, name, address,
}: { lat: number; lng: number; name: string; address?: string | null }) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  // 마운트 시 Leaflet 동적 로드 + 지도 생성 (leaflet은 dynamic import라 메인 번들 미포함)
  useEffect(() => {
    if (!mapElRef.current) return;
    let map: import('leaflet').Map | null = null;
    let cancelled = false;
    (async () => {
      try {
        const L = (await import('leaflet')).default;
        if (cancelled || !mapElRef.current) return;
        map = L.map(mapElRef.current, { scrollWheelZoom: false, zoomControl: true }).setView([lat, lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);
        const icon = L.divIcon({
          className: '',
          html: `<svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.7 0 0 6.7 0 15c0 10 15 23 15 23s15-13 15-23C30 6.7 23.3 0 15 0z" fill="#E8A33D"/><circle cx="15" cy="15" r="6" fill="#fff"/></svg>`,
          iconSize: [30, 38],
          iconAnchor: [15, 38],
        });
        L.marker([lat, lng], { icon }).addTo(map);
        // 레이아웃 확정 후 타일 재계산(회색 지도 방지)
        setTimeout(() => { try { map?.invalidateSize(); } catch { /* noop */ } }, 150);
      } catch { if (!cancelled) setFailed(true); }
    })();
    return () => { cancelled = true; try { map?.remove(); } catch { /* noop */ } };
  }, [lat, lng]);

  const kakaoLink = `https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lng}`;

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="t-section">행사장 위치</div>
        <a href={kakaoLink} target="_blank" rel="noopener noreferrer" className="btn-secondary text-[12px] py-1.5 px-3 shrink-0">지도 앱에서 열기 ↗</a>
      </div>
      {address && <div className="text-[12.5px] text-text-secondary mb-3">{address}</div>}
      <div className="rounded-input overflow-hidden border border-line-faint" style={{ height: 240 }}>
        {failed ? (
          <div className="w-full h-full flex items-center justify-center text-center text-[12px] text-text-tertiary px-4" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)' }}>
            지도를 불러오지 못했습니다.<br />위의 &ldquo;지도 앱에서 열기&rdquo;를 이용해 주세요.
          </div>
        ) : (
          <div ref={mapElRef} style={{ width: '100%', height: '100%' }} aria-label="행사장 위치 지도" />
        )}
      </div>
    </div>
  );
}
