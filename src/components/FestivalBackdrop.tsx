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
            height: '86%',
            backgroundImage: `url("${image}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
            backgroundRepeat: 'no-repeat',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 30%, black 55%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 30%, black 55%)',
            opacity: tone === 'dark' ? 0.42 : 1,
          }}
        />
      </div>
    );
  }

  const dark = tone === 'dark';
  const wire = dark ? 'rgba(255,255,255,0.16)' : 'rgba(20,18,14,0.12)';
  const ring = dark ? 'rgba(255,255,255,0.07)' : 'rgba(20,18,14,0.06)';
  const dotColor = dark ? 'rgba(255,255,255,0.05)' : 'rgba(20,18,14,0.05)';
  const glow = dark ? 0.14 : 0.09;
  const pin = dark ? 'rgba(255,200,0,0.5)' : 'rgba(201,98,46,0.5)';
  const pinFill = dark ? 'rgba(255,200,0,0.32)' : 'rgba(201,98,46,0.3)';

  // 스트링 라이트 전구(보케) 위치 — 상단 와이어의 살짝 처진 곡선을 따라 배치
  const N = 9;
  const dots = Array.from({ length: N }, (_, i) => {
    const l = 6 + (88 * i) / (N - 1);
    const top = 9 + 22 * Math.sin((Math.PI * l) / 100);
    const s = i % 2 === 0 ? 6.5 : 4.5;
    const o = dark ? (i % 2 === 0 ? 0.9 : 0.6) : (i % 2 === 0 ? 0.75 : 0.5);
    return { l, top, s, o };
  });

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* 골든아워 글로우 */}
      <div className="absolute inset-x-0 top-0" style={{ height: '62%', background: `radial-gradient(64% 82% at 50% -14%, rgba(255,200,0,${glow}), transparent 72%)` }} />

      {/* 도트 텍스처 */}
      <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(${dotColor} 1px, transparent 1.6px)`, backgroundSize: '26px 26px' }} />

      {/* 지도 반경 · 핀 모티프 (입지/상권 은유) */}
      <svg className="absolute" style={{ right: '-46px', bottom: '-46px', width: 'clamp(190px, 32vw, 320px)', height: 'auto', opacity: dark ? 0.55 : 0.6 }} viewBox="0 0 200 200" fill="none">
        {[38, 64, 90].map((r) => <circle key={r} cx="104" cy="110" r={r} stroke={ring} strokeWidth="1" />)}
        <path d="M104 82 C93 82 84 91 84 102 C84 117 104 134 104 134 C104 134 124 117 124 102 C124 91 115 82 104 82 Z" fill="none" stroke={pin} strokeWidth="1.6" />
        <circle cx="104" cy="101" r="5.5" fill={pinFill} />
      </svg>

      {/* 스트링 라이트 · 와이어 */}
      <svg className="absolute top-0 left-0 w-full" style={{ height: 64 }} viewBox="0 0 100 60" preserveAspectRatio="none" fill="none">
        <path d="M0,9 C26,34 74,34 100,9" stroke={wire} strokeWidth="1.4" />
      </svg>

      {/* 스트링 라이트 · 전구(보케 글로우) */}
      {dots.map((d, i) => (
        <span key={i} className="absolute rounded-full" style={{
          left: `${d.l}%`, top: d.top + 4, width: d.s, height: d.s, background: '#FFC800', opacity: d.o,
          boxShadow: `0 0 ${d.s * 2.4}px ${d.s * 0.7}px rgba(255,200,0,${d.o * (dark ? 0.45 : 0.3)})`,
        }} />
      ))}
    </div>
  );
}
