import { NextResponse } from 'next/server';

/**
 * 행사 주소 → 좌표 + 반경 1km 상권 요약 (서버 · 카카오 로컬)
 * 키는 서버 env(KAKAO_REST_KEY)에만 보관 → 클라이언트 비노출.
 * POST { address, region, name } → { lat, lng, summary: {apartment, university, transit, commercial} }
 */

const RADIUS = 1000;

async function kakao(key: string, path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(`https://dapi.kakao.com/v2/local/search/${path}.json?${qs}`, {
    headers: { Authorization: 'KakaoAK ' + key },
    cache: 'no-store',
  });
  if (!r.ok) return [] as any[];
  const j = await r.json();
  return (j.documents ?? []) as any[];
}

export async function POST(req: Request) {
  const key = process.env.KAKAO_REST_KEY;
  if (!key) return NextResponse.json({ error: 'KAKAO_REST_KEY 미설정' }, { status: 500 });

  let body: { address?: string; region?: string; name?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad body' }, { status: 400 }); }
  const { address, region, name } = body;

  // 1) 좌표: 주소검색 → 주소 키워드검색 → 지역+행사명 키워드
  const tries: [string, string][] = [];
  if (address) { tries.push(['address', address]); tries.push(['keyword', address]); }
  if (region || name) tries.push(['keyword', `${region ?? ''} ${name ?? ''}`.trim()]);
  let lat: number | null = null, lng: number | null = null;
  for (const [path, query] of tries) {
    if (!query) continue;
    const docs = await kakao(key, path, { query });
    const d = docs[0];
    if (d?.x && d?.y) { lat = parseFloat(d.y); lng = parseFloat(d.x); break; }
  }
  if (lat == null || lng == null) return NextResponse.json({ lat: null, lng: null, summary: null });

  // 2) 반경 1km 상권 요약
  const base = { x: String(lng), y: String(lat), radius: String(RADIUS), sort: 'distance', size: '15' };
  const [apts, schools, subs, marts] = await Promise.all([
    kakao(key, 'keyword', { ...base, query: '아파트' }),
    kakao(key, 'category', { ...base, category_group_code: 'SC4' }),
    kakao(key, 'category', { ...base, category_group_code: 'SW8' }),
    kakao(key, 'category', { ...base, category_group_code: 'MT1' }),
  ]);
  const apartment = apts.filter((d) => (d.category_name || '').includes('주거시설') && (d.category_name || '').includes('아파트') && !(d.category_name || '').includes('아파트 동')).length;
  const university = schools.filter((d) => (d.place_name || '').includes('대학교') && !/초등|중학교|고등/.test(d.place_name || '')).length;
  const transit = subs.length;
  const commercial = marts.length;

  return NextResponse.json({ lat, lng, summary: { apartment, university, transit, commercial } });
}
