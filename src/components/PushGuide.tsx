'use client';

import { useState } from 'react';

/**
 * 기기 푸시 알림 사용 가이드 (설정 화면 내 접이식)
 * - 아이폰(Safari 홈 화면 추가 필요)과 안드로이드·PC 단계 분리
 * - 사용자가 스스로 따라 켤 수 있도록 화면 안에 상주
 */
export function PushGuide() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'ios' | 'android'>('ios');

  return (
    <div className="mt-3 rounded-input border border-line-faint overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left"
        style={{ background: 'var(--bg-surface-sunken,#FDFBF6)' }}
        aria-expanded={open}
      >
        <span className="text-[13px] font-semibold text-ink">알림이 안 와요 · 설정 방법 안내</span>
        <span className={`text-text-tertiary text-[12px] transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="px-3.5 py-3.5 border-t border-line-faint">
          {/* 기기 선택 탭 */}
          <div className="flex gap-1.5 mb-3.5">
            <GuideTab active={tab === 'ios'} onClick={() => setTab('ios')}>아이폰 (iOS)</GuideTab>
            <GuideTab active={tab === 'android'} onClick={() => setTab('android')}>안드로이드 · PC</GuideTab>
          </div>

          {tab === 'ios' ? (
            <>
              <p className="text-[12px] text-text-secondary leading-relaxed mb-3">
                아이폰은 <b className="text-ink-soft">Safari로 열어 홈 화면에 추가한 뒤, 그 아이콘으로 실행</b>해야 알림을 켤 수 있습니다. (iOS 16.4 이상)
              </p>
              <Steps steps={[
                <>Safari로 <b className="text-ink-soft">festivalhub.co.kr</b> 접속 (크롬 앱은 안 됩니다)</>,
                <>로그인 후, 화면 하단 가운데 <b className="text-ink-soft">공유 버튼</b>(□에 ↑) 탭</>,
                <>메뉴에서 <b className="text-ink-soft">&ldquo;홈 화면에 추가&rdquo;</b> → 우측 상단 <b className="text-ink-soft">추가</b></>,
                <>홈 화면에 생긴 <b className="text-ink-soft">Festival Hub 아이콘</b>으로 실행 (Safari 탭 아님)</>,
                <>이 화면에서 <b className="text-ink-soft">&ldquo;이 기기로 알림 받기 → 켜기&rdquo;</b> → <b className="text-ink-soft">허용</b></>,
                <><b className="text-ink-soft">&ldquo;테스트 알림 보내기&rdquo;</b>로 확인</>,
              ]} />
              <Tip>iOS 16.4 미만이면 아이폰 웹 알림이 불가합니다. 이 경우 위의 <b>이메일</b> 수신을 켜 두시면 됩니다.</Tip>
            </>
          ) : (
            <>
              <p className="text-[12px] text-text-secondary leading-relaxed mb-3">
                안드로이드폰과 PC는 <b className="text-ink-soft">설치 없이 바로</b> 켤 수 있습니다.
              </p>
              <Steps steps={[
                <>Chrome · Edge · 삼성 인터넷 등으로 <b className="text-ink-soft">festivalhub.co.kr</b> 접속·로그인</>,
                <>이 화면에서 <b className="text-ink-soft">&ldquo;이 기기로 알림 받기 → 켜기&rdquo;</b> 탭</>,
                <>브라우저 알림 권한 <b className="text-ink-soft">&ldquo;허용&rdquo;</b></>,
                <><b className="text-ink-soft">&ldquo;테스트 알림 보내기&rdquo;</b>로 확인</>,
              ]} />
              <Tip>안드로이드는 브라우저 메뉴 → <b>&ldquo;홈 화면에 추가&rdquo;</b>로 앱처럼 설치하면 더 안정적으로 알림이 옵니다.</Tip>
            </>
          )}

          {/* 공통 문제 해결 */}
          <div className="mt-4 pt-3 border-t border-line-faint">
            <div className="text-[12px] font-bold text-ink mb-1.5">잘 안 될 때</div>
            <ul className="space-y-1.5 text-[12px] text-text-secondary leading-relaxed">
              <li>· <b className="text-ink-soft">&ldquo;켜기&rdquo;가 없고 &ldquo;쓸 수 없습니다&rdquo;</b> → 아이폰은 홈 화면에 추가한 아이콘으로 열었는지 확인하세요.</li>
              <li>· <b className="text-ink-soft">&ldquo;알림을 막아 두셨습니다&rdquo;</b> → 브라우저 주소창 옆 자물쇠 → 알림 &ldquo;허용&rdquo;, 그리고 휴대폰 <b>설정 → 알림</b>에서 해당 앱/브라우저 알림을 켜 주세요.</li>
              <li>· <b className="text-ink-soft">테스트는 됐는데 실제 알림이 안 와요</b> → 방해금지(집중) 모드가 켜져 있는지 확인하세요.</li>
              <li>· 기기마다 따로 켜야 합니다. 폰에서 켜도 PC는 PC에서 다시 켜 주세요.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function GuideTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[12px] font-semibold px-3 py-1.5 rounded-pill border transition-colors"
      style={active
        ? { borderColor: 'var(--brand,#E8A33D)', background: 'var(--brand-weak,#FFF6E6)', color: 'var(--ink,#14120E)' }
        : { borderColor: 'var(--line-faint,#E7E2D6)', background: 'transparent', color: 'var(--text-secondary,#6b6357)' }}
    >
      {children}
    </button>
  );
}

function Steps({ steps }: { steps: React.ReactNode[] }) {
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-2.5 items-start">
          <span
            className="shrink-0 w-[19px] h-[19px] rounded-full text-[11px] font-bold flex items-center justify-center mt-[1px]"
            style={{ background: 'var(--brand,#E8A33D)', color: '#fff' }}
          >{i + 1}</span>
          <span className="text-[12.5px] text-text-secondary leading-relaxed">{s}</span>
        </li>
      ))}
    </ol>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 text-[11.5px] text-text-tertiary leading-relaxed px-3 py-2 rounded-input" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)' }}>
      {children}
    </div>
  );
}
