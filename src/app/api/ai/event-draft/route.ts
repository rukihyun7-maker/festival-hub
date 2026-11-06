import { NextResponse } from 'next/server';

/**
 * AI 공고 초안 · 붙여넣은 모집 글(단톡/문서/지자체 공고)에서 행사 공고 필드를 추출.
 *  - Anthropic Messages API 직접 호출(서버) · 구조화 JSON 반환
 *  - 결과는 "초안"이며, 주최자가 검토·수정 후 등록(자동 등록 아님)
 * env: ANTHROPIC_API_KEY (미설정 시 { configured:false })
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const KEY = (process.env.ANTHROPIC_API_KEY ?? '').trim();
const REGIONS = ['서울', '경기', '인천', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '부산', '대구', '광주', '대전', '울산', '제주', '세종'];

const SYSTEM = `너는 한국 야외행사(축제·플리마켓·푸드트럭) '입점 파트너 모집공고'에서 구조화 정보를 추출하는 도우미다.
주어진 모집 글(단톡방/문서/지자체 공고 등)을 읽고, 아래 JSON 스키마에 맞춰 값을 채워 **JSON만** 출력한다. 설명·코드블록(\`\`\`) 없이 순수 JSON 객체 하나만.

규칙:
- 원문에 없는 사실을 지어내지 말 것. 모르면 문자열은 "", 숫자는 0, boolean은 false.
- 날짜는 "YYYY-MM-DD" 형식. 연도가 없으면 올해 기준으로 추정하되 불확실하면 "".
- region 은 반드시 다음 중 하나: ${REGIONS.join(', ')} (주소에서 시도를 판별)
- fee: 1일 참가비(원, 숫자만). fee_rate: 매출 수수료(%, 숫자). 둘 다 없으면 0.
- electric/water/gas/parking: 전기/수도/가스/주차 제공 여부(boolean). 명시 없으면 false.
- description: 입력 글을 바탕으로 입점 파트너가 읽기 좋게 정돈한 공고 본문을 3~6문장으로. 과장·허위 금지, 원문에 없는 혜택 추가 금지.

스키마:
{"name":"행사명","category":"","organizer":"주최","start_date":"","end_date":"","region":"","address":"상세주소","visitors":"예상 방문객","capacity":"모집 규모/대수","fee":0,"fee_rate":0,"deadline":"신청 마감일","electric":false,"water":false,"gas":false,"parking":false,"description":""}`;

function extractJson(s: string): Record<string, unknown> | null {
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

export async function POST(req: Request) {
  if (!KEY) return NextResponse.json({ configured: false });
  let text = '';
  try { text = String((await req.json())?.text ?? ''); } catch { /* no-op */ }
  text = text.slice(0, 8000).trim();
  if (text.length < 5) return NextResponse.json({ configured: true, error: '모집 글을 붙여넣어 주세요.' }, { status: 400 });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-opus-5-5',
        max_tokens: 1500,
        output_config: { effort: 'low' },
        system: SYSTEM,
        messages: [{ role: 'user', content: text }],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return NextResponse.json({ configured: true, error: `AI 처리 오류 (${r.status})`, detail: t.slice(0, 160) }, { status: 502 });
    }
    const j = await r.json();
    const out = (j.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n');
    const fields = extractJson(out);
    if (!fields) return NextResponse.json({ configured: true, error: 'AI 응답을 해석하지 못했습니다. 다시 시도해 주세요.' }, { status: 502 });
    return NextResponse.json({ configured: true, fields });
  } catch (e) {
    return NextResponse.json({ configured: true, error: (e as Error).message }, { status: 502 });
  }
}
