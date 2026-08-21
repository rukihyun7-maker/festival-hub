import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/**
 * 전국 축제(정보형) 자동 갱신 · Vercel Cron 매일 호출
 * - TourAPI(searchFestival2) '목록'만 받아 upsert → 진행중/향후 축제 최신화
 * - 홈페이지/개요(description)는 payload에서 제외 → 수동 상세수집으로 채운 값 보존
 * - 목록에서 사라진(종료된) 축제는 삭제
 *
 * 인증: Vercel Cron이 보내는 Authorization: Bearer <CRON_SECRET> 검증.
 *       수동 점검은 /api/cron/refresh-festivals?key=<CRON_SECRET> 로도 호출 가능.
 * 필요 env: TOURAPI_KEY(data.go.kr 인코딩 키), CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BASE = 'https://apis.data.go.kr/B551011/KorService2';
const COMMON = 'MobileOS=ETC&MobileApp=FestivalHub&_type=json';

const REGION: [string, string][] = [
  ['서울', '서울'], ['부산', '부산'], ['대구', '대구'], ['인천', '인천'], ['광주', '광주'], ['대전', '대전'], ['울산', '울산'], ['세종', '세종'],
  ['경기', '경기'], ['강원특별자치도', '강원'], ['강원', '강원'], ['충청북', '충북'], ['충청남', '충남'],
  ['전북특별자치도', '전북'], ['전라북', '전북'], ['전라남', '전남'], ['경상북', '경북'], ['경상남', '경남'], ['제주', '제주'],
];
const toRegion = (a = '') => { for (const [k, v] of REGION) if (a.startsWith(k)) return v; return '서울'; };
const toDate = (s?: string) => (s && s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null);
const yyyymmdd = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

async function getJson(url: string) {
  const r = await fetch(url, { cache: 'no-store' });
  const t = await r.text();
  try { return JSON.parse(t); } catch { throw new Error('TourAPI 비정상 응답: ' + t.slice(0, 120)); }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  const keyParam = new URL(req.url).searchParams.get('key');
  if (!secret || (auth !== `Bearer ${secret}` && keyParam !== secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const KEY = process.env.TOURAPI_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!KEY || !url || !svc) {
    return NextResponse.json({ error: 'env(TOURAPI_KEY / SUPABASE_SERVICE_ROLE_KEY / URL) 미설정' }, { status: 500 });
  }

  const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } });

  // 관리자 계정을 소유자로 (정보형 행사 owner)
  const { data: adm } = await admin.from('profiles').select('id').eq('role', 'admin').order('created_at').limit(1).maybeSingle();
  if (!adm?.id) return NextResponse.json({ error: '관리자 프로필 없음' }, { status: 500 });

  // 목록 수집 (최근 시작분부터, 진행중/향후만)
  const today = yyyymmdd(new Date());
  const from = yyyymmdd(new Date(Date.now() - 30 * 86400000)); // 30일 전 시작분까지 포함(진행중 커버)
  const items: any[] = [];
  for (let page = 1; page <= 30; page++) {
    const j = await getJson(`${BASE}/searchFestival2?serviceKey=${KEY}&${COMMON}&eventStartDate=${from}&numOfRows=100&pageNo=${page}&arrange=A`);
    const list = j?.response?.body?.items?.item ?? [];
    if (!list.length) break;
    items.push(...list);
    const total = Number(j?.response?.body?.totalCount ?? 0);
    if (items.length >= total) break;
  }

  // 진행중/향후 + 좌표 있는 것만
  const fests = items.filter((it) => (it.eventenddate || '0') >= today && it.mapx && it.mapy);
  if (fests.length === 0) {
    return NextResponse.json({ ok: true, note: '목록 0건 → 갱신 건너뜀(외부 API 일시 오류 가능)', fetched: items.length });
  }

  // upsert payload (홈페이지/개요는 제외 → 기존 값 보존)
  const nowIso = new Date().toISOString();
  const rows = fests.map((it) => ({
    ext_id: String(it.contentid),
    owner_id: adm.id,
    name: it.title,
    category: '축제',
    organizer: it.title,
    start_date: toDate(it.eventstartdate),
    end_date: toDate(it.eventenddate),
    region: toRegion(it.addr1),
    address: it.addr1 || '',
    fee: 0,
    fee_rate: 0,
    electric: false, water: false, gas: false, parking: false,
    phone: it.tel || null,
    status: 'open',
    kind: 'info',
    review_status: 'approved',
    source: 'TourAPI',
    lat: Number(it.mapy),
    lng: Number(it.mapx),
    geocoded_at: nowIso,
  }));

  const { error: upErr } = await admin.from('events').upsert(rows, { onConflict: 'source,ext_id' });
  if (upErr) return NextResponse.json({ error: 'upsert 실패: ' + upErr.message }, { status: 500 });

  // 목록에서 사라진(종료) 축제 정리 + 구(舊) ext_id 없는 TourAPI 잔여행 정리
  const ids = rows.map((r) => r.ext_id);
  const { error: delErr, count: removed } = await admin
    .from('events').delete({ count: 'exact' })
    .eq('source', 'TourAPI')
    .not('ext_id', 'in', `(${ids.join(',')})`);
  const { count: removedNull } = await admin
    .from('events').delete({ count: 'exact' })
    .eq('source', 'TourAPI').is('ext_id', null);

  return NextResponse.json({
    ok: true,
    upserted: rows.length,
    removed_ended: removed ?? 0,
    removed_legacy: removedNull ?? 0,
    delete_error: delErr?.message ?? null,
    at: nowIso,
  });
}
