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
  PartnerReviewPublic,
  MyReceivedReview,
  ApplicationDocument,
  Notification,
  NotifKind,
  Settlement,
  SettlementWithRelations,
  PlatformSettings,
  SellerHistory,
  VerifyQrResult,
  LocalInfo,
  NearbyRow,
  NearbyEvent,
  PersonalEvent,
  Favorite,
  FavoriteWithEvent,
  ApiSource,
  CategoryRule,
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

  // v8: 승인된 행사만 노출 (컬럼 없으면 approved로 간주)
  list = list.filter((e) => (e.review_status ?? 'approved') === 'approved');

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
    .limit(limit + 4); // 승인 필터 여유분
  if (error) throw error;
  return ((data ?? []) as EventRow[])
    .filter((e) => (e.review_status ?? 'approved') === 'approved')
    .slice(0, limit);
}

/** 행사 상세 */
export async function fetchEventById(id: string): Promise<EventRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as EventRow) ?? null;
}

/** 가입 시 임시 보관한 주최 명함을 첫 로그인 때 실제 업로드 (이메일 인증 ON 대응)
 *  localStorage 'fh_pending_card' = { uid, dataUrl, ext } · 성공 시 business_card_url 반영 */
export async function flushPendingBusinessCard(profileId: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('fh_pending_card');
  if (!raw) return null;
  let parsed: { uid?: string; dataUrl?: string; ext?: string };
  try { parsed = JSON.parse(raw); } catch { localStorage.removeItem('fh_pending_card'); return null; }
  if (parsed.uid !== profileId || !parsed.dataUrl) return null;
  try {
    const supabase = createClient();
    const blob = await (await fetch(parsed.dataUrl)).blob();
    const path = `${profileId}/business_card/${Date.now()}.${parsed.ext || 'jpg'}`;
    const { error } = await supabase.storage.from('documents').upload(path, blob, { upsert: true, contentType: blob.type });
    localStorage.removeItem('fh_pending_card');
    if (error) return null;
    await supabase.from('profiles').update({ business_card_url: path }).eq('id', profileId);
    return path;
  } catch {
    return null;
  }
}

/** 행사 모집공고문 업로드 (menu-photos 버킷 재사용) → 공개 URL 반환 */
export async function uploadEventNotice(ownerId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf';
  const path = `${ownerId}/event-notice/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('menu-photos').upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw error;
  const { data } = supabase.storage.from('menu-photos').getPublicUrl(path);
  return data.publicUrl;
}

/** 현수막 위치 사진 업로드 (menu-photos 버킷 재사용) → 공개 URL 반환 */
export async function uploadBannerPhoto(sellerId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${sellerId}/banner.${ext}`;
  const { error } = await supabase.storage.from('menu-photos').upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw error;
  const { data } = supabase.storage.from('menu-photos').getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

/** 주최 명함 업로드 (로그인 후 · 본인 폴더) → business_card_url 반영 */
export async function uploadBusinessCard(profileId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${profileId}/business_card/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw error;
  await supabase.from('profiles').update({ business_card_url: path }).eq('id', profileId);
  return path;
}

/** 가입 승인/반려 안내 메일 발송 (관리자) · 서버 라우트 경유(Resend)
 *  RESEND_API_KEY 미설정 시 서버가 {skipped:true} 반환 → 조용히 성공 처리 */
export async function notifyAccountDecision(
  userId: string,
  decision: 'approved' | 'rejected',
  reason?: string
): Promise<{ ok: boolean; skipped?: boolean; id?: string }> {
  const res = await fetch('/api/admin/notify-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, decision, reason }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error || '메일 발송 실패');
  return j;
}

/** 프로필 단건 조회 (관리자 검수 · 주최 신원 확인 등) */
export async function fetchProfileById(id: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  return (data as Profile) ?? null;
}

/** 유사 행사 조회 (중복 등록 검수) · 같은 지역 + 이름 첫 토큰 유사 */
export async function fetchSimilarEvents(name: string, region: string, excludeId: string): Promise<EventRow[]> {
  const supabase = createClient();
  const first = (name || '').trim().split(/\s+/)[0] || name;
  if (!first) return [];
  let q = supabase.from('events').select('*').neq('id', excludeId).ilike('name', `%${first}%`).limit(6);
  if (region) q = q.eq('region', region);
  const { data } = await q;
  return (data ?? []) as EventRow[];
}

/** 행사 생성 (호스트) · kind/source는 DB 기본값(apply/null) 허용
 *  연락처(contact/phone)는 events가 아닌 event_contacts(RLS 보호)에 저장 (v27) */
export async function createEvent(
  input: Omit<EventRow, 'id' | 'created_at' | 'updated_at' | 'kind' | 'source'> &
    Partial<Pick<EventRow, 'kind' | 'source'>>
): Promise<EventRow> {
  const supabase = createClient();
  const { contact, phone, ...rest } = input;
  const { data, error } = await supabase.from('events').insert(rest).select().single();
  if (error) throw error;
  if (contact || phone) {
    await supabase.from('event_contacts').upsert({ event_id: data.id, contact: contact ?? null, phone: phone ?? null });
  }
  return { ...(data as EventRow), contact: contact ?? null, phone: phone ?? null };
}

/** 행사 연락처 조회 (event_contacts · RLS: 주최·관리자·승인 신청자만) */
export async function fetchEventContact(eventId: string): Promise<{ contact: string | null; phone: string | null } | null> {
  const supabase = createClient();
  const { data } = await supabase.from('event_contacts').select('contact, phone').eq('event_id', eventId).maybeSingle();
  return data ?? null;
}

/** 행사 연락처 저장 (주최·관리자) */
export async function upsertEventContact(eventId: string, contact: string | null, phone: string | null): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('event_contacts').upsert({ event_id: eventId, contact, phone, updated_at: new Date().toISOString() });
  if (error) throw error;
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

/** 내 신청 목록 (입점 파트너 마이페이지·홈) */
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

/** 호스트의 모든 행사 신청을 한 번에 (N+1 방지) · event/seller 임베드 */
export async function fetchApplicationsForHost(hostId: string): Promise<ApplicationWithRelations[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('applications')
    .select('*, seller:profiles!applications_seller_id_fkey(*), event:events!inner(*)')
    .eq('event.owner_id', hostId)
    .order('applied_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ApplicationWithRelations[];
}

/** 이 행사에 대한 내 최신 신청 (없으면 null) · 재신청 방지용 */
export async function fetchMyApplicationForEvent(eventId: string, sellerId: string): Promise<Application | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('event_id', eventId)
    .eq('seller_id', sellerId)
    .order('applied_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0] as Application) ?? null;
}

/** 신청 생성 (재신청 허용: (event_id, seller_id) 유니크 충돌 시 기존 반려·취소 건을 재사용해 재신청) */
export async function createApplication(eventId: string, sellerId: string, slotType?: string | null): Promise<Application> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('applications')
    .upsert(
      {
        event_id: eventId,
        seller_id: sellerId,
        status: 'pending',
        slot_type: slotType ?? null,
        reviewed_by: null,
        reviewed_at: null,
        memo: null,
        applied_at: new Date().toISOString(),
      },
      { onConflict: 'event_id,seller_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as Application;
}

/** 신청 추가서류 업로드 (documents 버킷 · ASCII 키) → 저장 경로 반환 */
export async function uploadApplicationDoc(sellerId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const path = `${sellerId}/app/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (error) throw error;
  return path;
}

/** 신청 추가서류 레코드 등록 (RLS: 신청자 본인) */
export async function addApplicationDocument(applicationId: string, label: string, fileUrl: string, fileName: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('application_documents').insert({ application_id: applicationId, label, file_url: fileUrl, file_name: fileName });
  if (error) throw error;
}

/** 신청 추가서류 조회 (신청자·주최·관리자) */
export async function fetchApplicationDocuments(applicationId: string): Promise<ApplicationDocument[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('application_documents').select('*').eq('application_id', applicationId).order('created_at');
  if (error) throw error;
  return (data ?? []) as ApplicationDocument[];
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

/** 메뉴 수정 (이름·가격·원가·카테고리·설명·대표·사진) */
export async function updateMenu(
  id: string,
  patch: Partial<Pick<Menu, 'name' | 'price' | 'cost' | 'category' | 'description' | 'signature' | 'image_url'>>
): Promise<Menu> {
  const supabase = createClient();
  const { data, error } = await supabase.from('menus').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Menu;
}

/** 대표 메뉴는 입점 파트너당 최대 2개 · 나머지 해제 후 지정 */
export async function setMenuSignature(sellerId: string, menuId: string, signature: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('menus').update({ signature }).eq('id', menuId).eq('seller_id', sellerId);
  if (error) throw error;
}

/** 메뉴 사진 업로드 (menu-photos 버킷 · public) → public URL 반환 */
export async function uploadMenuImage(sellerId: string, menuId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${sellerId}/${menuId}.${ext}`;
  const { error } = await supabase.storage.from('menu-photos').upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('menu-photos').getPublicUrl(path);
  // 캐시 무효화용 쿼리스트링
  return `${data.publicUrl}?v=${Date.now()}`;
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

/** 내 서류 5종 슬롯 (없으면 null) · 입점 파트너 마이페이지·홈·상세용 공통 */
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
  file_name_back?: string | null; // v48: 뒷면
  file_url_back?: string | null;
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
        file_name_back: input.file_name_back ?? null,
        file_url_back: input.file_url_back ?? null,
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
  // Storage 키는 ASCII만 허용(한글·특수문자는 "Invalid key" 오류) → 키에는 확장자만, 원본명은 file_name 컬럼에 별도 저장
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const path = `${sellerId}/${kind}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('documents').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
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

/** 서명된 URL 발급 (1시간 유효) · 파일 열람/다운로드용
 *  download=true 또는 파일명 문자열이면 강제 다운로드 */
export async function getSignedDocumentUrl(path: string, expiresInSec = 3600, download?: boolean | string): Promise<string> {
  const supabase = createClient();
  const opts = download ? { download } : undefined;
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, expiresInSec, opts);
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
  // 연락처는 event_contacts로 분리 저장 (v27) · events에는 쓰지 않음
  const { contact, phone, ...rest } = patch;
  const { data, error } = await supabase.from('events').update(rest).eq('id', id).select().single();
  if (error) throw error;
  if (contact !== undefined || phone !== undefined) {
    await supabase.from('event_contacts').upsert({ event_id: id, contact: contact ?? null, phone: phone ?? null, updated_at: new Date().toISOString() });
  }
  return { ...(data as EventRow), contact: contact ?? null, phone: phone ?? null };
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
// v43 · 행사 삭제 요청 (주최) → 관리자 승인 후 실삭제
// ============================================

/** 주최: 삭제 요청 (사유 포함) · 실삭제는 관리자 승인 후 */
export async function requestEventDeletion(id: string, reason: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('events')
    .update({ delete_requested_at: new Date().toISOString(), delete_reason: reason || null })
    .eq('id', id);
  if (error) throw error;
}

/** 주최: 삭제 요청 철회 */
export async function withdrawEventDeletion(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('events')
    .update({ delete_requested_at: null, delete_reason: null })
    .eq('id', id);
  if (error) throw error;
}

/** 관리자: 삭제 요청 대기 목록 */
export async function fetchDeletionRequests(): Promise<EventRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .not('delete_requested_at', 'is', null)
    .order('delete_requested_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

/** 관리자: 삭제 요청 반려(요청 취소, 행사 유지) */
export async function dismissEventDeletion(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('events')
    .update({ delete_requested_at: null, delete_reason: null })
    .eq('id', id);
  if (error) throw error;
}

// ============================================
// v8 · 행사 등록 요청 승인 (관리자) / 입점 파트너 가입 심사
// ============================================

/** 승인 대기 중인 등록 요청 (주최사 제출분) */
export async function fetchPendingEvents(): Promise<EventRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('review_status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

/** 등록 요청 승인 → 공개 */
export async function approveEvent(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('events')
    .update({ review_status: 'approved', admin_note: null })
    .eq('id', id);
  if (error) throw error;
}

/** 등록 요청 반려 (+사유) */
export async function rejectEvent(id: string, note: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('events')
    .update({ review_status: 'rejected', admin_note: note || null })
    .eq('id', id);
  if (error) throw error;
}

/** 주최가 제출한 내 등록 요청 현황 (review_status 포함, 전체) */
export async function fetchMyHostRequests(ownerId: string): Promise<EventRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

/** 주최 계정 완전 삭제 (관리자 · 등록 행사 0건일 때만) · 서버 라우트 경유 */
export async function deleteHostAccount(hostId: string): Promise<void> {
  return deleteUserAccount(hostId);
}

/** 계정 완전 삭제 (관리자) · 주최·파트너 공용. 파트너 반려/이슈 계정 삭제 시 이메일 해제 → 재가입 가능 */
export async function deleteUserAccount(userId: string): Promise<void> {
  const res = await fetch('/api/admin/delete-host', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || `삭제 실패 (${res.status})`);
  }
}

/** 임의 계정 생성 (관리자) · 주최/입점 파트너 테스트 계정을 즉시 승인 상태로 생성 */
export async function createUserByAdmin(input: {
  email: string;
  password: string;
  role: 'host' | 'seller' | 'admin';
  name: string;
  business_name?: string;
  business_no?: string;
  position?: string;
  phone?: string;
  overwrite?: boolean; // 이미 있는 이메일이면 그 계정을 테스트용으로 덮어쓰기
}): Promise<{ userId: string; overwritten: boolean }> {
  const res = await fetch('/api/admin/create-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `생성 실패 (${res.status})`);
  return { userId: j.userId as string, overwritten: !!j.overwritten };
}

/** 입점 파트너 가입 심사/정지 상태 변경 (관리자) */
export async function updateProfileStatus(id: string, status: '정상' | '가입 심사' | '정지' | '반려'): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
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
// v3 · Ratings (주최사 -> 입점 파트너 평가)
// ============================================

/** 입점 파트너가 받은 평가 목록 (마이페이지 · 심사 열람) */
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

/** 입점 파트너 평점 요약 (뷰) · 노출 여부는 platform_settings.min_reviews와 함께 앱단 판단 */
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

/** 평가 등록 (주최사 · v33 당근식 태그 + 보류공개)
 *  reveal_at = 행사 종료 + 14일 (없으면 지금+14일) → 그 전까지 파트너·미래주최에 비공개(작성자·관리자만).
 *  개선점(improve_tags)은 원본에만 저장 → 집계 반영 + 파트너 본인만 열람(공개뷰엔 제외). */
export async function createRating(input: {
  seller_id: string;
  host_id: string;
  event_id?: string | null;
  event_end?: string | null; // 행사 종료일 (YYYY-MM-DD) → 공개예정 계산
  praise_tags?: string[];
  improve_tags?: string[];
  rehire?: 'recommend' | 'ok' | 'no' | null;
  comment?: string | null;
}): Promise<Rating> {
  const supabase = createClient();
  const base = input.event_end ? new Date(input.event_end + 'T00:00:00') : new Date();
  const reveal = new Date(base.getTime() + 14 * 86400000).toISOString();
  const { data, error } = await supabase
    .from('ratings')
    .insert({
      seller_id: input.seller_id,
      host_id: input.host_id,
      event_id: input.event_id ?? null,
      praise_tags: input.praise_tags ?? [],
      improve_tags: input.improve_tags ?? [],
      rehire: input.rehire ?? null,
      comment: input.comment ?? null,
      reveal_at: reveal,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Rating;
}

/** 파트너 공개 후기 (닉네임·공개예정 지난 것만 · 개선점 제외) — 미래 주최·파트너 공용 */
export async function fetchPartnerReviewsPublic(sellerId: string): Promise<PartnerReviewPublic[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('partner_reviews_public')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PartnerReviewPublic[];
}

/** 파트너 본인이 받은 평가 (my_received_reviews 뷰 · 닉네임·개선점 포함, host_id 비노출, 공개예정 지난 것만) */
export async function fetchMyReceivedRatings(): Promise<MyReceivedReview[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('my_received_reviews')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MyReceivedReview[];
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

/** 정산 레코드 생성 (입점 파트너 매출 확인 후 지급 대상 등록) */
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

/** 로그인 노출 지표용 실제 참고 수치 (관리자) — 파트너·전체 행사·모집중 */
export async function fetchLandingRefCounts(): Promise<{ partners: number; events: number; recruiting: number }> {
  const supabase = createClient();
  const [p, e, r] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'seller'),
    supabase.from('events').select('id', { count: 'exact', head: true }),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);
  return { partners: p.count ?? 0, events: e.count ?? 0, recruiting: r.count ?? 0 };
}

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
// v4 · 입점 파트너 수기 참여이력 (seller_history)
// ============================================

/** 입점 파트너 수기·외부 참여이력 목록 (본인 + 주최사/관리자 열람) */
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

/** 행사 참여 후 매출/판매건수 기록 (입점 파트너) */
export async function recordSale(input: {
  seller_id: string;
  event_id: string;
  application_id?: string | null;
  orders: number;
  revenue: number;
  cost?: number | null;
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
      cost: input.cost ?? 0,
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

/** 개인(수기) 일정 조회 (v23) */
export async function fetchMyPersonalEvents(userId: string): Promise<PersonalEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('personal_events').select('*').eq('user_id', userId).order('start_date');
  if (error) return [];
  return (data ?? []) as PersonalEvent[];
}

/** 개인 일정 추가 (v23) */
export async function addPersonalEvent(input: { user_id: string; title: string; start_date: string; end_date: string; memo?: string | null }): Promise<PersonalEvent> {
  const supabase = createClient();
  const { data, error } = await supabase.from('personal_events').insert(input).select().single();
  if (error) throw error;
  return data as PersonalEvent;
}

/** 개인 일정 삭제 (v23) */
export async function deletePersonalEvent(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('personal_events').delete().eq('id', id);
  if (error) throw error;
}

/** 이벤트 인근(반경 내) 다른 승인 행사 — 인근 축제 표시용 (v14) */
export async function fetchNearbyEvents(eventId: string, radiusM = 20000): Promise<NearbyEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('find_nearby_events', {
    src_id: eventId,
    radius_m: radiusM,
  });
  if (error) return []; // 함수 미배포 등 비차단
  return (data ?? []) as NearbyEvent[];
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

// ============================================
// v3 · Ratings (관리자 · 전체 평가 로그)
// ============================================

/** 주최가 매긴 평가 목록 (입점 파트너 평가 화면 · 중복 방지 표시) */
export async function fetchHostGivenRatings(hostId: string): Promise<Rating[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .eq('host_id', hostId);
  if (error) throw error;
  return (data ?? []) as Rating[];
}

/** 전체 평가 목록 (관리자 · 부적절 평가 관리) */
export async function fetchAllRatings(): Promise<RatingWithRelations[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('ratings')
    .select(
      '*, host:profiles!ratings_host_id_fkey(id, name, business_name), seller:profiles!ratings_seller_id_fkey(id, name, business_name), event:events(id, name)'
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as RatingWithRelations[];
}

// ============================================
// v6 · Favorites (입점 파트너 찜한 행사)
// ============================================

/** 내 찜 목록 (행사 정보 포함, D-day 정렬은 앱단) */
export async function fetchMyFavorites(sellerId: string): Promise<FavoriteWithEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('favorites')
    .select('*, event:events(*)')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as FavoriteWithEvent[];
}

/** 찜 추가 */
export async function addFavorite(sellerId: string, eventId: string): Promise<Favorite> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('favorites')
    .insert({ seller_id: sellerId, event_id: eventId })
    .select()
    .single();
  if (error) throw error;
  return data as Favorite;
}

/** 찜 삭제 */
export async function removeFavorite(sellerId: string, eventId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('seller_id', sellerId)
    .eq('event_id', eventId);
  if (error) throw error;
}

/** 찜 마감 알림 on/off */
export async function setFavoriteNotify(id: string, notify: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('favorites').update({ notify }).eq('id', id);
  if (error) throw error;
}

// ============================================
// v46 · 조회수 / 찜 수 (주최 대시보드 · 상세 소셜 프루프)
// ============================================

/** 행사 조회수 +1 (RPC · 상세 진입 시 · 실패해도 무시) */
export async function incrementEventView(eventId: string): Promise<void> {
  const supabase = createClient();
  try { await supabase.rpc('increment_event_view', { p_event_id: eventId }); } catch { /* 조회수 실패 무시 */ }
}

/** 행사별 찜(관심) 수 (RPC · 집계만 공개) */
export async function fetchEventFavoriteCount(eventId: string): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('event_favorite_count', { p_event_id: eventId });
  if (error) throw error;
  return (data as number) ?? 0;
}

/** 여러 행사의 찜 수 일괄 조회 (RPC · 주최 대시보드) · {eventId: count} */
export async function fetchEventFavoriteCounts(eventIds: string[]): Promise<Record<string, number>> {
  if (eventIds.length === 0) return {};
  const supabase = createClient();
  const { data, error } = await supabase.rpc('event_favorite_counts', { p_event_ids: eventIds });
  if (error) throw error;
  const out: Record<string, number> = {};
  for (const r of (data ?? []) as { event_id: string; cnt: number }[]) out[r.event_id] = r.cnt;
  return out;
}

// ============================================
// v6 · API sources / Category rules (관리자 운영)
// ============================================

export async function fetchApiSources(): Promise<ApiSource[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('api_sources').select('*').order('created_at');
  if (error) throw error;
  return (data ?? []) as ApiSource[];
}

/** 소스 연동 on/off */
export async function setApiSourceEnabled(id: string, enabled: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('api_sources')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** 지금 동기화 (데모: last_sync 갱신) */
export async function syncApiSource(id: string): Promise<ApiSource> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('api_sources')
    .update({ last_sync: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ApiSource;
}

export async function fetchCategoryRules(): Promise<CategoryRule[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('category_rules').select('*').order('created_at');
  if (error) throw error;
  return (data ?? []) as CategoryRule[];
}

export async function createCategoryRule(input: { name: string; keywords: string[] }): Promise<CategoryRule> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('category_rules')
    .insert({ name: input.name, keywords: input.keywords })
    .select()
    .single();
  if (error) throw error;
  return data as CategoryRule;
}

/** 카테고리 노출 on/off */
export async function setCategoryVisible(id: string, visible: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('category_rules').update({ visible }).eq('id', id);
  if (error) throw error;
}

export async function deleteCategoryRule(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('category_rules').delete().eq('id', id);
  if (error) throw error;
}
