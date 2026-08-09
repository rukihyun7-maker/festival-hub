import Link from 'next/link';

export const metadata = { title: '개인정보 처리방침 · Festival Hub' };

/**
 * 개인정보 처리방침 (표준 초안)
 * ⚠️ 실제 서비스 개시 전 법률 전문가 검토 필요. 위탁·국외이전·보유기간은 실제 운영에 맞게 확정.
 */
export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-page">
      <div className="container-app py-10 max-w-[820px]">
        <Link href="/signup" className="text-[12px] font-semibold text-text-tertiary hover:text-ink">← 돌아가기</Link>
        <h1 className="t-title mt-3 mb-1">개인정보 처리방침</h1>
        <p className="t-sub mb-4">시행일: 2026-08-09</p>

        <div className="card space-y-5 text-[13.5px] leading-[1.75] text-text-secondary">
          <p>Festival Hub(이하 &ldquo;서비스&rdquo;)는 「개인정보 보호법」 등 관계 법령을 준수하며, 이용자의 개인정보를 보호하기 위해 다음과 같이 개인정보 처리방침을 수립·공개합니다.</p>

          <Section n="1. 수집하는 개인정보 항목">
            <b>회원가입·인증:</b> 이메일, 이름(담당자명), 비밀번호(암호화 저장)<br />
            <b>입점 파트너:</b> 연락처, 사업자등록번호, 사업자등록증·영업신고증·보건증 등 서류 이미지, 부스/트럭 사진, 매장·메뉴 정보, 행사 참여·매출 기록<br />
            <b>행사 주최:</b> 소속(기관·단체명), 담당자 직함·연락처, 명함 정보(선택 시 명함 이미지)<br />
            <b>행사 등록:</b> 행사 주소 및 이를 기반으로 변환된 좌표<br />
            <b>자동 수집:</b> 접속 로그, 쿠키/세션(로그인 유지), 기기·브라우저 정보
          </Section>
          <Section n="2. 개인정보의 수집·이용 목적">
            ① 회원 식별 및 관리, 로그인 유지<br />
            ② 자격 심사(입점 파트너 서류 검증, 행사 주최 신원 확인) 및 행사 매칭·신청 처리<br />
            ③ 정산 안내, 고객 문의 응대, 공지 전달<br />
            ④ 서비스 이용 통계·품질 개선, 부정 이용 방지
          </Section>
          <Section n="3. 보유 및 이용 기간">
            ① 원칙적으로 <b>회원 탈퇴 시 지체 없이 파기</b>합니다.<br />
            ② 다만 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다. (예: 전자상거래 등에서의 소비자보호에 관한 법률에 따른 계약·거래 기록 등)<br />
            ③ 부정 이용 방지를 위해 필요한 최소한의 정보를 일정 기간 보관할 수 있습니다.
          </Section>
          <Section n="4. 개인정보의 제3자 제공">
            ① 서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.<br />
            ② 다만 <b>입점 파트너가 특정 행사에 신청하는 경우</b>, 심사 목적에 한하여 해당 <b>행사 주최</b>에게 파트너의 심사 관련 정보(매장·메뉴 정보, 서류 제출 상태, 부스 사진, 참여 이력 등)가 제공됩니다. 이는 신청 행위로써 동의한 것으로 봅니다.<br />
            ③ 법령에 근거가 있거나 수사기관의 적법한 요청이 있는 경우 제공할 수 있습니다.
          </Section>
          <Section n="5. 개인정보 처리의 위탁 및 국외 이전">
            서비스는 원활한 운영을 위해 아래와 같이 개인정보 처리를 위탁하며, 일부는 국외에 저장·처리될 수 있습니다.<br />
            · <b>Supabase</b> (데이터베이스·인증·파일 저장) — 국외<br />
            · <b>Vercel</b> (웹 호스팅) — 국외<br />
            · <b>Resend</b> (이메일 발송) — 국외<br />
            · <b>Kakao</b> (주소→좌표 변환) — 국내<br />
            이용자는 국외 이전을 거부할 수 있으나, 이 경우 서비스 이용이 제한될 수 있습니다.
          </Section>
          <Section n="6. 이용자의 권리와 행사 방법">
            이용자는 언제든지 자신의 개인정보에 대한 <b>열람·정정·삭제·처리정지</b>를 요구할 수 있으며, 회원 탈퇴를 통해 개인정보 삭제를 요청할 수 있습니다. 요청은 아래 연락처로 접수합니다.
          </Section>
          <Section n="7. 개인정보의 파기">
            보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다. 전자적 파일은 복구 불가능한 방법으로, 출력물은 분쇄·소각합니다.
          </Section>
          <Section n="8. 개인정보의 안전성 확보 조치">
            비밀번호 암호화, 접근 권한 관리(RLS), 전송 구간 암호화(HTTPS), 서류·이미지 접근 제한(권한 기반 열람) 등 기술적·관리적 보호 조치를 시행합니다.
          </Section>
          <Section n="9. 개인정보 보호책임자">
            상호: 리윤하우스 · 성명: 윤소연 · 연락처: leeyhome@naver.com<br />
            개인정보 관련 문의·불만·피해 구제는 위 연락처로 접수하며, 개인정보분쟁조정위원회(kopico.go.kr) 등에 조정을 신청할 수 있습니다.
          </Section>
          <Section n="10. 고지의 의무">
            본 방침의 내용 추가·삭제·수정이 있을 경우 시행 전 서비스 화면을 통해 공지합니다. 시행일: 2026-08-09
          </Section>
        </div>

        <div className="mt-6 text-center">
          <Link href="/terms" className="text-[13px] font-semibold text-info hover:underline">이용약관 보기 →</Link>
        </div>
      </div>
    </main>
  );
}

function Section({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[14px] font-extrabold text-ink mb-1.5">{n}</h2>
      <div>{children}</div>
    </section>
  );
}
