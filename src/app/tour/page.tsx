'use client';

import Link from 'next/link';

/**
 * 시스템 둘러보기 · 로그인 없이 주요 화면을 소개하는 공개 페이지
 * 각 화면을 더미 데이터 목업으로 재현 (실제 스크린샷 불필요)
 */

/* ── 공통 프레임 ── */
function Frame({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card overflow-hidden border border-line-strong bg-surface">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-line-faint" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)' }}>
        <span className="w-2 h-2 rounded-full" style={{ background: '#E06A5A' }} />
        <span className="w-2 h-2 rounded-full" style={{ background: '#E8C15A' }} />
        <span className="w-2 h-2 rounded-full" style={{ background: '#7FB07A' }} />
        <span className="ml-2 text-[10px] text-text-tertiary truncate" style={{ fontFamily: 'ui-monospace, monospace' }}>festivalhub.co.kr{path}</span>
      </div>
      <div className="p-3.5" style={{ minHeight: 220 }}>{children}</div>
    </div>
  );
}
function Chip({ on, children }: { on?: boolean; children: React.ReactNode }) {
  return <span className={`text-[10px] px-2 py-1 rounded-pill font-semibold ${on ? 'bg-ink text-white' : 'bg-surface-sunken text-text-secondary border border-line'}`}>{children}</span>;
}
function Badge({ tone, children }: { tone: 'ok' | 'warn' | 'bad' | 'info'; children: React.ReactNode }) {
  const m = { ok: 'badge-success', warn: 'badge-warning', bad: 'badge-danger', info: 'badge-info' }[tone];
  return <span className={`badge ${m}`} style={{ fontSize: 10 }}>{children}</span>;
}

/* ── 화면별 목업 ── */
function MockEvents() {
  const evs = [
    { n: '서울숲 가을 플리마켓', r: '서울 · 성동', d: 'D-6', fee: '일 5만원', t: 'warn' as const },
    { n: '한강 밤도깨비 야시장', r: '서울 · 영등포', d: 'D-12', fee: '일 3만원', t: 'warn' as const },
    { n: '수원 화성 문화축제', r: '경기 · 수원', d: '진행중', fee: '무료', t: 'ok' as const },
    { n: '대구 치맥 페스티벌', r: '대구 · 중구', d: 'D-20', fee: '일 8만원', t: 'warn' as const },
  ];
  return (
    <div>
      <div className="flex gap-1.5 mb-3 flex-wrap">
        <Chip on>전체</Chip><Chip>서울</Chip><Chip>경기</Chip><Chip>신청 가능</Chip><Chip>축제</Chip>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {evs.map((e) => (
          <div key={e.n} className="rounded-input border border-line-faint p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Badge tone={e.t}>{e.d}</Badge>
              <span className="text-[9px] text-text-tertiary">{e.r}</span>
            </div>
            <div className="text-[11px] font-extrabold text-ink leading-tight mb-1 truncate">{e.n}</div>
            <div className="text-[10px] text-text-secondary">참가비 {e.fee}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function MockSimulator() {
  const rows = [['일 매출(예상)', '1,200,000원'], ['원가율', '38%'], ['참가비/일', '50,000원'], ['운영일수', '2일']];
  const tiles = [['최악', '312,000', 'bad'], ['현실', '694,000', 'ok'], ['최상', '1,120,000', 'info']] as const;
  return (
    <div>
      <div className="space-y-1.5 mb-3">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between rounded-input border border-line-faint px-2.5 py-1.5">
            <span className="text-[10px] text-text-secondary">{k}</span>
            <span className="text-[11px] font-bold text-ink">{v}</span>
          </div>
        ))}
      </div>
      <div className="text-[10px] font-bold text-text-tertiary mb-1.5">예상 순익</div>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map(([k, v, t]) => (
          <div key={k} className="rounded-input p-2 text-center" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)' }}>
            <div className="text-[9px] text-text-tertiary mb-0.5">{k}</div>
            <div className={`text-[12px] font-extrabold ${t === 'bad' ? 'text-danger' : t === 'info' ? 'text-info' : 'text-success'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function MockDocs() {
  const docs = [
    ['사업자등록증', 'ok', '확인'], ['식품위생업 신고증', 'ok', '확인'],
    ['위생교육 이수증', 'warn', '만료 임박'], ['부스·트럭 외부 사진', 'ok', '확인'],
    ['부스·트럭 내부 사진', 'bad', '검토 대기'], ['영업배상책임보험', 'info', '선택'],
  ] as const;
  return (
    <div className="space-y-1.5">
      {docs.map(([n, t, l]) => (
        <div key={n} className="flex items-center justify-between rounded-input border border-line-faint px-2.5 py-2">
          <span className="text-[11px] font-semibold text-ink">{n}</span>
          <Badge tone={t}>{l}</Badge>
        </div>
      ))}
    </div>
  );
}
function MockCreate() {
  return (
    <div className="space-y-2.5">
      {[['행사명', '서울숲 가을 플리마켓'], ['일정', '2026.10.10 – 10.12'], ['장소', '서울 성동 · 서울숲 문화광장']].map(([k, v]) => (
        <div key={k}>
          <div className="text-[9px] font-semibold text-ink-soft mb-1">{k}</div>
          <div className="rounded-input border border-line-faint px-2.5 py-1.5 text-[11px] text-ink">{v}</div>
        </div>
      ))}
      <div>
        <div className="text-[9px] font-semibold text-ink-soft mb-1">모집 부문</div>
        <div className="flex gap-1.5 flex-wrap">
          <Chip on>푸드트럭 10</Chip><Chip on>플리마켓 20</Chip><Chip on>체험부스 5</Chip>
        </div>
      </div>
      <div className="pt-1"><span className="btn-primary text-[11px] py-1.5 px-3 inline-flex">행사 등록</span></div>
    </div>
  );
}
function MockApplicants() {
  const apps = [
    ['라이트분식', '푸드트럭', 'warn', '대기'], ['성수커피트럭', '푸드트럭', 'ok', '승인'],
    ['수제버거하우스', '음식부스', 'warn', '대기'], ['달콤솜사탕', '체험부스', 'bad', '반려'],
  ] as const;
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[['대기', '2'], ['승인', '1'], ['반려', '1']].map(([k, v]) => (
          <div key={k} className="rounded-input p-2 text-center" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)' }}>
            <div className="text-[13px] font-extrabold text-ink">{v}</div>
            <div className="text-[9px] text-text-tertiary">{k}</div>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {apps.map(([n, s, t, l]) => (
          <div key={n} className="flex items-center justify-between rounded-input border border-line-faint px-2.5 py-2">
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-ink truncate">{n}</div>
              <div className="text-[9px] text-text-tertiary">{s}</div>
            </div>
            <Badge tone={t}>{l}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
function MockReview() {
  return (
    <div className="space-y-2.5">
      <div className="rounded-input border-2 p-3" style={{ borderColor: 'var(--accent, #FFC800)' }}>
        <div className="flex items-center gap-1.5 mb-1.5"><Badge tone="warn">심사 중</Badge><span className="text-[9px] text-text-tertiary">축제</span></div>
        <div className="text-[12px] font-extrabold text-ink">수원 화성 문화축제</div>
        <div className="text-[10px] text-text-secondary mt-0.5">수원문화재단 · 2026.10.18 – 10.20 · 경기</div>
        <div className="flex flex-wrap gap-1 mt-2">
          <Badge tone="ok">✓ 일정</Badge><Badge tone="ok">✓ 장소</Badge><Badge tone="ok">✓ 참가비</Badge><Badge tone="bad">✕ 좌표</Badge>
        </div>
        <div className="flex gap-1.5 mt-2.5">
          <span className="btn-primary text-[10px] py-1 px-2.5 inline-flex">승인하고 공개</span>
          <span className="btn-secondary text-[10px] py-1 px-2.5 inline-flex">반려</span>
        </div>
      </div>
    </div>
  );
}
function MockDocVerify() {
  const rows = [
    ['라이트분식', '박라이트', 'warn', '검토 대기'], ['성수커피트럭', '김성수', 'ok', '검증 완료'],
    ['수제버거하우스', '이버거', 'warn', '검토 대기'], ['달콤솜사탕', '최달콤', 'bad', '반려'],
  ] as const;
  return (
    <div className="space-y-1.5">
      {rows.map(([n, p, t, l]) => (
        <div key={n} className="flex items-center justify-between rounded-input border border-line-faint px-2.5 py-2">
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-ink truncate">{n}</div>
            <div className="text-[9px] text-text-tertiary">{p} · 필수 서류 6종</div>
          </div>
          <Badge tone={t}>{l}</Badge>
        </div>
      ))}
    </div>
  );
}

type Shot = { path: string; title: string; desc: string; el: React.ReactNode };
const GROUPS: { role: string; mark: string; tone: string; shots: Shot[] }[] = [
  {
    role: '입점 파트너', mark: '입', tone: '푸드트럭·음식부스 사업자',
    shots: [
      { path: '/events', title: '행사 찾기', desc: '지역·기간·상권·예상 수익까지 보이는 행사 자리를 한눈에 탐색합니다.', el: <MockEvents /> },
      { path: '/seller/simulator', title: '손익 시뮬레이터', desc: '방문객·객단가만 넣으면 최악·현실·최상 3가지 순익을 즉시 계산합니다.', el: <MockSimulator /> },
      { path: '/seller/documents', title: '사업자 서류 관리', desc: '필수 서류를 한 번 등록하면 신청 시 자동 첨부·우선 노출됩니다.', el: <MockDocs /> },
    ],
  },
  {
    role: '행사 주최', mark: '주', tone: '축제·팝업·플리마켓 운영',
    shots: [
      { path: '/host/create-event', title: '행사 등록 · 모집 공고', desc: '일정·장소·조건·모집 부문·필수 서류를 손쉽게 등록합니다.', el: <MockCreate /> },
      { path: '/host/applicants', title: '신청자 관리', desc: '서류·매장·부스 사진까지 확인하고 검증된 파트너를 승인합니다.', el: <MockApplicants /> },
    ],
  },
  {
    role: '플랫폼 운영', mark: '운', tone: '서비스 관리자 전용',
    shots: [
      { path: '/admin/events', title: '행사 검수', desc: '주최가 올린 등록 요청을 검수해 공개해 신뢰도를 유지합니다.', el: <MockReview /> },
      { path: '/admin/users', title: '서류 검증 · 사용자 관리', desc: '필수 서류를 검증해 “검증된 파트너·행사” 생태계를 지킵니다.', el: <MockDocVerify /> },
    ],
  },
];

export default function TourPage() {
  return (
    <main className="min-h-screen bg-page">
      <header className="border-b border-line">
        <div className="container-app flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[8px] bg-ink flex items-center justify-center">
              <span className="text-accent font-extrabold text-[14px] leading-none">F</span>
            </div>
            <span className="font-extrabold text-[15px] tracking-[-0.02em] text-ink">Festival Hub</span>
          </Link>
          <Link href="/login" className="text-[14px] font-semibold text-text-secondary hover:text-ink">로그인</Link>
        </div>
      </header>

      <section className="container-app pt-14 pb-10 text-center">
        <span className="badge badge-warning mb-5 inline-flex">시스템 둘러보기</span>
        <h1 className="font-extrabold tracking-[-0.03em] leading-[1.15] mb-4" style={{ fontSize: 'clamp(28px, 5vw, 44px)' }}>
          로그인 없이 <span style={{ color: 'var(--accent-warm)' }}>주요 화면</span>을 미리 살펴보세요
        </h1>
        <p className="text-text-secondary leading-[1.65] mx-auto" style={{ fontSize: 'clamp(14px, 2vw, 17px)', maxWidth: '540px' }}>
          입점 파트너 · 행사 주최 · 운영 관리자 각 역할의 핵심 화면입니다. (예시 데이터로 구성)
        </p>
      </section>

      <section className="container-app pb-16 space-y-14">
        {GROUPS.map((g) => (
          <div key={g.role}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center font-extrabold text-[14px] text-ink" style={{ background: 'var(--warning-bg, #FFF3C4)' }}>{g.mark}</div>
              <div>
                <div className="text-[18px] font-extrabold text-ink">{g.role}</div>
                <div className="text-[12px] text-text-tertiary">{g.tone}</div>
              </div>
            </div>
            <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {g.shots.map((s) => (
                <div key={s.path}>
                  <Frame path={s.path}>{s.el}</Frame>
                  <div className="mt-2.5 px-0.5">
                    <div className="text-[14px] font-extrabold text-ink mb-0.5">{s.title}</div>
                    <div className="text-[12.5px] text-text-secondary leading-relaxed">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="border-t border-line bg-surface-sunken">
        <div className="container-app py-14 text-center">
          <div className="text-[20px] font-extrabold text-ink mb-2">직접 써보시겠어요?</div>
          <div className="text-text-secondary mb-6">가입·등록은 무료이고, 수수료는 거래가 있을 때만 발생합니다.</div>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/signup" className="btn-primary">무료로 시작하기</Link>
            <Link href="/" className="btn-secondary">← 홈으로</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
