import { NextResponse } from 'next/server';
import https from 'node:https';

/**
 * 홈 날씨 위젯 보조 "현재 대기질(미세먼지)" (에어코리아 실시간 시도별 대기정보)
 *  - getCtprvnRltmMesureDnsty: 시도 내 측정소별 실시간 PM10/PM2.5 → 시도 평균·등급으로 요약
 *  - 예보통보(getMinuDustFrcstDspth)는 JSON에서 등급 텍스트가 누락되어 실시간값을 사용(현재 기준)
 * env: DATA_GO_KR_KEY (기상청 중기/단기예보와 동일 키 · 에어코리아 '활용신청' 필요)
 * 키 미설정/미승인/무측정 시 { configured:false } → 프런트는 조용히 숨김.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const preferredRegion = 'icn1';

const KEY = (process.env.DATA_GO_KR_KEY ?? '').trim();
const HOST = 'apis.data.go.kr';

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

// 우리 시도 라벨 → 에어코리아 sidoName (전남·광주는 광주로 조회)
const SIDO_NAME: Record<string, string> = {
  '서울': '서울', '인천': '인천', '경기': '경기', '강원': '강원',
  '충북': '충북', '충남': '충남', '대전': '대전', '세종': '세종',
  '전북': '전북', '전남·광주': '광주', '경북': '경북', '대구': '대구',
  '경남': '경남', '부산': '부산', '울산': '울산', '제주': '제주',
};

function rltmPath(sidoName: string): string {
  return `/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty?serviceKey=${KEY}&returnType=json&numOfRows=100&pageNo=1&sidoName=${encodeURIComponent(sidoName)}&ver=1.0`;
}

// 등급 산정(환경부 기준 구간): [좋음, 보통, 나쁨, 매우나쁨]
const GRADE_LABEL = ['좋음', '보통', '나쁨', '매우나쁨'];
function pm25Grade(v: number): number { return v <= 15 ? 0 : v <= 35 ? 1 : v <= 75 ? 2 : 3; }
function pm10Grade(v: number): number { return v <= 30 ? 0 : v <= 80 ? 1 : v <= 150 ? 2 : 3; }

function avg(nums: number[]): number | null {
  const ok = nums.filter((n) => Number.isFinite(n));
  return ok.length ? Math.round(ok.reduce((a, b) => a + b, 0) / ok.length) : null;
}

export async function GET(req: Request) {
  if (!KEY) return NextResponse.json({ configured: false });
  const sido = new URL(req.url).searchParams.get('sido') || '서울';
  const sidoName = SIDO_NAME[sido] ?? '서울';

  const r = await rawGet(rltmPath(sidoName));
  if (r.status !== 200) return NextResponse.json({ configured: false });
  let items: Array<Record<string, string>> = [];
  try {
    const j = JSON.parse(r.text);
    const it = j?.response?.body?.items;
    items = Array.isArray(it) ? it : [];
  } catch { return NextResponse.json({ configured: false }); }

  // 측정소별 값 집계(결측 '-'/null 제외)
  const toNum = (v: string | undefined) => { const n = Number(v); return v && v !== '-' && Number.isFinite(n) ? n : NaN; };
  const pm25 = avg(items.map((x) => toNum(x.pm25Value)));
  const pm10 = avg(items.map((x) => toNum(x.pm10Value)));
  const dataTime = items.find((x) => x.dataTime)?.dataTime ?? null;

  if (new URL(req.url).searchParams.get('debug')) {
    return NextResponse.json({
      ver: 'aq-rltm2', sidoName, status: r.status, count: items.length, pm25, pm10, dataTime,
      itemSidos: [...new Set(items.map((x) => x.sidoName))].slice(0, 20),
      station0: items[0]?.stationName ?? null,
      reqTail: rltmPath(sidoName).slice(-80),
    });
  }

  if (pm25 == null && pm10 == null) return NextResponse.json({ configured: false });

  return NextResponse.json({
    configured: true,
    sido,
    dataTime,
    pm25: pm25 != null ? { value: pm25, grade: pm25Grade(pm25), label: GRADE_LABEL[pm25Grade(pm25)] } : null,
    pm10: pm10 != null ? { value: pm10, grade: pm10Grade(pm10), label: GRADE_LABEL[pm10Grade(pm10)] } : null,
  });
}
