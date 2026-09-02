/**
 * 플랫폼 분위기 배경 · 스톡 사진 없이 CSS/SVG로 "야외 축제의 저녁 + 입지(상권)"를 표현
 * - 골든아워 글로우 · 도트 텍스처 · 스트링 라이트(전구) · 지도 반경/핀 모티프
 * tone='dark'  : 로그인 다크 히어로 패널용
 * tone='light' : 랜딩 페이퍼 배경용(은은하게)
 * 부모에 position:relative 필요. 콘텐츠는 relative(z 위)로 두어 이 배경 위에 표시.
 */
export default function FestivalBackdrop({ tone = 'dark', image }: { tone?: 'dark' | 'light'; image?: string }) {
  // 이미지 모드 · 하단 앵커 축제 일러스트 + 상단 페이드(헤드라인 영역 확보). 파일 없으면 배경색만 보임(우아하게 폴백).
  if (image) {
    return (
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: '84%',
            backgroundImage: `url("${image}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
            backgroundRepeat: 'no-repeat',
            // 위·아래 모두 페이드 → 헤드라인 영역 확보 + 하단 카드와 자연스러운 분리
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.55) 24%, #000 46%, #000 74%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.55) 24%, #000 46%, #000 74%, transparent 100%)',
            opacity: tone === 'dark' ? 0.42 : 1,
          }}
        />
      </div>
    );
  }

  const dark = tone === 'dark';
  const wire = dark ? 'rgba(255,255,255,0.20)' : 'rgba(20,18,14,0.15)';
  const ring = dark ? 'rgba(255,255,255,0.10)' : 'rgba(20,18,14,0.09)';
  const dotColor = dark ? 'rgba(255,255,255,0.055)' : 'rgba(20,18,14,0.055)';
  const glow = dark ? 0.22 : 0.14;
  const pin = dark ? 'rgba(255,200,0,0.72)' : 'rgba(201,98,46,0.66)';
  const pinFill = dark ? 'rgba(255,200,0,0.42)' : 'rgba(201,98,46,0.38)';
  const pinBody = dark ? 'rgba(255,200,0,0.12)' : 'rgba(201,98,46,0.10)';

  // 스트링 라이트 전구(보케) — 더 촘촘하고 크게
  const N = 13;
  const dots = Array.from({ length: N }, (_, i) => {
    const l = 5 + (90 * i) / (N - 1);
    const top = 9 + 24 * Math.sin((Math.PI * l) / 100);
    const s = i % 2 === 0 ? 8 : 5;
    const o = dark ? (i % 2 === 0 ? 1 : 0.72) : (i % 2 === 0 ? 0.82 : 0.55);
    return { l, top, s, o };
  });

  // 지도 핀 — 크기 다른 3개 (좋은 '자리'들)
  const pins = [
    { x: 84, y: 70, scale: 1.4, rings: true },  // 우하단 큰 것(반경)
    { x: 21, y: 47, scale: 0.72 },              // 좌측 작은 것
    { x: 58, y: 27, scale: 0.55 },              // 상단 우측 작은 것
  ];

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* 골든아워 글로우 (강화) */}
      <div className="absolute inset-x-0 top-0" style={{ height: '66%', background: `radial-gradient(66% 84% at 50% -12%, rgba(255,200,0,${glow}), transparent 72%)` }} />

      {/* 도트 텍스처 */}
      <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(${dotColor} 1px, transparent 1.6px)`, backgroundSize: '26px 26px' }} />

      {/* 지도 반경 링 (메인 핀 주변) */}
      <svg className="absolute" style={{ left: '84%', top: '70%', transform: 'translate(-50%,-50%)', width: 'clamp(150px, 26vw, 260px)', height: 'auto', opacity: dark ? 0.6 : 0.62 }} viewBox="0 0 200 200" fill="none">
        {[42, 74, 106].map((r) => <circle key={r} cx="100" cy="100" r={r} stroke={ring} strokeWidth="1.1" />)}
      </svg>

      {/* 지도 핀 3개 */}
      {pins.map((p, i) => (
        <div key={i} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: `translate(-50%,-100%) scale(${p.scale})`, transformOrigin: 'bottom center', opacity: dark ? 0.78 : 0.72 }}>
          <svg width="42" height="54" viewBox="0 0 42 54" fill="none">
            <path d="M21 5 C12 5 5 12 5 21 C5 34 21 49 21 49 C21 49 37 34 37 21 C37 12 30 5 21 5 Z" fill={pinBody} stroke={pin} strokeWidth="2.2" />
            <circle cx="21" cy="21" r="6" fill={pinFill} />
          </svg>
        </div>
      ))}

      {/* 스트링 라이트 · 와이어 */}
      <svg className="absolute top-0 left-0 w-full" style={{ height: 66 }} viewBox="0 0 100 60" preserveAspectRatio="none" fill="none">
        <path d="M0,9 C26,35 74,35 100,9" stroke={wire} strokeWidth="1.5" />
      </svg>

      {/* 스트링 라이트 · 전구(보케 글로우 강화) */}
      {dots.map((d, i) => (
        <span key={i} className="absolute rounded-full" style={{
          left: `${d.l}%`, top: d.top + 4, width: d.s, height: d.s, background: '#FFC800', opacity: d.o,
          boxShadow: `0 0 ${d.s * 3}px ${d.s * 1.1}px rgba(255,200,0,${d.o * (dark ? 0.6 : 0.38)})`,
        }} />
      ))}
    </div>
  );
}
