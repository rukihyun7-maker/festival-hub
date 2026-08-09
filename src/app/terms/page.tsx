import Link from 'next/link';

export const metadata = { title: '이용약관 · Festival Hub' };

/**
 * 이용약관 (표준 초안)
 * ⚠️ 실제 서비스 개시 전 법률 전문가 검토 필요. 사업자 정보는 실제 값으로 교체.
 */
export default function TermsPage() {
  return (
    <main className="min-h-screen bg-page">
      <div className="container-app py-10 max-w-[820px]">
        <Link href="/signup" className="text-[12px] font-semibold text-text-tertiary hover:text-ink">← 돌아가기</Link>
        <h1 className="t-title mt-3 mb-1">이용약관</h1>
        <p className="t-sub mb-4">시행일: 2026-08-09</p>

        <div className="card space-y-5 text-[13.5px] leading-[1.75] text-text-secondary">
          <Section n="제1조 (목적)">
            본 약관은 Festival Hub(이하 &ldquo;서비스&rdquo;)가 제공하는 푸드트럭·음식부스 사업자(입점 파트너)와 행사 주최자 간 행사 매칭 및 관련 제반 서비스의 이용조건과 절차, 이용자와 서비스의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
          </Section>
          <Section n="제2조 (정의)">
            ① &ldquo;입점 파트너&rdquo;란 서비스에 가입하여 행사에 입점을 신청하는 푸드트럭·음식부스 등 사업자를 말합니다.<br />
            ② &ldquo;행사 주최&rdquo;란 서비스에 행사를 등록하고 입점 파트너를 모집·심사하는 개인·단체·기관을 말합니다.<br />
            ③ &ldquo;관리자&rdquo;란 서비스 운영자를 말합니다.<br />
            ④ &ldquo;행사&rdquo;란 주최가 등록하거나 공공데이터 등에서 수집되어 서비스에 게시된 행사 정보를 말합니다.
          </Section>
          <Section n="제3조 (약관의 효력 및 변경)">
            ① 본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.<br />
            ② 서비스는 관련 법령을 위반하지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 적용일자 및 사유를 명시하여 사전 공지합니다.
          </Section>
          <Section n="제4조 (회원가입 및 자격 심사)">
            ① 이용자는 본 약관에 동의하고 서비스가 정한 절차에 따라 가입 신청을 합니다.<br />
            ② 입점 파트너는 가입 시 <b>사업자등록증</b>을 제출하여야 하며, 서비스 이용(행사 신청 등)을 위해 필수 서류 등록 및 관리자 승인을 거쳐야 합니다.<br />
            ③ 행사 주최는 가입 시 소속·담당자·연락처 등 명함 정보를 제공하여야 하며, 등록한 행사는 관리자 검수 후 공개됩니다.<br />
            ④ 서비스는 허위 정보, 서류 위·변조, 타인 사칭 등이 확인된 경우 승인 거부·이용 정지·가입 취소할 수 있습니다.
          </Section>
          <Section n="제5조 (서비스의 내용)">
            ① 서비스는 행사 등록·검수, 입점 신청·심사, 매칭, 정산 안내, 인근 상권 정보 등을 제공합니다.<br />
            ② <b>정산은 행사 주최가 입점 파트너에게 직접 지급(개별 지급)</b>하는 것을 원칙으로 하며, 서비스는 매칭·중개 및 안내를 제공할 뿐 거래 당사자가 아닙니다.<br />
            ③ 서비스는 운영상·기술상 필요에 따라 제공 내용을 변경할 수 있습니다.
          </Section>
          <Section n="제6조 (이용자의 의무)">
            ① 이용자는 가입·이용 시 정확한 정보를 제공하여야 하며, 변경 시 지체 없이 갱신하여야 합니다.<br />
            ② 이용자는 제출 서류·정보의 진위에 책임을 지며, 법령·본 약관·공공질서에 위반되는 행위를 하여서는 안 됩니다.<br />
            ③ 이용자는 계정을 타인에게 양도·대여할 수 없습니다.
          </Section>
          <Section n="제7조 (게시물 및 콘텐츠)">
            ① 이용자가 등록한 정보·이미지 등의 권리와 책임은 등록한 이용자에게 있습니다.<br />
            ② 서비스는 서비스 제공·홍보 목적 범위 내에서 게시물을 사용할 수 있으며, 법령 위반·부적절 게시물은 사전 통지 없이 삭제·비공개할 수 있습니다.
          </Section>
          <Section n="제8조 (서비스의 중단)">
            서비스는 시스템 점검·교체, 통신 두절, 천재지변 등 불가피한 사유가 있는 경우 서비스 제공을 일시 중단할 수 있으며, 사전 또는 사후에 공지합니다.
          </Section>
          <Section n="제9조 (책임의 제한)">
            ① 서비스는 입점 파트너와 행사 주최 간 거래의 <b>중개자</b>이며, 행사의 실제 진행·정산·이행·품질에 대해서는 각 거래 당사자가 책임을 부담합니다.<br />
            ② 서비스는 천재지변, 이용자의 귀책, 제3자의 불법행위 등 서비스의 책임 없는 사유로 발생한 손해에 대하여 책임을 지지 않습니다.<br />
            ③ 서비스는 무료로 제공되는 정보(인근 상권·공공데이터 등)의 정확성을 보증하지 않으며 참고용으로 제공합니다.
          </Section>
          <Section n="제10조 (분쟁 해결 및 준거법)">
            ① 본 약관은 대한민국 법령에 따라 규율·해석됩니다.<br />
            ② 서비스 이용과 관련한 분쟁에 대해서는 관계 법령 및 상관례에 따르며, 소송이 필요한 경우 민사소송법상 관할 법원을 제1심 관할로 합니다.
          </Section>
          <Section n="부칙 · 사업자 정보">
            상호: 리윤하우스 (대표: 윤소연) · 사업자등록번호: 275-17-02275<br />
            주소: 인천광역시 연수구 센트럴로 313, 비동 25층<br />
            문의: leeyhome@naver.com · 본 약관 시행일: 2026-08-09
          </Section>
        </div>

        <div className="mt-6 text-center">
          <Link href="/privacy" className="text-[13px] font-semibold text-info hover:underline">개인정보 처리방침 보기 →</Link>
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
