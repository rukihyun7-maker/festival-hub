import { NextResponse } from 'next/server';
import https from 'node:https';

/**
 * 행사 찾기 상단 날씨 스트립 보조 "대기질(미세먼지) 예보" (에어코리아 대기오염정보)
 *  - getMinuDustFrcstDspth: PM2.5/PM10 예보등급(좋음/보통/나쁨/매우나쁨)을 시도별 문자열로 제공
 *  - 예보는 오늘~모레(글피) 범위라 주말(day4)까지는 닿지 않음 → "가장 먼(최신) 예보일" 등급을 대표로 사용
 * env: DATA_GO_KR_KEY (기상청 중기예보와 동일 키 · 단, 에어코리아 서비스 '활용신청'이 별도로 필요)
 * 키 미설정/미승인 시 { configured:false } → 프런트는 조용히 숨김.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const preferredRegion = 'icn1';

const KEY = (process.env.DATA_GO_KR_KEY ?? '').trim();
const HOST = 'apis.data.go.kr';
const BASE = '/B552584/ArpltnInforInqireSvc';

/** node:https 원시 경로 전송 (fetch/undici의 %2B→+ 변형 우회) */
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

function frcstPath(informCode: 'PM25' | 'PM10'): string {
  return `${BASE}/getMinuDustFrcstDspth?serviceKey=${KEY}&returnType=json&numOfRows=100&pageNo=1&informCode=${informCode}&ver=1.0`;
}

type Frcst = { informData: string; informGrade: string; informOverall?: string; dataTime?: string };
async function fetchFrcst(informCode: 'PM25' | 'PM10'): Promise<Frcst[] | null> {
  const r = await rawGet(frcstPath(informCode));
  if (r.status !== 200 || !r.text.includes('"items"')) return null;
  try {
    const j = JSON.parse(r.text);
    const items = j?.response?.body?.items;
    return Array.isArray(items) ? items : null;
  } catch { return null; }
}

/** "서울 : 보통,인천 : 나쁨,..." → { 서울:'보통', 인천:'나쁨' } */
function parseGrade(informGrade: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (informGrade ?? '').split(',')) {
    const [k, v] = part.split(':').map((s) => s.trim());
    if (k && v) out[k] = v;
  }
  return out;
}

export async function GET(req: Request) {
  if (!KEY) return NextResponse.json({ configured: false });

  const pm25 = await fetchFrcst('PM25');

  // 진단용: /api/airquality?debug=1
  if (new URL(req.url).searchParams.get('debug')) {
    const r = await rawGet(frcstPath('PM25'));
    const ok = r.text.includes('"items"');
    const err = r.text.match(/(?:errMsg|returnReasonCode|resultMsg)"?\s*:?\s*"?([A-Z_0-9 ]+)/)?.[1];
    const gi = r.text.indexOf('informGrade');
    const oi = r.text.indexOf('informOverall');
    return NextResponse.json({
      ver: 'aq-v3', keyLen: KEY.length, status: r.status,
      result: ok ? 'OK' : (err ?? r.text.slice(0, 120)),
      hasGrade: gi >= 0, hasOverall: oi >= 0,
      gradeSnippet: gi >= 0 ? r.text.slice(gi, gi + 320) : null,
      tail: r.text.slice(1400, 1900),
    });
  }

  if (!pm25 || !pm25.length) return NextResponse.json({ configured: false });

  // 가장 먼(최신) 예보대상일 = 주말에 가장 가까운 날
  const latest = [...pm25].sort((a, b) => (a.informData < b.informData ? 1 : -1))[0];
  const grades = parseGrade(latest.informGrade);

  return NextResponse.json({
    configured: true,
    informData: latest.informData,     // 예보 대상일 (YYYY-MM-DD)
    grades,                            // 지역명 → 등급
  });
}
