import { NextResponse } from 'next/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

/**
 * 가입 시 서류 즉시 업로드 (이메일 인증 ON이라 세션이 없을 때)
 * POST multipart: userId, kind('business_reg'|'business_card'), file
 * - 서비스롤로 documents 버킷 업로드 + 기록 → 승인 전에도 관리자가 서류 확인 가능
 * - 가드: 대상이 '가입 심사' 상태여야만 허용(임의 userId 주입 방지)
 * 필요 env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const ALLOWED = new Set(['business_reg', 'business_card']);

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !svc) return NextResponse.json({ error: 'env 미설정' }, { status: 500 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }
  const userId = String(form.get('userId') ?? '');
  const kind = String(form.get('kind') ?? '');
  const file = form.get('file');
  if (!userId || !ALLOWED.has(kind) || !(file instanceof File)) {
    return NextResponse.json({ error: '필수 값 누락' }, { status: 400 });
  }
  if (file.size === 0) return NextResponse.json({ error: '빈 파일' }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: '파일이 너무 큽니다 (최대 10MB)' }, { status: 400 });

  const admin = createAdmin(url, svc, { auth: { persistSession: false, autoRefreshToken: false } });

  // 가드: 방금 가입한 '가입 심사' 계정만 (트리거 지연 대비 1회 재시도)
  let prof: { status?: string } | null = null;
  for (let i = 0; i < 2 && !prof; i++) {
    const { data } = await admin.from('profiles').select('status').eq('id', userId).maybeSingle();
    prof = data;
    if (!prof) await new Promise((r) => setTimeout(r, 400));
  }
  if (!prof) return NextResponse.json({ error: '대상을 찾을 수 없습니다' }, { status: 404 });
  if (prof.status !== '가입 심사') return NextResponse.json({ error: '가입 심사 상태에서만 업로드할 수 있습니다' }, { status: 403 });

  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const path = `${userId}/${kind}/${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage.from('documents').upload(path, buf, { contentType: file.type || undefined, upsert: false });
  if (upErr) return NextResponse.json({ error: '업로드 실패: ' + upErr.message }, { status: 502 });

  if (kind === 'business_reg') {
    const { error: dErr } = await admin.from('documents').upsert(
      { seller_id: userId, kind: 'business_reg', file_name: file.name, file_url: path, status: 'pending' },
      { onConflict: 'seller_id,kind' },
    );
    if (dErr) return NextResponse.json({ error: '문서 기록 실패: ' + dErr.message }, { status: 502 });
  } else {
    await admin.from('profiles').update({ business_card_url: path }).eq('id', userId);
  }
  return NextResponse.json({ ok: true, path });
}
