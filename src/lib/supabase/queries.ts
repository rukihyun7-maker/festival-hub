/**
 * Festival Hub · Supabase 조회 헬퍼
 * 브라우저 클라이언트 기반 · client component에서 사용
 * server component가 필요할 땐 별도 queries.server.ts로 확장
 */

import { createClient } from './client';
import type {
  EventRow,
  Application,
  ApplicationWithRelations,
  Menu,
  Sale,
  Profile,
  SaleWithEvent,
  DocumentRow,
  DocumentSlot,
  DocKind,
  Rating,
  RatingWithRelations,
  RatingSummary,
  Notification,
  NotifKind,
  Settlement,
  SettlementWithRelations,
  PlatformSettings,
  SellerHistory,
  VerifyQrResult,
  LocalInfo,
  NearbyRow,
} from '../types';
import { DOC_KINDS, DOC_META, computeUrgency } from '../types';

// ============================================
// Events
// ============================================

/** 공개 행사 목록 (open + upcoming) */
export async function fetchEvents(opts?: {
  region?: string;
  type?: 'all' | 'apply' | 'info';
  q?: string;
  sort?: 'deadline' | 'recent' | 'fee';
}): Promise<EventRow[]> {
  const supabase = createClient();
  let query = supabase
    .from('events')
    .select('*')
    .in('status', ['open', 'upcoming']);

  if (opts?.region && opts.region !== '전체') {
    query = query.eq('region', opts.region);
  }
  if (opts?.q?.trim()) {
    query = query.ilike('name', `%${opts.q.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  let list = (data ?? []) as EventRow[];

  if (opts?.type === 'apply') list = list.filter((e) => e.fee > 0 || (e.deadline && e.status === 'open'));
  if (opts?.type === 'info') list = list.filter((e) => e.fee === 0 && (!e.deadline || e.status === 'upcoming'));

  if (opts?.sort === 'deadline') {
    list.sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });
  } else if (opts?.sort === 'fee') {
    list.sort((a, b) => a.fee - b.fee);
  } else {
    list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  return list;
}

/** 마감 임박 N건 (홈 위젯용) */
export async function fetchDeadlineSoon(limit = 4): Promise<EventRow[]> {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'open')
    .gte('deadline', today)
    .order('deadline', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

/** 행사 상세 */
export async function fetchEventById(id: string): Promise<EventRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as EventRow) ?? null;
}

/** 행사 생성 (호스트) · kind/source는 DB 기본값(apply/null) 허용 */
export async function createEvent(
  input: Omit<EventRow, 'id' | 'created_at' | 'updated_at' | 'kind' | 'source'> &
    Partial<Pick<EventRow, 'kind' | 'source'>>
): Promise<EventRow> {
  const supabase = createClient();
  const { data, error } = await supabase.from('events').insert(input).select().single();
  if (error) throw error;
  return data as EventRow;
}

/** 호스트 소유 행사 */
export async function fetchMyHostEvents(ownerId: string): Promise<EventRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('owner_id', ownerId)
    .order('start_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

// ============================================
// Applications
// ============================================

/** 내 신청 목록 (셀러 마이페이지·홈) */
export async function fetchMyApplications(sellerId: string): Promise<ApplicationWithRelations[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('applications')
    .select('*, event:events(*)')
    .eq('seller_id', sellerId)
    .order('applied_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ApplicationWithRelations[];
}

/** 행사에 대한 신청 목록 (호스트 대시보드) */
export async function fetchApplicationsForEvent(eventId: string): Promise<ApplicationWithRelations[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('applications')
    .select('*, seller:profiles!applications_seller_id_fkey(*)')
    .eq('event_id', eventId)
    .order('applied_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ApplicationWithRelations[];
}

/** 신청 생성 */
export async function createApplication(eventId: string, sellerId: string): Promise<Application> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('applications')
    .insert({ event_id: eventId, seller_id: sellerId, status: 'pending' })
    .select()
    .single();
  if (error) throw error;
  return data as Application;
}

/** 신청 상태 변경 (호스트 승인/거절) */
export async function updateApplicationStatus(
  applicationId: string,
  status: 'approved' | 'rejected',
  reviewerId: string,
  memo?: string
): Promise<Application> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('applications')
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      memo: memo ?? null,
    })
    .eq('id', applicationId)
    .select()
    .single();
  if (error) throw error;
  return data as Application;
}

// ============================================
// Menus
// ============================================

export async function fetchMyMenus(sellerId: string): Promise<Menu[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('menus')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Menu[];
}

export async function createMenu(
  input: Omit<Menu, 'id' | 'created_at' | 'description' | 'signature' | 'image_url'> &
    Partial<Pick<Menu, 'description' | 'signature' | 'image_url'>>
): Promise<Menu> {
  const supabase = createClient();
  const { data, error } = await supabase.from('menus').insert(input).select().single();
  if (error) throw error;
  return data as Menu;
}

export async function deleteMenu(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('menus').delete().eq('id', id);
  if (error) throw error;
}

// ============================================
// Sales
// ============================================

export async function fetchMySales(sellerId: string): Promise<SaleWithEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sales')
    .select('*, event:events(*)')
    .eq('seller_id', sellerId)
    .order('recorded_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SaleWithEvent[];
}

// ============================================
// Profile
// ============================================

export async function fetchMyProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

/** 프로필 편집 · 본인만 (RLS 자동 방어) */
export async function updateProfile(id: string, patch: Partial<Omit<Profile, 'id' | 'email' | 'created_at' | 'updated_at'>>): Promise<Profile> {
  const supabase = createClient();
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Profile;
}

/** 프로필 완성도 (필수 필드 채워짐 %) · 배너 노출 판단용 */
export function profileCompleteness(profile: Profile | null): { pct: number; missing: string[] } {
  if (!profile) return { pct: 0, missing: [] };
  const required = profile.role === 'seller'
    ? [
        { key: 'business_name', label: '소속 (사업자명)' },
        { key: 'region', label: '활동 지역' },
        { key: 'category', label: '판매 카테고리' },
        { key: 'phone', label: '연락처' },
        { key: 'intro', label: '소개글' },
      ]
    : profile.role === 'host'
    ? [
        { key: 'business_name', label: '주최 단체명' },
        { key: 'region', label: '활동 지역' },
        { key: 'phone', label: '연락처' },
      ]
    : []; // admin은 프로필 필수 요건 없음
  const missing: string[] = [];
  required.forEach((f) => {
    const val = (profile as unknown as Record<string, unknown>)[f.key];
    if (!val || (typeof val === 'string' && !val.trim())) missing.push(f.label);
  });
  const filled = required.length - missing.length;
  const pct = required.length === 0 ? 100 : Math.round((filled / required.length) * 100);
  return { pct, missing };
}

// ============================================
// Simulations
// ============================================

// ============================================
// Documents (v2)
// ============================================

/** 내 서류 5종 슬롯 (없으면 null) · 셀러 마이페이지·홈·상세용 공통 */
export async function fetchMyDocumentSlots(sellerId: string): Promise<DocumentSlot[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('documents').select('*').eq('seller_id', sellerId);
  if (error) throw error;
  const rows = (data ?? []) as DocumentRow[];

  return DOC_KINDS.map((kind) => {
    const meta = DOC_META[kind];
    const doc = rows.find((r) => r.kind === kind) ?? null;
    return {
      kind,
      label: meta.label,
      desc: meta.desc,
      requiresExpiry: meta.requiresExpiry,
      doc,
      urgency: computeUrgency(doc),
    };
  });
}

/** 문서 등록/갱신 · Storage 미연동 단계는 file_url null 허용 */
export async function upsertDocument(input: {
  seller_id: string;
  kind: DocKind;
  file_name?: string | null;
  file_url?: string | null;
  expires_at?: string | null;
  memo?: string | null;
}): Promise<DocumentRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('documents')
    .upsert(
      {
        seller_id: input.seller_id,
        kind: input.kind,
        file_name: input.file_name ?? null,
        file_url: input.file_url ?? null,
        expires_at: input.expires_at ?? null,
        memo: input.memo ?? null,
        status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
      },
      { onConflict: 'seller_id,kind' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as DocumentRow;
}

export async function deleteDocument(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
}

/** 완료 개수 (verified만 카운트, expiring도 통과) */
export function countVerified(slots: DocumentSlot[]): number {
  return slots.filter((s) => s.urgency === 'verified' || s.urgency === 'expiring').length;
}

/**
 * 실제 파일 업로드 · Supabase Storage 'documents' 버킷 사용
 * 경로: {sellerId}/{kind}/{timestamp}_{sanitizedName}
 * @returns storage path (file_url 컬럼에 저장)
 */
export async function uploadDocumentFile(sellerId: string, kind: DocKind, file: File): Promise<string> {
  const supabase = createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._가-힣-]/g, '_');
  const path = `${sellerId}/${kind}/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage.from('documents').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/** 파일 삭제 (문서 삭제 전 호출) */
export async function removeDocumentFile(path: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from('documents').remove([path]);
  if (error) throw error;
}

/** 서명된 URL 발급 (1시간 유효) · 파일 열람용 */
export async function getSignedDocumentUrl(path: string, expiresInSec = 3600): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

// ============================================
// Admin · 서류 검증
// ============================================

export interface DocumentWithSeller extends DocumentRow {
  seller: Pick<Profile, 'id' | 'name' | 'business_name' | 'email' | 'phone'> | null;
}

export async function fetchAllDocumentsAdmin(opts?: {
  status?: 'all' | 'pending' | 'verified' | 'rejected' | 'expired';
  kind?: DocKind | 'all';
  q?: string;
}): Promise<DocumentWithSeller[]> {
  const supabase = createClient();
  let query = supabase
    .from('documents')
    .select('*, seller:profiles!documents_seller_id_fkey(id, name, business_name, email, phone)')
    .order('uploaded_at', { ascending: false });
  if (opts?.status && opts.status !== 'all') query = query.eq('status', opts.status);
  if (opts?.kind && opts.kind !== 'all') query = query.eq('kind', opts.kind);

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data ?? []) as unknown as DocumentWithSeller[];
  if (opts?.q?.trim()) {
    const q = opts.q.trim().toLowerCase();
    rows = rows.filter((r) =>
      r.seller?.name.toLowerCase().includes(q) ||
      r.seller?.business_name?.toLowerCase().includes(q) ||
      r.file_name?.toLowerCase().includes(q)
    );
  }
  return rows;
}

/** 서류 승인/반려 · admin 전용 */
export async function reviewDocument(
  documentId: string,
  status: 'verified' | 'rejected',
  reviewerId: string,
  memo?: string
): Promise<DocumentRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('documents')
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      memo: memo ?? null,
    })
    .eq('id', documentId)
    .select()
    .single();
  if (error) throw error;
  return data as DocumentRow;
}

// ============================================
// Event · 수정 (Host 소유 행사 전체 필드)
// ============================================

export async function updateEvent(id: string, patch: Partial<Omit<EventRow, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>): Promise<EventRow> {
  const supabase = createClient();
  const { data, error } = await supabase.from('events').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as EventRow;
}

export async function saveSimulation(
  sellerId: string,
  eventName: string | null,
  eventId: string | null,
  input: object,
  result: object
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('simulations').insert({
    seller_id: sellerId,
    event_id: eventId,
    event_name: eventName,
    input,
    result,
  });
  if (error) throw error;
}

// ============================================
// Admin 인사이트 (admin role 전용)
// ============================================

export interface AdminOverview {
  users: { total: number; seller: number; host: number; admin: number; newLast7d: number };
  events: { total: number; open: number; upcoming: number; close: number };
  applications: { total: number; pending: number; approved: number; rejected: number };
  sales: { totalGmv: number; totalOrders: number; recentGmv: number };
  regions: { region: string; count: number }[];
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const supabase = createClient();
  const [profiles, events, apps, sales] = await Promise.all([
    supabase.from('profiles').select('id, role, created_at'),
    supabase.from('events').select('id, status, region'),
    supabase.from('applications').select('id, status'),
    supabase.from('sales').select('id, revenue, orders, recorded_at'),
  ]);

  if (profiles.error) throw profiles.error;
  if (events.error) throw events.error;
  if (apps.error) throw apps.error;
  if (sales.error) throw sales.error;

  const now = Date.now();
  const week = 7 * 86400000;

  const profileRows = (profiles.data ?? []) as { id: string; role: string; created_at: string }[];
  const eventRows = (events.data ?? []) as { id: string; status: string; region: string }[];
  const appRows = (apps.data ?? []) as { id: string; status: string }[];
  const saleRows = (sales.data ?? []) as { id: string; revenue: number; orders: number; recorded_at: string }[];

  const regionMap = new Map<string, number>();
  eventRows.forEach((e) => regionMap.set(e.region, (regionMap.get(e.region) ?? 0) + 1));

  return {
    users: {
      total: profileRows.length,
      seller: profileRows.filter((p) => p.role === 'seller').length,
      host: profileRows.filter((p) => p.role === 'host').length,
      admin: profileRows.filter((p) => p.role === 'admin').length,
      newLast7d: profileRows.filter((p) => now - new Date(p.created_at).getTime() < week).length,
    },
    events: {
      total: eventRows.length,
      open: eventRows.filter((e) => e.status === 'open').length,
      upcoming: eventRows.filter((e) => e.status === 'upcoming').length,
      close: eventRows.filter((e) => e.status === 'close').length,
    },
    applications: {
      total: appRows.length,
      pending: appRows.filter((a) => a.status === 'pending').length,
      approved: appRows.filter((a) => a.status === 'approved').length,
      rejected: appRows.filter((a) => a.status === 'rejected').length,
    },
    sales: {
      totalGmv: saleRows.reduce((s, r) => s + r.revenue, 0),
      totalOrders: saleRows.reduce((s, r) => s + r.orders, 0),
      recentGmv: saleRows
        .filter((r) => now - new Date(r.recorded_at).getTime() < 30 * 86400000)
        .reduce((s, r) => s + r.revenue, 0),
    },
    regions: Array.from(regionMap.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export interface TopSeller {
  id: string;
  name: string;
  business_name: string | null;
  region: string | null;
  totalRevenue: number;
  saleCount: number;
}

export async function fetchTopSellers(limit = 5): Promise<TopSeller[]> {
  const supabase = createClient();
  const { data: sales, error } = await supabase
    .from('sales')
    .select('seller_id, revenue, seller:profiles!sales_seller_id_fkey(id, name, business_name, region)');
  if (error) throw error;

  type Row = { seller_id: string; revenue: number; seller: { id: string; name: string; business_name: string | null; region: string | null } | null };
  const rows = (sales ?? []) as unknown as Row[];

  const agg = new Map<string, TopSeller>();
  rows.forEach((r) => {
    const s = r.seller;
    if (!s) return;
    const cur = agg.get(s.id) ?? {
      id: s.id,
      name: s.name,
      business_name: s.business_name,
      region: s.region,
      totalRevenue: 0,
      saleCount: 0,
    };
    cur.totalRevenue += r.revenue;
    cur.saleCount += 1;
    agg.set(s.id, cur);
  });

  return Array.from(agg.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);
}

export interface MonthlyGmvRow {
  month: string; // YYYY-MM
  label: string; // e.g. '3월'
  gmv: number;
  orders: number;
}

export async function fetchMonthlyGmv(months = 6): Promise<MonthlyGmvRow[]> {
  const supabase = createClient();
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('sales')
    .select('revenue, orders, recorded_at')
    .gte('recorded_at', sinceStr);
  if (error) throw error;

  const rows = (data ?? []) as { revenue: number; orders: number; recorded_at: string }[];
  const byMonth = new Map<string, { gmv: number; orders: number }>();

  // 지난 N개월 빈 슬롯 생성
  for (let i = 0; i < months; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - (months - 1 - i));
    const key = d.toISOString().slice(0, 7);
    byMonth.set(key, { gmv: 0, orders: 0 });
  }

  rows.forEach((r) => {
    const key = r.recorded_at.slice(0, 7);
    const cur = byMonth.get(key) ?? { gmv: 0, orders: 0 };
    byMonth.set(key, { gmv: cur.gmv + r.revenue, orders: cur.orders + r.orders });
  });

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      label: `${parseInt(month.slice(5, 7), 10)}월`,
      gmv: v.gmv,
      orders: v.orders,
    }));
}

// ============================================
// Admin · 사용자 관리
// ============================================

export async function fetchAllProfiles(opts?: { q?: string; role?: 'seller' | 'host' | 'admin' | 'all' }): Promise<Profile[]> {
  const supabase = createClient();
  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (opts?.role && opts.role !== 'all') query = query.eq('role', opts.role);
  if (opts?.q?.trim()) {
    const q = opts.q.trim();
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,business_name.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function updateProfileRole(profileId: string, role: 'seller' | 'host' | 'admin'): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId);
  if (error) throw error;
}

// ============================================
// Admin · 행사 검수
// ============================================

export async function fetchAllEventsAdmin(opts?: { status?: 'all' | 'open' | 'upcoming' | 'close' | 'canceled'; q?: string }): Promise<EventRow[]> {
  const supabase = createClient();
  let query = supabase.from('events').select('*').order('created_at', { ascending: false });
  if (opts?.status && opts.status !== 'all') query = query.eq('status', opts.status);
  if (opts?.q?.trim()) query = query.ilike('name', `%${opts.q.trim()}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export async function updateEventStatus(id: string, status: 'open' | 'upcoming' | 'close' | 'canceled'): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('events').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

// ============================================
// Admin · 결제 관제
// ============================================

export interface PaymentRow {
  id: string;
  eventId: string;
  eventName: string;
  organizer: string;
  startDate: string;
  endDate: string;
  approvedSellers: number;
  fee: number;
  feeRate: number;
  totalDays: number;
  expectedFee: number; // 참가비 합계
  actualGmv: number; // 실 매출 합계
  platformFee: number; // 5% 수수료
  status: 'awaiting' | 'settled' | 'issue';
  settleBy: string; // 정산 예정일
}

/**
 * 행사별 결제/정산 요약 계산
 * - status 'close' 행사: settled 후보
 * - status 'open'/'upcoming' 행사: awaiting
 * - 실 매출(sales) 없는 close 행사: issue (미기록)
 */
export async function fetchPaymentRows(): Promise<PaymentRow[]> {
  const supabase = createClient();
  const [events, apps, sales] = await Promise.all([
    supabase.from('events').select('*'),
    supabase.from('applications').select('id, event_id, status'),
    supabase.from('sales').select('event_id, revenue'),
  ]);
  if (events.error) throw events.error;
  if (apps.error) throw apps.error;
  if (sales.error) throw sales.error;

  const eventRows = (events.data ?? []) as EventRow[];
  const appRows = (apps.data ?? []) as { id: string; event_id: string; status: string }[];
  const saleRows = (sales.data ?? []) as { event_id: string; revenue: number }[];

  return eventRows.map((e) => {
    const approved = appRows.filter((a) => a.event_id === e.id && a.status === 'approved').length;
    const days = Math.max(1, Math.ceil((new Date(e.end_date).getTime() - new Date(e.start_date).getTime()) / 86400000) + 1);
    const expectedFee = e.fee * days * approved;
    const actualGmv = saleRows.filter((s) => s.event_id === e.id).reduce((sum, s) => sum + s.revenue, 0);
    const platformFee = Math.round(actualGmv * 0.05);

    let status: PaymentRow['status'];
    if (e.status === 'close') {
      status = actualGmv > 0 ? 'settled' : 'issue';
    } else if (e.status === 'canceled') {
      status = 'issue';
    } else {
      status = 'awaiting';
    }

    // 정산 예정일 = 종료일 + 3일
    const settle = new Date(e.end_date);
    settle.setDate(settle.getDate() + 3);
    const settleBy = settle.toISOString().slice(0, 10);

    return {
      id: e.id,
      eventId: e.id,
      eventName: e.name,
      organizer: e.organizer,
      startDate: e.start_date,
      endDate: e.end_date,
      approvedSellers: approved,
      fee: e.fee,
      feeRate: e.fee_rate,
      totalDays: days,
      expectedFee,
      actualGmv,
      platformFee,
      status,
      settleBy,
    };
  }).sort((a, b) => {
    // issue → awaiting → settled 순
    const order = { issue: 0, awaiting: 1, settled: 2 };
    return order[a.status] - order[b.status] || b.startDate.localeCompare(a.startDate);
  });
}

export interface ActivityRow {
  type: 'signup' | 'event' | 'application' | 'sale';
  title: string;
  detail: string;
  at: string;
}

export async function fetchRecentActivity(limit = 12): Promise<ActivityRow[]> {
  const supabase = createClient();
  const [profiles, events, apps, sales] = await Promise.all([
    supabase.from('profiles').select('id, name, role, business_name, created_at').order('created_at', { ascending: false }).limit(6),
    supabase.from('events').select('id, name, organizer, created_at').order('created_at', { ascending: false }).limit(6),
    supabase.from('applications').select('id, applied_at, status, event:events(name), seller:profiles!applications_seller_id_fkey(name)').order('applied_at', { ascending: false }).limit(6),
    supabase.from('sales').select('id, revenue, recorded_at, seller:profiles!sales_seller_id_fkey(name), event:events(name)').order('recorded_at', { ascending: false }).limit(6),
  ]);

  const rows: ActivityRow[] = [];

  ((profiles.data ?? []) as { name: string; role: string; business_name: string | null; created_at: string }[]).forEach((p) =>
    rows.push({
      type: 'signup',
      title: `${p.name} 가입 (${p.role})`,
      detail: p.business_name ?? '',
      at: p.created_at,
    })
  );

  ((events.data ?? []) as { name: string; organizer: string; created_at: string }[]).forEach((e) =>
    rows.push({
      type: 'event',
      title: `${e.name} 등록`,
      detail: e.organizer,
      at: e.created_at,
    })
  );

  ((apps.data ?? []) as unknown as { applied_at: string; status: string; event: { name: string } | null; seller: { name: string } | null }[]).forEach((a) =>
    rows.push({
      type: 'application',
      title: `${a.seller?.name ?? '파트너'} → ${a.event?.name ?? '행사'} 신청`,
      detail: a.status,
      at: a.applied_at,
    })
  );

  ((sales.data ?? []) as unknown as { revenue: number; recorded_at: string; seller: { name: string } | null; event: { name: string } | null }[]).forEach((s) =>
    rows.push({
      type: 'sale',
      title: `${s.seller?.name ?? '파트너'} 매출 기록`,
      detail: `${s.event?.name ?? ''} · ₩${s.revenue.toLocaleString()}`,
      at: s.recorded_at,
    })
  );

  return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

// ============================================
// v3 · Ratings (주최사 -> 셀러 평가)
// ============================================

/** 셀러가 받은 평가 목록 (마이페이지 · 심사 열람) */
export async function fetchSellerRatings(sellerId: string): Promise<RatingWithRelations[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('ratings')
    .select('*, host:profiles!ratings_host_id_fkey(id, name, business_name), event:events(id, name)')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as RatingWithRelations[];
}

/** 셀러 평점 요약 (뷰) · 노출 여부는 platform_settings.min_reviews와 함께 앱단 판단 */
export async function fetchRatingSummary(sellerId: string): Promise<RatingSummary | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('seller_rating_summary')
    .select('*')
    .eq('seller_id', sellerId)
    .maybeSingle();
  if (error) throw error;
  return (data as RatingSummary) ?? null;
}

/** 평가 등록 (주최사) */
export async function createRating(input: {
  seller_id: string;
  host_id: string;
  event_id?: string | null;
  hygiene: number;
  punctual: number;
  service: number;
  comment?: string | null;
}): Promise<Rating> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('ratings')
    .insert({
      seller_id: input.seller_id,
      host_id: input.host_id,
      event_id: input.event_id ?? null,
      hygiene: input.hygiene,
      punctual: input.punctual,
      service: input.service,
      comment: input.comment ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Rating;
}

/** 평가 삭제 (관리자) */
export async function deleteRating(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('ratings').delete().eq('id', id);
  if (error) throw error;
}

// ============================================
// v3 · Notifications (알림함)
// ============================================

/** 내 알림 목록 */
export async function fetchMyNotifications(userId: string, limit = 30): Promise<Notification[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

/** 전체 읽음 처리 (종 아이콘 열람 시) */
export async function markNotificationsRead(userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
}

/** 알림 생성 (트리거: 마감/심사/서류/신규행사/정산) */
export async function createNotification(input: {
  user_id: string;
  kind: NotifKind;
  title: string;
  body?: string | null;
  event_id?: string | null;
}): Promise<Notification> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: input.user_id,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      event_id: input.event_id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Notification;
}

// ============================================
// v3 · Settlements (주최사 개별 지급)
// ============================================

/** 주최사 정산 목록 (지급 대기/완료) */
export async function fetchHostSettlements(hostId: string): Promise<SettlementWithRelations[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('settlements')
    .select('*, seller:profiles!settlements_seller_id_fkey(id, name, business_name), event:events(id, name)')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SettlementWithRelations[];
}

/** 정산 레코드 생성 (셀러 매출 확인 후 지급 대상 등록) */
export async function createSettlement(input: {
  host_id: string;
  seller_id: string;
  event_id: string;
  sales_id?: string | null;
  sales_amount: number;
  payout: number;
  memo?: string | null;
}): Promise<Settlement> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('settlements')
    .insert({
      host_id: input.host_id,
      seller_id: input.seller_id,
      event_id: input.event_id,
      sales_id: input.sales_id ?? null,
      sales_amount: input.sales_amount,
      payout: input.payout,
      memo: input.memo ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Settlement;
}

/** 지급 완료 처리 */
export async function markSettlementPaid(id: string): Promise<Settlement> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('settlements')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Settlement;
}

// ============================================
// v3 · Platform settings (평점 정책 싱글턴)
// ============================================

export async function fetchPlatformSettings(): Promise<PlatformSettings | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('platform_settings').select('*').eq('id', 1).maybeSingle();
  if (error) throw error;
  return (data as PlatformSettings) ?? null;
}

/** 평점 정책 수정 (관리자) */
export async function updatePlatformSettings(
  patch: Partial<Omit<PlatformSettings, 'id' | 'updated_at'>>
): Promise<PlatformSettings> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('platform_settings')
    .update(patch)
    .eq('id', 1)
    .select()
    .single();
  if (error) throw error;
  return data as PlatformSettings;
}

// ============================================
// v4 · 셀러 수기 참여이력 (seller_history)
// ============================================

/** 셀러 수기·외부 참여이력 목록 (본인 + 주최사/관리자 열람) */
export async function fetchSellerHistory(sellerId: string): Promise<SellerHistory[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('seller_history')
    .select('*')
    .eq('seller_id', sellerId)
    .order('event_date', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as SellerHistory[];
}

/** 수기 참여이력 등록 (가입 온보딩·마이페이지) */
export async function createSellerHistory(input: {
  seller_id: string;
  event_name: string;
  event_date?: string | null;
  region?: string | null;
  orders?: number | null;
  revenue?: number | null;
  note?: string | null;
}): Promise<SellerHistory> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('seller_history')
    .insert({
      seller_id: input.seller_id,
      event_name: input.event_name,
      event_date: input.event_date ?? null,
      region: input.region ?? null,
      orders: input.orders ?? null,
      revenue: input.revenue ?? null,
      note: input.note ?? null,
      self_reported: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data as SellerHistory;
}

export async function deleteSellerHistory(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('seller_history').delete().eq('id', id);
  if (error) throw error;
}

// ============================================
// v4 · 매출 기록 (sales) · 참여이력 자동 반영
// ============================================

/** 행사 참여 후 매출/판매건수 기록 (셀러) */
export async function recordSale(input: {
  seller_id: string;
  event_id: string;
  application_id?: string | null;
  orders: number;
  revenue: number;
  note?: string | null;
}): Promise<Sale> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sales')
    .insert({
      seller_id: input.seller_id,
      event_id: input.event_id,
      application_id: input.application_id ?? null,
      orders: input.orders,
      revenue: input.revenue,
      note: input.note ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Sale;
}

// ============================================
// v4 · QR 입점 승인 확인
// ============================================

/** 현장 스캔 · QR 토큰으로 승인 입점 확인 (공개 RPC) */
export async function verifyQr(token: string): Promise<VerifyQrResult | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('verify_qr', { p_token: token });
  if (error) throw error;
  const rows = (data ?? []) as VerifyQrResult[];
  return rows[0] ?? null;
}

// ============================================
// v5 · 인근지역 정보 (local_info / find_nearby)
// ============================================

/** 이벤트 반경 내 인근 지역 정보 (아파트·대학·축제 등) */
export async function fetchNearby(eventId: string, radiusM = 1000): Promise<NearbyRow[]> {
  const supabase = createClient();
  const { data: e, error: e1 } = await supabase
    .from('events')
    .select('lat, lng')
    .eq('id', eventId)
    .maybeSingle();
  if (e1 || !e?.lat || !e?.lng) return [];

  const { data, error } = await supabase.rpc('find_nearby', {
    event_lat: e.lat,
    event_lng: e.lng,
    radius_m: radiusM,
  });
  if (error) throw error;
  return (data ?? []) as NearbyRow[];
}

/** admin: 지역 정보 수동 등록/수정 */
export async function upsertLocalInfo(
  input: Omit<LocalInfo, 'id' | 'synced_at' | 'updated_at'>
): Promise<LocalInfo> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('local_info')
    .upsert(input, { onConflict: 'category,external_id,source' })
    .select()
    .single();
  if (error) throw error;
  return data as LocalInfo;
}
