import { NextResponse } from 'next/server';

/**
 * 행사 찾기 상단 "이번 주말 지역별 날씨" (기상청 중기예보)
 *  - 중기육상예보(getMidLandFcst): 강수확률·날씨 (3~10일)
 *  - 중기기온(getMidTa): 최저/최고 기온 (3~10일)
 *  - 17개 시도별로 가장 가까운 주말(토/일) 예보를 요약해 반환
 * env: DATA_GO_KR_KEY (data.go.kr 일반 인증키 · 기상청_중기예보 조회서비스 활용신청 필요)
 * 키 미설정 시 { configured:false } 반환 → 프런트는 조용히 숨김.
 * 예보는 하루 2회(06/18시) 갱신 → 3시간 캐시.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const KEY = (process.env.DATA_GO_KR_KEY ?? '').trim();
const MID = 'https://apis.data.go.kr/1360000/MidFcstInfoService';

// 시도 → 중기육상 regId / 중기기온 regId(대표도시)
const REGIONS: { sido: string; land: string; ta: string }[] = [
  { sido: '서울', land: '11B00000', ta: '11B10101' },
  { sido: '인천', land: '11B00000', ta: '11B20201' },
  { sido: '경기', land: '11B00000', ta: '11B20601' },
  { sido: '강원', land: '11D10000', ta: '11D10301' }, // 영서 춘천
  { sido: '충북', land: '11C10000', ta: '11C10301' }, // 청주
  { sido: '충남', land: '11C20000', ta: '11C20401' }, // 홍성/대전권
  { sido: '대전', land: '11C20000', ta: '11C20401' },
  { sido: '세종', land: '11C20000', ta: '11C20404' },
  { sido: '전북', land: '11F10000', ta: '11F10201' }, // 전주
  { sido: '전남·광주', land: '11F20000', ta: '11F20501' }, // 광주
  { sido: '경북', land: '11H10000', ta: '11H10701' }, // 대구권
  { sido: '대구', land: '11H10000', ta: '11H10701' },
  { sido: '경남', land: '11H20000', ta: '11H20201' }, // 부산권
  { sido: '부산', land: '11H20000', ta: '11H20201' },
  { sido: '울산', land: '11H20000', ta: '11H20101' },
  { sido: '제주', land: '11G00000', ta: '11G00201' },
];

/** UTC 타임스탬프를 +9h 이동한 Date (KST 벽시계를 getUTC*로 읽기 위함 · 서버 TZ 무관) */
function kstNow(): Date { return new Date(Date.now() + 9 * 3600 * 1000); }
const ymdh = (dt: Date, hh: number) =>
  `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, '0')}${String(dt.getUTCDate()).padStart(2, '0')}${String(hh).padStart(2, '0')}00`;

/** 중기예보 tmFc: 최근 발표(오늘 06시, 그 전엔 어제 18시) · KST 기준 */
function latestTmFc(): string {
  const kst = kstNow();
  const h = kst.getUTCHours();
  if (h >= 18) return ymdh(kst, 18);
  if (h >= 6) return ymdh(kst, 6);
  return ymdh(new Date(kst.getTime() - 86400000), 18);
}

/** 오늘(KST) 기준 가장 가까운 토요일까지의 일수(3~10 범위면 중기예보로 조회 가능) */
function weekendOffsets(): { satDay: number; sunDay: number; satDate: string; sunDate: string } | null {
  const kst = kstNow();
  const dow = kst.getUTCDay(); // 0=일 (KST 벽시계)
  let toSat = (6 - dow + 7) % 7; if (toSat === 0) toSat = 7; // 다음 토요일(오늘이 토면 다음 주)
  const toSun = toSat + 1;
  const fmt = (addDays: number) => {
    const dt = new Date(kst.getTime() + addDays * 86400000);
    return `${dt.getUTCMonth() + 1}/${dt.getUTCDate()}`;
  };
  // 중기예보는 3~10일만 제공
  if (toSat < 3 || toSun > 10) {
    // 주말이 너무 가깝거나(단기예보 영역) 멀면, 조회 가능한 토/일로 보정
    const sat = Math.min(Math.max(toSat, 3), 9);
    return { satDay: sat, sunDay: sat + 1, satDate: fmt(sat), sunDate: fmt(sat + 1) };
  }
  return { satDay: toSat, sunDay: toSun, satDate: fmt(toSat), sunDate: fmt(toSun) };
}

type MidItem = Record<string, string | number>;
/** data.go.kr 요청 URL · Node fetch 이중 인코딩 방지(키 디코드 후 URLSearchParams로 1회 인코딩) */
function midUrl(path: string, regId: string, tmFc: string): string {
  const qs = new URLSearchParams({
    serviceKey: decodeURIComponent(KEY),
    numOfRows: '10', pageNo: '1', dataType: 'JSON', regId, tmFc,
  });
  return `${MID}/${path}?${qs.toString()}`;
}
async function fetchMid(path: string, regId: string, tmFc: string): Promise<MidItem | null> {
  try {
    const r = await fetch(midUrl(path, regId, tmFc), { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    const items = j?.response?.body?.items?.item;
    return Array.isArray(items) ? items[0] : items ?? null;
  } catch { return null; }
}

export async function GET(req: Request) {
  if (!KEY) return NextResponse.json({ configured: false });
  const tmFc = latestTmFc();

  // 진단용: /api/weather?debug=1 → 상류 응답 원문/상태 확인 (키 길이는 노출 안 함)
  if (new URL(req.url).searchParams.get('debug')) {
    try {
      const r = await fetch(midUrl('getMidLandFcst', '11B00000', tmFc), { cache: 'no-store' });
      const text = await r.text();
      return NextResponse.json({ tmFc, keyLen: KEY.length, status: r.status, body: text.slice(0, 400) });
    } catch (e) {
      return NextResponse.json({ tmFc, keyLen: KEY.length, error: String(e).slice(0, 200) });
    }
  }
  const wk = weekendOffsets();
  if (!wk) return NextResponse.json({ configured: true, items: [] });

  // 중기예보는 발표일 기준 day4~10만 제공(day3는 단기예보 영역) → 최소 4로 보정.
  // 주말이 3일 뒤면 토요일 데이터가 없으므로 일요일(day4)을 대표값으로 사용.
  const day = Math.min(Math.max(wk.satDay, 4), 10);
  const landCache = new Map<string, MidItem | null>();
  const taCache = new Map<string, MidItem | null>();

  const results = await Promise.all(REGIONS.map(async (reg) => {
    if (!landCache.has(reg.land)) landCache.set(reg.land, await fetchMid('getMidLandFcst', reg.land, tmFc));
    if (!taCache.has(reg.ta)) taCache.set(reg.ta, await fetchMid('getMidTa', reg.ta, tmFc));
    const land = landCache.get(reg.land);
    const ta = taCache.get(reg.ta);
    const num = (v: unknown) => (v == null || v === '' ? null : Number(v));
    const am = num(land?.[`rnSt${day}Am`] ?? land?.[`rnSt${day}`]);
    const pm = num(land?.[`rnSt${day}Pm`] ?? land?.[`rnSt${day}`]);
    const rain = am != null && pm != null ? Math.max(am, pm) : (am ?? pm);
    return {
      sido: reg.sido,
      rain,                                   // 강수확률 %
      tmin: num(ta?.[`taMin${day}`]),         // 최저기온
      tmax: num(ta?.[`taMax${day}`]),         // 최고기온
      sky: (land?.[`wf${day}Am`] ?? land?.[`wf${day}`] ?? '') as string, // 날씨 문구
    };
  }));

  return NextResponse.json({
    configured: true,
    tmFc,
    weekend: { sat: wk.satDate, sun: wk.sunDate },
    items: results,
  });
}
