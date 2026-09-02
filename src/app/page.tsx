import Link from 'next/link';

/**
 * 랜딩 · 디자인 시스템 v2.0 (웜페이퍼 · 옐로우 CTA · 노그라디언트)
 * 외부 공유용 첫 화면. 야외행사 매칭·검증·운영 가치 소구.
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-page text-ink">
      {/* 상단 바 */}
      <header className="border-b border-line">
        <div className="container-app h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[8px] bg-ink flex items-center justify-center">
              <span className="text-accent font-extrabold text-[14px] leading-none">F</span>
            </div>
            <span className="font-extrabold text-[15px] tracking-[-0.02em]">Festival Hub</span>
          </div>
          <Link href="/login" className="text-[14px] font-semibold text-text-secondary hover:text-ink">로그인</Link>
        </div>
      </header>

      {/* 히어로 */}
      <section className="container-app pt-16 pb-14 text-center">
        <span className="badge badge-warning mb-6 inline-flex">베타 · 야외행사 매칭 플랫폼</span>
        <h1
          className="font-extrabold tracking-[-0.03em] leading-[1.12] mb-5"
          style={{ fontSize: 'clamp(32px, 6vw, 56px)' }}
        >
          야외행사, <span style={{ color: 'var(--accent-warm)' }}>검증된 파트너</span>와<br />
          믿을 수 있는 주최를 잇다
        </h1>
        <p
          className="text-text-secondary leading-[1.65] mx-auto mb-9"
          style={{ fontSize: 'clamp(15px, 2.2vw, 18px)', maxWidth: '560px' }}
        >
          푸드트럭·음식부스에게는 <b className="text-ink">상권·예상 수익</b>까지 보이는 행사 자리를,
          행사 주최에게는 <b className="text-ink">서류·이력이 검증된 파트너</b>를 연결합니다.
          가입·등록 무료, 수수료는 거래가 있을 때만.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/signup" className="btn-primary">무료로 시작하기</Link>
          <Link href="/tour" className="btn-secondary">시스템 둘러보기</Link>
        </div>
      </section>

      {/* 역할 카드 */}
      <section className="container-app pb-14">
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
        >
          <RoleCard
            mark="입"
            title="입점 파트너"
            desc="푸드트럭·음식부스 사업자"
            points={['손익 시뮬레이터로 순익 예측', '서류 5종 검증·자동 첨부', '행사 찾기·간편 신청']}
          />
          <RoleCard
            mark="주"
            title="행사 주최"
            desc="축제·팝업·플리마켓 운영"
            points={['행사 등록·모집 공고', '파트너 심사·승인', '매출 대시보드·개별 지급']}
          />
          <RoleCard
            mark="운"
            title="플랫폼 운영"
            desc="서비스 관리자 전용"
            points={['필수 서류 5종 검증', '행사·사용자 관제', '전체 인사이트 지표']}
          />
        </div>
      </section>

      {/* 신뢰 포인트 */}
      <section className="border-t border-line bg-surface-sunken">
        <div className="container-app py-12">
          <div
            className="grid gap-6"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
          >
            <Feature title="손익 시뮬레이터" desc="나가기 전에 순익부터. 방문객·객단가만 넣으면 최악·현실·최상 3가지 결과를 즉시 계산합니다." />
            <Feature title="사업자 서류 관리" desc="사업자·보험·위생교육 등 5종을 한 번 등록하면 행사 신청 시 자동 첨부·우선 노출됩니다." />
            <Feature title="이메일 인증 가입" desc="인증번호로 본인을 확인해 가입자의 신빙성을 확보합니다." />
            <Feature title="개별 지급 정산" desc="복잡한 결제대행 계약 없이 행사 주최가 파트너에게 직접 지급합니다." />
          </div>
        </div>
      </section>

      {/* 하단 CTA */}
      <section className="container-app py-16 text-center">
        <div className="text-[22px] font-extrabold mb-2">지금 바로 시작해 보세요</div>
        <div className="text-text-secondary mb-6">가입 전 <Link href="/tour" className="text-ink font-semibold underline">시스템 둘러보기</Link>로 주요 화면을 먼저 볼 수 있습니다.</div>
        <Link href="/signup" className="btn-primary">무료로 시작하기</Link>
      </section>

      <footer className="border-t border-line">
        <div className="container-app py-6 flex items-center justify-between text-[12px] text-text-tertiary">
          <span>Festival Hub</span>
          <span>야외행사 QR·매칭 플랫폼</span>
        </div>
      </footer>
    </main>
  );
}

function RoleCard({ mark, title, desc, points }: { mark: string; title: string; desc: string; points: string[] }) {
  return (
    <div className="card h-full">
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center font-extrabold text-[15px] text-ink mb-3"
        style={{ background: 'var(--warning-bg, #FFF3C4)' }}
      >
        {mark}
      </div>
      <div className="text-[17px] font-extrabold text-ink">{title}</div>
      <div className="text-[13px] text-text-secondary mt-0.5 mb-4">{desc}</div>
      <ul className="space-y-1.5">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-[13px] text-ink-soft">
            <span className="text-success mt-0.5">✓</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <div className="text-[15px] font-extrabold text-ink mb-1">{title}</div>
      <div className="text-[13px] text-text-secondary leading-[1.6]">{desc}</div>
    </div>
  );
}
