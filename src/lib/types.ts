/**
 * Festival Hub · DB 타입
 * supabase/schema.sql과 1:1 매핑
 */

export type Role = 'seller' | 'host' | 'admin';

/** v8: 입점 파트너 가입 심사 상태 */
export type SellerStatus = '정상' | '가입 심사' | '정지' | '반려';
/** v8: 행사 등록 요청 심사 상태 */
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export type EventStatus = 'open' | 'upcoming' | 'close' | 'canceled';
export type EventType = 'apply' | 'info'; // 파생: fee > 0 이거나 deadline 있으면 apply, 아니면 info

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'canceled';

export type MenuCategory = 'MAIN' | 'SIDE' | 'DRINK' | 'SET';

/** v24: 푸드트럭 현장 인프라 상세 (events.site_details jsonb) · 모든 항목 선택 */
export interface SiteDetails {
  power?: string;     // 부스당 전기 용량 (예: 부스당 3kW / 220V 15A)
  generator?: string; // 발전기 반입 (가능 / 불가 / 문의)
  water?: string;     // 급수 (가능 / 불가 / 문의)
  drainage?: string;  // 배수 (예: 가능 · 배수구 10m)
  lpg?: string;       // LPG · 화기 (가능 / 제한적 / 불가)
  vehicle?: string;   // 차량 진입 제원 (예: 길이 6m · 폭 2.2m · 높이 3.2m)
  booth?: string;     // 부스 사양 (예: 3x3m · 아스팔트 · 천막 포함)
  items?: string;     // 판매 품목 제한 (예: 주류 불가 · 중복업종 조정)
  weather?: string;   // 우천/폭염 · 취소 정책
}

/** v24: 현장 상세 표시용 메타(라벨·순서) */
export const SITE_DETAIL_META: { key: keyof SiteDetails; label: string }[] = [
  { key: 'power', label: '전기 용량' },
  { key: 'generator', label: '발전기 반입' },
  { key: 'water', label: '급수' },
  { key: 'drainage', label: '배수' },
  { key: 'lpg', label: 'LPG · 화기' },
  { key: 'vehicle', label: '차량 진입' },
  { key: 'booth', label: '부스 사양' },
  { key: 'items', label: '품목 제한' },
  { key: 'weather', label: '우천/취소' },
];

/** 저장용: 빈 값 제거 후 객체 반환(모두 비면 null) */
export function compactSiteDetails(s: SiteDetails | null | undefined): SiteDetails | null {
  if (!s) return null;
  const out: SiteDetails = {};
  for (const { key } of SITE_DETAIL_META) {
    const val = (s[key] ?? '').trim();
    if (val) out[key] = val;
  }
  return Object.keys(out).length ? out : null;
}

/** v24: 자리 적합도 체크 — 현장 상세(site_details) vs 파트너 등록 스펙 */
export interface FitInput {
  power?: string | null;   // profile.power (전기 사용량)
  vehicle?: string | null; // profile.vehicle (차량·부스 규격)
  cooking?: string | null; // profile.cooking (조리 설비)
}
export interface FitResult {
  rows: { label: string; site: string; mine: string }[];
  warnings: string[];
  hasMine: boolean; // 파트너가 스펙을 하나라도 등록했는지
}
/** 문자열에서 kW 수치 추출 (예: "부스당 3kW" → 3) */
function parseKw(s?: string | null): number | null {
  if (!s) return null;
  const m = s.match(/(\d+(?:\.\d+)?)\s*kw/i);
  return m ? parseFloat(m[1]) : null;
}
export function fitCheck(site: SiteDetails | null | undefined, mine: FitInput): FitResult {
  const rows: { label: string; site: string; mine: string }[] = [];
  const warnings: string[] = [];
  const hasMine = !!(mine.power || mine.vehicle || mine.cooking);

  if (site?.power || mine.power) rows.push({ label: '전기', site: site?.power ?? '자리 정보 없음', mine: mine.power ?? '미등록' });
  if (site?.generator) rows.push({ label: '발전기', site: site.generator, mine: '—' });
  if (site?.vehicle || mine.vehicle) rows.push({ label: '차량 진입', site: site?.vehicle ?? '자리 정보 없음', mine: mine.vehicle ?? '미등록' });
  if (site?.lpg || mine.cooking) rows.push({ label: 'LPG · 조리', site: site?.lpg ?? '자리 정보 없음', mine: mine.cooking ?? '미등록' });

  // 휴리스틱 경고
  const sk = parseKw(site?.power), mk = parseKw(mine.power);
  if (sk != null && mk != null && mk > sk) warnings.push(`전기 부족 우려 — 자리 ${sk}kW < 내 트럭 ${mk}kW. 발전기/증설을 확인하세요.`);
  if (site?.generator && /불가/.test(site.generator) && sk != null && mk != null && mk > sk) warnings.push('이 자리는 발전기 반입 불가입니다. 전원 부족 시 대안이 없습니다.');
  if (site?.lpg && /불가/.test(site.lpg) && mine.cooking && /(가스|lpg|화구|버너|튀김|화기)/i.test(mine.cooking)) warnings.push('LPG · 화기 사용 불가 자리입니다. 조리 설비를 확인하세요.');

  return { rows, warnings, hasMine };
}

/** 값이 채워진 현장 상세 항목만 추림 */
export function filledSiteDetails(s: SiteDetails | null | undefined): { label: string; value: string }[] {
  if (!s) return [];
  return SITE_DETAIL_META
    .map(({ key, label }) => ({ label, value: (s[key] ?? '').trim() }))
    .filter((r) => r.value.length > 0);
}

/** v3: 항목별 주최사 공개 설정 (없으면 기본 공개로 간주) */
export interface ShareFlags {
  sales_revenue?: boolean; // 매출 공개
  sales_count?: boolean;   // 판매건수 공개
  biz_no?: boolean;
  phone?: boolean;
  vehicle?: boolean;
  hygiene_gear?: boolean;
  [key: string]: boolean | undefined;
}

/** v3: 알림 설정 */
export interface NotifPrefs {
  days: 7 | 3 | 1;
  app: boolean;
  email: boolean;
  deadline: boolean;
  review: boolean;
  docs: boolean;
  new_event: boolean;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: Role;
  business_name: string | null;
  business_no: string | null;
  region: string | null;
  category: string | null;
  phone: string | null;
  intro: string | null;
  affiliation: string | null;   // v3: 소속 단체/협동조합
  hygiene_gear: string | null;  // v3: 마스크/모자 등 착용 운영
  position?: string | null;         // v17: 주최 담당자 직함/부서 (명함)
  business_card_url?: string | null; // v17: 주최 명함 이미지 경로 (선택)
  vehicle?: string | null;      // v10: 차량·부스 규격
  power?: string | null;        // v10: 전기 사용량
  cooking?: string | null;      // v10: 조리 설비
  crew?: string | null;         // v10: 운영 인원
  sns?: string | null;          // v10: SNS
  banner?: string | null;           // v37: 현수막 부착 가능·규격(가로/세로/높이)
  banner_photo_url?: string | null; // v37: 현수막 위치 사진 URL
  share_flags: ShareFlags;      // v3: 주최사 공개 설정
  notif_prefs: NotifPrefs;      // v3: 알림 설정
  status?: SellerStatus;        // v8: 가입 심사 상태 (없으면 '정상')
  referral_code?: string | null; // v35: 내 추천 코드 (승인 시 발급)
  points?: number;               // v35: 보유 포인트
  referred_by?: string | null;   // v35: 추천인 id
  created_at: string;
  updated_at: string;
}

export interface EventRow {
  id: string;
  owner_id: string;
  name: string;
  category: string;
  organizer: string;
  start_date: string;
  end_date: string;
  region: string;
  address: string;
  visitors: string | null;
  capacity: string | null;
  fee: number;
  fee_rate: number;
  deadline: string | null;
  electric: boolean;
  water: boolean;
  gas: boolean;
  parking: boolean;
  description: string | null;
  contact: string | null;
  phone: string | null;
  contact_public?: boolean; // v32: 문의자(담당자·연락처) 공개 여부 (false=승인 후 공개)
  status: EventStatus;
  kind?: EventType;        // v3: 신청형(apply)/정보형(info) · DB 기본 apply
  source?: string | null;  // v3: 정보형 출처 (공공 API 등)
  homepage?: string | null; // v29: 정보형 공식 홈페이지 URL (TourAPI)
  review_status?: ReviewStatus; // v8: 등록 요청 심사 (없으면 approved)
  admin_note?: string | null;   // v8: 반려 사유
  settlement_cycle?: string | null; // v12: 정산 주기 (등록값, 신청형만)
  payment_method?: string | null;   // v12: 결제 방식 (등록값, 신청형만)
  site_details?: SiteDetails | null; // v24: 푸드트럭 현장 인프라 상세 (jsonb)
  recruit_slots?: RecruitSlot[];     // v38: 부문별 모집 [{type,count}]
  required_docs?: EventRequiredDocs; // v39: 행사별 필수서류 {standard, extra}
  notice_url?: string | null;        // v40: 모집공고문 파일 URL
  notice_name?: string | null;       // v40: 모집공고문 원본 파일명
  operating_days?: string[];         // v41: 운영 요일(예: ['금','토','일']) · 비우면 매일
  delete_requested_at?: string | null; // v43: 주최의 삭제 요청 시각 (관리자 승인 후 실삭제)
  delete_reason?: string | null;       // v43: 삭제 요청 사유
  demand_score?: number | null;     // v14: 입지 수요점수 (반경 1km 인근시설 기반, 0~100)
  demand_tags?: string[] | null;    // v14: 입지 태그 (역세권·대학가·주거밀집·상업지)
  lat?: number | null;              // v5: 위도 (지오코딩)
  lng?: number | null;              // v5: 경도 (지오코딩)
  geocoded_at?: string | null;      // v5: 지오코딩 시각
  created_at: string;
  updated_at: string;
}

// v23: 개인(수기) 일정
export interface PersonalEvent {
  id: string;
  user_id: string;
  title: string;
  start_date: string;
  end_date: string;
  memo: string | null;
  created_at: string;
}

// v14: 인근 행사(축제)
export interface NearbyEvent {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  kind: EventType | null;
  distance_m: number;
}

/** 입지 수요점수 → 등급 라벨/톤 (v14) */
export function demandLevel(score: number | null | undefined): { label: string; tone: 'high' | 'mid' | 'low' } | null {
  if (score == null) return null;
  if (score >= 60) return { label: '상권 우수', tone: 'high' };
  if (score >= 30) return { label: '상권 양호', tone: 'mid' };
  return { label: '한적한 입지', tone: 'low' };
}

export interface EventWithCounts extends EventRow {
  applications_count?: number;
  approved_count?: number;
}

export interface RecruitSlot {
  type: string;
  count: number;
  fee?: number | null;      // v40: 부문별 참가비(없으면 행사 기본)
  electric?: boolean;       // v40: 부문별 시설
  water?: boolean;
  gas?: boolean;
  note?: string;            // v40: 부문별 조건 안내
}
export interface EventExtraDoc { label: string; desc?: string; }
export interface EventRequiredDocs { standard?: DocKind[]; extra?: EventExtraDoc[]; }
export interface ApplicationDocument {
  id: string;
  application_id: string;
  label: string;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
}

export interface Application {
  id: string;
  event_id: string;
  seller_id: string;
  slot_type?: string | null;    // v38: 신청 부문
  status: ApplicationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  memo: string | null;
  applied_at: string;
  qr_token: string | null;      // v4: 입점 승인 확인 QR 토큰 (승인 시 발급)
  qr_issued_at: string | null;  // v4
}

export interface ApplicationWithRelations extends Application {
  event?: EventRow;
  seller?: Profile;
}

export interface Menu {
  id: string;
  seller_id: string;
  name: string;
  price: number;
  cost: number;
  category: MenuCategory;
  description?: string | null; // v3
  signature?: boolean;         // v3: 대표 메뉴
  image_url?: string | null;   // v3: 사진 (Storage 경로)
  created_at: string;
}

export interface Sale {
  id: string;
  seller_id: string;
  event_id: string;
  application_id: string | null;
  orders: number;
  revenue: number;
  cost?: number | null;   // v13: 비용(재료·인건·기타 합계, 선택) → 순익=revenue-cost
  note: string | null;
  recorded_at: string;
}

export interface SaleWithEvent extends Sale {
  event?: EventRow;
}

// ============================================
// Documents (v2 스키마)
// ============================================

export type DocKind = 'business_reg' | 'food_hygiene' | 'insurance' | 'hygiene_edu' | 'booth_exterior' | 'booth_interior' | 'booth_storage';

export type DocStatus = 'pending' | 'verified' | 'rejected' | 'expired';
export type DocUrgency = 'verified' | 'pending' | 'rejected' | 'expiring' | 'expired' | 'missing';

export interface DocumentRow {
  id: string;
  seller_id: string;
  kind: DocKind;
  file_url: string | null;
  file_name: string | null;
  status: DocStatus;
  expires_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  memo: string | null;
  uploaded_at: string;
  updated_at: string;
}

export interface DocumentSlot {
  kind: DocKind;
  label: string;
  desc: string;
  requiresExpiry: boolean; // 만료일 필수 여부
  doc: DocumentRow | null; // 실제 등록된 문서 (없으면 미등록)
  urgency: DocUrgency;
}

export const DOC_META: Record<DocKind, { label: string; desc: string; requiresExpiry: boolean }> = {
  business_reg: { label: '사업자등록증', desc: '세무서 발급 · 만료 없음', requiresExpiry: false },
  food_hygiene: { label: '식품위생업 신고증', desc: '보건소 발급 · 만료 없음', requiresExpiry: false },
  insurance:    { label: '영업배상책임보험', desc: '보험사 증권 · 만료일 필수', requiresExpiry: true },
  hygiene_edu:  { label: '위생교육 이수증', desc: '연 1회 갱신 · 만료일 필수', requiresExpiry: true },
  booth_exterior: { label: '부스·트럭 외부 사진', desc: '전체 외관 1컷 · 관리자·주최 확인용', requiresExpiry: false },
  booth_interior: { label: '부스·트럭 내부 사진', desc: '조리 공간 1컷', requiresExpiry: false },
  booth_storage:  { label: '재료 보관 공간 사진', desc: '식자재 보관 상태 1컷', requiresExpiry: false },
};

export const DOC_KINDS: DocKind[] = ['business_reg', 'food_hygiene', 'insurance', 'hygiene_edu', 'booth_exterior', 'booth_interior', 'booth_storage'];

// ============================================
// 신청 자격 기준 (80% 대체) · 명시적 필수 항목
//  · 매장정보 필수(선택: 운영인원·SNS·매장소개)
//  · 필수 서류 6종(영업배상책임보험은 선택)
//  · 판매 메뉴 1개 이상
// ============================================
// 소속(affiliation)·운영인원(crew)·SNS(sns)·매장소개(intro)는 선택 항목
export const REQUIRED_STORE_FIELDS: { key: keyof Profile; label: string }[] = [
  { key: 'business_name', label: '상호' },
  { key: 'name', label: '대표자' },
  { key: 'region', label: '활동 지역' },
  { key: 'business_no', label: '사업자등록번호' },
  { key: 'phone', label: '연락처' },
  { key: 'vehicle', label: '차량·부스 규격' },
  { key: 'power', label: '전기 사용량' },
  { key: 'cooking', label: '조리 설비' },
  { key: 'hygiene_gear', label: '위생 관리' },
];
/** 신청에 필수인 서류 6종 (insurance=영업배상책임보험은 선택) */
export const REQUIRED_DOC_KINDS: DocKind[] = ['business_reg', 'food_hygiene', 'hygiene_edu', 'booth_exterior', 'booth_interior', 'booth_storage'];

export interface ApplyChecklist {
  storeMissing: string[]; // 미입력 필수 매장정보
  docsMissing: string[];  // 미제출 필수 서류
  menuOk: boolean;        // 판매 메뉴 1개 이상
  storeOk: boolean;
  docsOk: boolean;
  ready: boolean;         // 3영역 모두 충족 → 신청 가능
}

/** 필수 서류 6종이 모두 관리자 검증(만료 안 됨) 완료됐는지 · 신청형 열람 자격 */
export function requiredDocsVerified(docSlots: DocumentSlot[]): boolean {
  return REQUIRED_DOC_KINDS.every((k) => {
    const u = docSlots.find((s) => s.kind === k)?.urgency;
    return u === 'verified' || u === 'expiring';
  });
}

/** 신청 자격 체크리스트 계산 (서류는 관리자 '검증 완료'(verified) 기준) */
export function applyChecklist(
  profile: Profile | null,
  docSlots: DocumentSlot[],
  menuCount: number,
): ApplyChecklist {
  const storeMissing = REQUIRED_STORE_FIELDS
    .filter(({ key }) => !String(profile?.[key] ?? '').trim())
    .map((f) => f.label);
  const docsMissing = REQUIRED_DOC_KINDS
    .filter((k) => {
      const u = docSlots.find((s) => s.kind === k)?.urgency;
      return !(u === 'verified' || u === 'expiring'); // 검증 완료(만료임박 포함)만 충족
    })
    .map((k) => DOC_META[k].label);
  const menuOk = menuCount >= 1;
  const storeOk = storeMissing.length === 0;
  const docsOk = docsMissing.length === 0;
  return { storeMissing, docsMissing, menuOk, storeOk, docsOk, ready: storeOk && docsOk && menuOk };
}

/** 문서 상태에서 UI urgency 계산 (view가 없을 때 클라측 폴백) */
export function computeUrgency(doc: DocumentRow | null): DocUrgency {
  if (!doc) return 'missing';
  if (doc.status === 'rejected') return 'rejected';
  if (doc.status === 'pending') return 'pending';
  if (doc.expires_at) {
    const days = Math.ceil((new Date(doc.expires_at).getTime() - Date.now()) / 86400000);
    if (days < 0) return 'expired';
    if (days < 14) return 'expiring';
  }
  if (doc.status === 'verified') return 'verified';
  return 'pending';
}

export interface Simulation {
  id: string;
  seller_id: string;
  event_id: string | null;
  event_name: string | null;
  input: SimulationInput;
  result: SimulationResult;
  saved_at: string;
}

export interface SimulationInput {
  days: number;
  avg_order: number;
  orders_per_day: number;
  material_rate: number;
  fixed_fee: number;
  sales_fee_rate: number;
  other_cost: number;
}

export interface SimulationResult {
  low: ScenarioResult;
  base: ScenarioResult;
  high: ScenarioResult;
}

export interface ScenarioResult {
  revenue: number;
  profit: number;
  margin: number;
}

// ============================================
// v3: 평가 / 알림 / 정산 / 플랫폼 정책
// ============================================

/** 주최사 -> 입점 파트너 평가 */
/** v33 평가 태그 · 재섭외 */
export const PRAISE_TAGS = ['위생 우수', '준비/철수 신속', '시간 준수', '매출 기여', '현장 매너', '메뉴 퀄리티'] as const;
export const IMPROVE_TAGS = ['준비 지연', '위생 미흡', '소통 아쉬움', '설명과 다른 운영', '정리 미흡', '시간 미준수'] as const;
export type Rehire = 'recommend' | 'ok' | 'no';
export const REHIRE_OPTIONS: { key: Rehire; label: string }[] = [
  { key: 'recommend', label: '다시 부르고 싶어요' },
  { key: 'ok', label: '보통' },
  { key: 'no', label: '아쉬워요' },
];
export const REHIRE_LABEL: Record<Rehire, string> = { recommend: '다시 부르고 싶어요', ok: '보통', no: '아쉬워요' };

export interface Rating {
  id: string;
  seller_id: string;
  host_id: string;
  event_id: string | null;
  hygiene?: number | null;   // (구) 위생 1-5 · 레거시
  punctual?: number | null;  // (구) 시간 준수 · 레거시
  service?: number | null;   // (구) 고객 응대 · 레거시
  praise_tags?: string[];    // v33 칭찬(공개)
  improve_tags?: string[];   // v33 개선점(비공개·본인만)
  rehire?: Rehire | null;    // v33 재섭외 의향
  reveal_at?: string | null; // v33 공개예정(행사종료+14일)
  comment: string | null;
  created_at: string;
}
export interface RatingWithRelations extends Rating {
  host?: Pick<Profile, 'id' | 'name' | 'business_name'> | null;
  seller?: Pick<Profile, 'id' | 'name' | 'business_name'> | null;
  event?: Pick<EventRow, 'id' | 'name'> | null;
}
/** partner_reviews_public 뷰 (닉네임·공개후기) */
export interface PartnerReviewPublic {
  id: string;
  seller_id: string;
  praise_tags: string[] | null;
  rehire: Rehire | null;
  comment: string | null;
  created_at: string;
  reveal_at: string | null;
  reviewer_nick: string;
}
/** my_received_reviews 뷰 (파트너 본인 · 개선점 포함) */
export interface MyReceivedReview extends PartnerReviewPublic {
  improve_tags: string[] | null;
}
/** seller_rating_summary 뷰 */
export interface RatingSummary {
  seller_id: string;
  review_count: number;
  recommend_count?: number;
  avg_score: number;
}

/** 알림 */
export type NotifKind = 'deadline' | 'review' | 'docs' | 'new_event' | 'settlement';
export interface Notification {
  id: string;
  user_id: string;
  kind: NotifKind;
  title: string;
  body: string | null;
  event_id: string | null;
  read: boolean;
  created_at: string;
}

/** 개별 지급 정산 (PG 없이 운영형) */
export type SettlementStatus = 'pending' | 'paid';
export interface Settlement {
  id: string;
  host_id: string;
  seller_id: string;
  event_id: string;
  sales_id: string | null;
  sales_amount: number; // 입점 파트너 신고 매출
  payout: number;       // 주최사 지급 예정액
  status: SettlementStatus;
  paid_at: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
}
export interface SettlementWithRelations extends Settlement {
  seller?: Pick<Profile, 'id' | 'name' | 'business_name'> | null;
  event?: Pick<EventRow, 'id' | 'name'> | null;
}

/** 플랫폼 평점 정책 (싱글턴 1행) */
export type PublicScope = '전체 공개' | '행사 주최에게만' | '비공개';
export interface PlatformSettings {
  id: number;
  host_rating: boolean;
  seller_visible: boolean;
  show_comments: boolean;
  appeal: boolean;
  public_scope: PublicScope;
  min_reviews: number;
  // v18: 운영 정책 (가입·검수·정산)
  seller_auto_approve?: boolean;    // 입점 파트너 자동 승인 (off=수동 심사)
  required_docs_count?: number;     // 승인 필수 서류 수
  platform_fee_pct?: number;        // 플랫폼 기본 수수료(%)
  default_settlement?: string | null; // 기본 정산 주기 안내
  host_doc_download?: boolean;      // v19: 주최사 신청자 서류 다운로드 허용
  landing_partners?: number;        // v28: 로그인 노출 — 입점 파트너 수(관리자 수기)
  landing_events?: number;          // v28: 로그인 노출 — 등록 행사 수(관리자 수기)
  landing_recruiting?: number;      // v28: 로그인 노출 — 모집 중 수(관리자 수기)
  event_categories?: string[];      // v42: 행사 카테고리(관리자 편집 · 순서·내용)
  updated_at: string;
}

// ============================================
// v4: 수기 참여이력 / QR 검증
// ============================================

/** 입점 파트너 수기·외부 참여이력 (가입 시 과거 실적 직접 등록) */
export interface SellerHistory {
  id: string;
  seller_id: string;
  event_name: string;
  event_date: string | null;
  region: string | null;
  orders: number | null;
  revenue: number | null;
  note: string | null;
  self_reported: boolean; // 직접 등록(외부 실적) 여부
  created_at: string;
}

/** QR 검증 RPC(verify_qr) 반환형 · 현장 스캔 입점 확인 */
export interface VerifyQrResult {
  seller_name: string;
  business_name: string | null;
  event_name: string;
  event_start: string;
  event_end: string;
  status: string;
  approved_at: string | null;
}

// ============================================
// v5: 인근지역 정보 (local_info)
// ============================================

export type LocalInfoCategory = 'apartment' | 'university' | 'festival' | 'commercial' | 'transit';

export interface LocalInfo {
  id: string;
  category: LocalInfoCategory;
  external_id: string | null;
  name: string;
  region: string;
  address: string | null;
  lat: number;
  lng: number;
  data: Record<string, unknown>;
  source: 'molit' | 'seoul' | 'academyinfo' | 'manual' | 'crawler';
  synced_at: string;
  updated_at: string;
}

export interface NearbyRow {
  id: string;
  category: LocalInfoCategory;
  name: string;
  distance_m: number;
  data: Record<string, unknown>;
}

export interface ApartmentData {
  households: number;
  buildings?: number;
  type?: string;
  approval_date?: string;
}

export interface UniversityData {
  enrolled: number;
  capacity?: number;
  campus?: string;
  type?: string;
}

export interface FestivalData {
  university_id?: string;
  start_date: string;
  end_date: string;
  lineup?: string[];
  external_entry?: boolean;
}

// ============================================
// v6: 찜 / 축제 API·카테고리 (관리자 운영)
// ============================================

/** 찜한 행사 (입점 파트너) · notify=마감 알림 on/off */
export interface Favorite {
  id: string;
  seller_id: string;
  event_id: string;
  notify: boolean;
  created_at: string;
}
export interface FavoriteWithEvent extends Favorite {
  event?: EventRow;
}

/** 공공 API 소스 (관리자 연동) */
export interface ApiSource {
  id: string;
  name: string;      // 한국관광공사 TourAPI 등
  code: string;      // tourapi | localgov | seoul
  enabled: boolean;
  cycle: string;     // 수집 주기 표시용 (예: "일 1회")
  last_sync: string | null;
  count: number;     // 누적 수집 건수
  created_at: string;
  updated_at: string;
}

/** 카테고리 운영 규칙 (관리자) */
export interface CategoryRule {
  id: string;
  name: string;        // 플리마켓 | 지역축제 ...
  keywords: string[];  // 원천 분류 매핑 키워드
  visible: boolean;    // 입점 파트너 노출 여부
  count: number;       // 매핑된 행사 수
  created_at: string;
}

// ============================================
// 파생 유틸
// ============================================

/** 행사 유형(신청형/정보형) 판별 */
export function eventType(e: Pick<EventRow, 'fee' | 'deadline' | 'status'>): EventType {
  if (e.status === 'upcoming' || !e.deadline || e.fee === 0) return 'info';
  return 'apply';
}

/** D-day 계산 */
export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

/** D-day 라벨 */
export function deadlineLabel(dateStr: string | null): string {
  const d = daysUntil(dateStr);
  if (d === null) return '사전 알림';
  if (d < 0) return '마감';
  if (d === 0) return 'D-day';
  return `D-${d}`;
}

/** 일정 표시 */
export function periodLabel(start: string, end: string): string {
  const s = start.replace(/-/g, '.');
  const e = end.replace(/-/g, '.').slice(5); // MM.DD만
  return start === end ? s : `${s} - ${e}`;
}

/** 금액 축약: 1만 이상은 '만' 단위(₩234만), 미만은 전체(₩8,000) · 스캔용 */
export function wonCompact(v: number): string {
  if (!v) return '₩0';
  if (v >= 10000) {
    const man = v / 10000;
    return `₩${(Number.isInteger(man) ? man : Math.round(man)).toLocaleString()}만`;
  }
  return `₩${v.toLocaleString()}`;
}

/** 참가비 표시 */
export function feeLabel(fee: number, feeRate: number): string {
  if (fee === 0 && feeRate === 0) return '무료';
  if (fee === 0) return `매출 ${feeRate}%`;
  if (feeRate === 0) return `일 ${Math.round(fee / 10000)}만원`;
  return `일 ${Math.round(fee / 10000)}만원 + 매출 ${feeRate}%`;
}
