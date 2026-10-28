import { NextResponse } from 'next/server';
import https from 'node:https';

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
// data.go.kr(국내 공공 API)는 해외 리전 호출을 거부하는 경우가 있어 함수를 서울 리전에서 실행
export const preferredRegion = 'icn1';

const KEY = (process.env.DATA_GO_KR_KEY ?? '').trim();
const HOST = 'apis.data.go.kr';
const PATH_BASE = '/1360000/MidFcstInfoService';

/**
 * node:https로 경로를 "그대로" 전송 (fetch/undici가 인증키의 %2B를 +로 변형하는 문제 우회).
 * KEY(인코딩 인증키)의 %2B·%3D 가 재인코딩 없이 data.go.kr에 전달된다.
 */
function rawGet(path: string): Promise<{ status: number; text: string }> {
  return new Promise((resolve) => {
    const req = https.request({ host: HOST, path, method: 'GET', timeout: 8000 }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, text: data }));
    });
    req.on('error', () => resolve({ status: 0, text: '' }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, text: '' }); });
    req.end();
  });
}
function midPath(endpoint: string, regId: string, tmFc: string): string {
  return `${PATH_BASE}/${endpoint}?serviceKey=${KEY}&numOfRows=10&pageNo=1&dataType=JSON&regId=${regId}&tmFc=${tmFc}`;
}

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

/**
 * 중기예보는 "N일 후"(발표일 기준) 필드로 제공된다.
 *  - 06시 발표: rnSt4~rnSt10 (day4~10 제공)
 *  - 18시 발표: rnSt5~rnSt10 (day5~10 제공, day4 없음)
 * 따라서 이번 주말을 최대한 포함하려면 항상 06시 발표를 쓴다.
 * 조회 가능한 가장 가까운 주말 날짜(보통 일요일)를 N(day)과 함께 반환.
 * 토요일(day3)은 중기예보 범위 밖이라, 그 경우 일요일(day4)을 대표값으로 사용.
 */
function pickWeekend(): { tmFc: string; day: number; label: string } {
  const kst = kstNow();
  const h = kst.getUTCHours();
  // 06시 발표가 나온 뒤(=07시 이후)엔 오늘 06시, 아니면 어제 06시 발표를 조회
  const fcBase = h >= 7 ? kst : new Date(kst.getTime() - 86400000);
  const tmFc = ymdh(fcBase, 6);
  const dayMs = 86400000;
  const midOf = (dt: Date) => Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
  const fcMid = midOf(fcBase);
  const todayMid = midOf(kst);

  // 오늘(KST) 기준 이번 주 토/일
  const dow = kst.getUTCDay(); // 0=일
  let toSat = (6 - dow + 7) % 7; if (toSat === 0) toSat = 7; // 오늘이 토요일이면 다음 주 토요일
  const satMid = todayMid + toSat * dayMs;
  const sunMid = satMid + dayMs;
  const nOf = (mid: number) => Math.round((mid - fcMid) / dayMs);
  const label = (mid: number, wd: string) => {
    const d = new Date(mid);
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${wd})`;
  };
  // 토 → 일 순으로 day4~10 범위에 드는 첫 날을 사용
  for (const [mid, wd] of [[satMid, '토'], [sunMid, '일']] as const) {
    const n = nOf(mid);
    if (n >= 4 && n <= 10) return { tmFc, day: n, label: label(mid, wd) };
  }
  // 둘 다 범위를 벗어나면(주말이 너무 가까움) 일요일을 day4로 보정
  return { tmFc, day: 4, label: label(sunMid, '일') };
}

type MidItem = Record<string, string | number>;
async function fetchMid(endpoint: string, regId: string, tmFc: string): Promise<MidItem | null> {
  try {
    const r = await rawGet(midPath(endpoint, regId, tmFc));
    if (r.status !== 200) return null;
    const j = JSON.parse(r.text);
    const items = j?.response?.body?.items?.item;
    return Array.isArray(items) ? items[0] : items ?? null;
  } catch { return null; }
}

export async function GET(req: Request) {
  if (!KEY) return NextResponse.json({ configured: false });
  const { tmFc, day, label } = pickWeekend();

  // 진단용: /api/weather?debug=1 → node:https raw 경로 전송 결과
  if (new URL(req.url).searchParams.get('debug')) {
    const r = await rawGet(midPath('getMidLandFcst', '11B00000', tmFc));
    const ok = r.text.includes('NORMAL_SERVICE');
    const err = r.text.match(/errMsg"?\s*:?\s*"?([A-Z_]+)/)?.[1];
    const j = ok ? JSON.parse(r.text) : null;
    const it = j?.response?.body?.items?.item;
    const first = Array.isArray(it) ? it[0] : it;
    return NextResponse.json({ ver: 'v4-weekend', tmFc, day, label, keyLen: KEY.length, status: r.status, result: ok ? 'OK' : (err ?? r.text.slice(0, 60)), sample: first ? { [`rnSt${day}Am`]: first[`rnSt${day}Am`], [`wf${day}Am`]: first[`wf${day}Am`] } : null });
  }

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
    weekend: label,   // 조회된 주말 날짜 (예: "11/1(일)")
    items: results,
  });
}
