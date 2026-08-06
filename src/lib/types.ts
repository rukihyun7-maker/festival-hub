/**
 * Festival Hub · DB 타입
 * supabase/schema.sql과 1:1 매핑
 */

export type Role = 'seller' | 'host' | 'admin';

export type EventStatus = 'open' | 'upcoming' | 'close' | 'canceled';
export type EventType = 'apply' | 'info'; // 파생: fee > 0 이거나 deadline 있으면 apply, 아니면 info

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'canceled';

export type MenuCategory = 'MAIN' | 'SIDE' | 'DRINK' | 'SET';

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
  share_flags: ShareFlags;      // v3: 주최사 공개 설정
  notif_prefs: NotifPrefs;      // v3: 알림 설정
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
  status: EventStatus;
  kind?: EventType;        // v3: 신청형(apply)/정보형(info) · DB 기본 apply
  source?: string | null;  // v3: 정보형 출처 (공공 API 등)
  created_at: string;
  updated_at: string;
}

export interface EventWithCounts extends EventRow {
  applications_count?: number;
  approved_count?: number;
}

export interface Application {
  id: string;
  event_id: string;
  seller_id: string;
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
  note: string | null;
  recorded_at: string;
}

export interface SaleWithEvent extends Sale {
  event?: EventRow;
}

// ============================================
// Documents (v2 스키마)
// ============================================

export type DocKind = 'business_reg' | 'food_hygiene' | 'insurance' | 'hygiene_edu' | 'vehicle_reg';

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
  vehicle_reg:  { label: '차량등록증 (푸드트럭)', desc: '푸드트럭 사업자만', requiresExpiry: true },
};

export const DOC_KINDS: DocKind[] = ['business_reg', 'food_hygiene', 'insurance', 'hygiene_edu', 'vehicle_reg'];

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

/** 주최사 -> 셀러 평가 */
export interface Rating {
  id: string;
  seller_id: string;
  host_id: string;
  event_id: string | null;
  hygiene: number;   // 위생 관리 1-5
  punctual: number;  // 시간 준수 1-5
  service: number;   // 고객 응대 1-5
  comment: string | null;
  created_at: string;
}
export interface RatingWithRelations extends Rating {
  host?: Pick<Profile, 'id' | 'name' | 'business_name'> | null;
  event?: Pick<EventRow, 'id' | 'name'> | null;
}
/** seller_rating_summary 뷰 */
export interface RatingSummary {
  seller_id: string;
  review_count: number;
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
  sales_amount: number; // 셀러 신고 매출
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
  updated_at: string;
}

// ============================================
// v4: 수기 참여이력 / QR 검증
// ============================================

/** 셀러 수기·외부 참여이력 (가입 시 과거 실적 직접 등록) */
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

/** 참가비 표시 */
export function feeLabel(fee: number, feeRate: number): string {
  if (fee === 0 && feeRate === 0) return '무료';
  if (fee === 0) return `매출 ${feeRate}%`;
  if (feeRate === 0) return `일 ${Math.round(fee / 10000)}만원`;
  return `일 ${Math.round(fee / 10000)}만원 + 매출 ${feeRate}%`;
}
