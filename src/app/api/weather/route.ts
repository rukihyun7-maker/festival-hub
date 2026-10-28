import { NextResponse } from 'next/server';
import https from 'node:https';

/**
 * 홈 "내 지역 7일 날씨" (기상청 단기예보 + 중기예보 병합)
 *  - 단기예보(getVilageFcst): 오늘~+3일, 동네예보(격자 nx/ny) · 상세
 *  - 중기육상예보(getMidLandFcst)/중기기온(getMidTa): +3~+10일 · 시도 단위
 *  → 요청 시도(sido)의 오늘~6일 후(7일) 일별 예보를 합쳐 반환.
 * env: DATA_GO_KR_KEY (data.go.kr 일반 인증키)
 *  · 중기예보/단기예보는 각각 별도 '활용신청'이 필요. 단기 미승인 시 중기 구간(d3~)만 자동 표시.
 * 키 미설정 시 { configured:false } → 프런트는 조용히 숨김.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
// data.go.kr(국내 공공 API)는 해외 리전 호출을 거부하는 경우가 있어 서울 리전에서 실행
export const preferredRegion = 'icn1';

const KEY = (process.env.DATA_GO_KR_KEY ?? '').trim();
const HOST = 'apis.data.go.kr';

/**
 * node:https로 경로를 "그대로" 전송 (fetch/undici가 인증키의 %2B를 +로 변형하는 문제 우회).
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

// 시도 → 중기육상 regId / 중기기온 regId / 단기예보 대표도시 격자(nx,ny)
const REGIONS: { sido: string; land: string; ta: string; nx: number; ny: number }[] = [
  { sido: '서울', land: '11B00000', ta: '11B10101', nx: 60, ny: 127 },
  { sido: '인천', land: '11B00000', ta: '11B20201', nx: 55, ny: 124 },
  { sido: '경기', land: '11B00000', ta: '11B20601', nx: 60, ny: 121 }, // 수원
  { sido: '강원', land: '11D10000', ta: '11D10301', nx: 73, ny: 134 }, // 춘천(영서)
  { sido: '충북', land: '11C10000', ta: '11C10301', nx: 69, ny: 106 }, // 청주
  { sido: '충남', land: '11C20000', ta: '11C20401', nx: 55, ny: 94 },  // 홍성
  { sido: '대전', land: '11C20000', ta: '11C20401', nx: 67, ny: 100 },
  { sido: '세종', land: '11C20000', ta: '11C20404', nx: 66, ny: 103 },
  { sido: '전북', land: '11F10000', ta: '11F10201', nx: 63, ny: 89 },  // 전주
  { sido: '전남·광주', land: '11F20000', ta: '11F20501', nx: 58, ny: 74 }, // 광주
  { sido: '경북', land: '11H10000', ta: '11H10701', nx: 89, ny: 91 },  // 대구권
  { sido: '대구', land: '11H10000', ta: '11H10701', nx: 89, ny: 90 },
  { sido: '경남', land: '11H20000', ta: '11H20201', nx: 91, ny: 77 },  // 창원
  { sido: '부산', land: '11H20000', ta: '11H20201', nx: 98, ny: 76 },
  { sido: '울산', land: '11H20000', ta: '11H20101', nx: 102, ny: 84 },
  { sido: '제주', land: '11G00000', ta: '11G00201', nx: 52, ny: 38 },
];

/** UTC 타임스탬프를 +9h 이동한 Date (KST 벽시계를 getUTC*로 읽기 위함 · 서버 TZ 무관) */
function kstNow(): Date { return new Date(Date.now() + 9 * 3600 * 1000); }
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (dt: Date) => `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}`;
const midOf = (dt: Date) => Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
const DAY = 86400000;

// ── 단기예보(동네예보) ─────────────────────────────────────────────
const VIL_BASE_TIMES = [2300, 2000, 1700, 1400, 1100, 800, 500, 200];
/** 가장 최근 발표회차(발표 후 약 15분 지연 반영) · KST */
function latestVilageBase(): { date: string; time: string } {
  const kst = kstNow();
  const hm = kst.getUTCHours() * 100 + kst.getUTCMinutes();
  for (const t of VIL_BASE_TIMES) {
    if (hm >= t + 15) return { date: ymd(kst), time: pad(Math.floor(t / 100)) + '00' };
  }
  const y = new Date(kst.getTime() - DAY);
  return { date: ymd(y), time: '2300' };
}
function vilPath(nx: number, ny: number, baseDate: string, baseTime: string): string {
  return `/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${KEY}&numOfRows=900&pageNo=1&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;
}
/** 강수형태(PTY)/하늘(SKY) 코드 → 한글 날씨 */
function skyText(pty: string, sky: string): string {
  switch (Number(pty)) {
    case 1: return '비';
    case 2: return '비/눈';
    case 3: return '눈';
    case 4: return '소나기';
  }
  switch (Number(sky)) {
    case 1: return '맑음';
    case 3: return '구름많음';
    case 4: return '흐림';
  }
  return '맑음';
}
type DayAgg = { tmin: number | null; tmax: number | null; rain: number | null; sky: string };
/** 단기예보 응답을 fcstDate(YYYYMMDD) → 일별 요약으로 집계 */
async function fetchVilage(nx: number, ny: number): Promise<Record<string, DayAgg>> {
  const { date, time } = latestVilageBase();
  const r = await rawGet(vilPath(nx, ny, date, time));
  if (r.status !== 200) return {};
  let j: unknown;
  try { j = JSON.parse(r.text); } catch { return {}; }
  const items = (j as { response?: { body?: { items?: { item?: unknown } } } })?.response?.body?.items?.item;
  if (!Array.isArray(items)) return {};

  type Bucket = { pops: number[]; temps: number[]; tmn?: number; tmx?: number; skies: Record<string, string>; ptys: Record<string, string> };
  const byDate: Record<string, Bucket> = {};
  for (const raw of items) {
    const it = raw as { fcstDate: string; fcstTime: string; category: string; fcstValue: string };
    const b = (byDate[it.fcstDate] ??= { pops: [], temps: [], skies: {}, ptys: {} });
    const v = it.fcstValue;
    switch (it.category) {
      case 'POP': b.pops.push(Number(v)); break;
      case 'TMN': b.tmn = Number(v); break;
      case 'TMX': b.tmx = Number(v); break;
      case 'TMP': b.temps.push(Number(v)); break;
      case 'SKY': b.skies[it.fcstTime] = v; break;
      case 'PTY': b.ptys[it.fcstTime] = v; break;
    }
  }
  // 낮 대표시각(1400→1200→1500 순)
  const pickMid = (m: Record<string, string>): string | undefined => m['1400'] ?? m['1200'] ?? m['1500'] ?? Object.values(m)[0];
  const out: Record<string, DayAgg> = {};
  for (const [d, b] of Object.entries(byDate)) {
    out[d] = {
      rain: b.pops.length ? Math.max(...b.pops) : null,
      tmin: b.tmn ?? (b.temps.length ? Math.min(...b.temps) : null),
      tmax: b.tmx ?? (b.temps.length ? Math.max(...b.temps) : null),
      sky: skyText(pickMid(b.ptys) ?? '0', pickMid(b.skies) ?? '1'),
    };
  }
  return out;
}

// ── 중기예보 ──────────────────────────────────────────────────────
type MidItem = Record<string, string | number>;
function midPath(endpoint: string, regId: string, tmFc: string): string {
  return `/1360000/MidFcstInfoService/${endpoint}?serviceKey=${KEY}&numOfRows=10&pageNo=1&dataType=JSON&regId=${regId}&tmFc=${tmFc}`;
}
async function fetchMid(endpoint: string, regId: string, tmFc: string): Promise<MidItem | null> {
  const r = await rawGet(midPath(endpoint, regId, tmFc));
  if (r.status !== 200) return null;
  try {
    const j = JSON.parse(r.text);
    const items = j?.response?.body?.items?.item;
    return Array.isArray(items) ? items[0] : items ?? null;
  } catch { return null; }
}
/** 06시 발표(+3~10일 제공) · 07시 이후면 오늘, 아니면 어제 06시 */
function tmFc06(): { tmFc: string; baseMid: number } {
  const kst = kstNow();
  const base = kst.getUTCHours() >= 7 ? kst : new Date(kst.getTime() - DAY);
  return { tmFc: ymd(base) + '0600', baseMid: midOf(base) };
}

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

export async function GET(req: Request) {
  if (!KEY) return NextResponse.json({ configured: false });
  const sido = new URL(req.url).searchParams.get('sido') || '서울';
  const reg = REGIONS.find((r) => r.sido === sido) ?? REGIONS[0];

  const kst = kstNow();
  const todayMid = midOf(kst);

  const { tmFc, baseMid } = tmFc06();
  // 단기(오늘~+3일) + 중기(+4~+6일)를 병행 조회
  const [vil, land, ta] = await Promise.all([
    fetchVilage(reg.nx, reg.ny),
    fetchMid('getMidLandFcst', reg.land, tmFc),
    fetchMid('getMidTa', reg.ta, tmFc),
  ]);
  const num = (v: unknown) => (v == null || v === '' ? null : Number(v));

  const days = Array.from({ length: 7 }, (_, i) => {
    const m = todayMid + i * DAY;
    const dt = new Date(m);
    const label = `${dt.getUTCMonth() + 1}/${dt.getUTCDate()}`;
    const dow = DOW[dt.getUTCDay()];
    let rain: number | null = null, tmin: number | null = null, tmax: number | null = null, sky = '';

    const vk = vil[ymd(dt)];
    if (vk) {
      rain = vk.rain; tmin = vk.tmin; tmax = vk.tmax; sky = vk.sky;
    } else {
      const N = Math.round((m - baseMid) / DAY); // 중기 발표일 기준 N일 후
      if (N >= 3 && N <= 10) {
        const am = num(land?.[`rnSt${N}Am`] ?? land?.[`rnSt${N}`]);
        const pm = num(land?.[`rnSt${N}Pm`] ?? land?.[`rnSt${N}`]);
        rain = am != null && pm != null ? Math.max(am, pm) : (am ?? pm);
        tmin = num(ta?.[`taMin${N}`]);
        tmax = num(ta?.[`taMax${N}`]);
        sky = (land?.[`wf${N}Am`] ?? land?.[`wf${N}`] ?? '') as string;
      }
    }
    return { date: label, dow, today: i === 0, weekend: dt.getUTCDay() === 0 || dt.getUTCDay() === 6, rain, tmin, tmax, sky };
  });

  return NextResponse.json({
    configured: true,
    sido: reg.sido,
    sidos: REGIONS.map((r) => r.sido),
    shortTerm: Object.keys(vil).length > 0, // 단기예보 승인 여부(오늘~모레 표시 가능)
    days,
  });
}
