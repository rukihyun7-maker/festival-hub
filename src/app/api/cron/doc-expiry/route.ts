import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/**
 * 서류 만료 사전 알림 · Vercel Cron 매일 호출
 * status='verified' + 만료일 14일 이내(또는 이미 만료) + 아직 미알림(expiry_notified=false) 서류를
 * 소유 파트너에게 1회 알림 → expiry_notified=true. (재등록 시 트리거가 플래그 리셋 → 다시 알림)
 * 인증: Authorization: Bearer <CRON_SECRET> 또는 ?key=<CRON_SECRET>
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const LABEL: Record<string, string> = {
  business_reg: '사업자등록증', food_hygiene: '식품위생업 신고증', hygiene_edu: '위생교육 이수증',
  booth_exterior: '외부 사진', booth_interior: '내부 사진', booth_storage: '공간 사진', insurance: '영업배상책임보험',
};

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  const keyParam = new URL(req.url).searchParams.get('key');
  if (!secret || (auth !== `Bearer ${secret}` && keyParam !== secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !svc) return NextResponse.json({ error: 'env 미설정' }, { status: 500 });

  const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } });

  const today = new Date();
  const soon = new Date(today.getTime() + 14 * 86400000).toISOString().slice(0, 10);

  // 만료 14일 이내 + 미알림 서류
  const { data: docs, error } = await admin
    .from('documents')
    .select('id, seller_id, kind, expires_at')
    .eq('status', 'verified')
    .eq('expiry_notified', false)
    .not('expires_at', 'is', null)
    .lte('expires_at', soon);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let notified = 0;
  for (const d of docs ?? []) {
    const label = LABEL[d.kind] ?? d.kind;
    const exp = new Date(d.expires_at + 'T00:00:00');
    const days = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
    const msg = days < 0 ? `「${label}」이(가) 만료되었습니다. 갱신 후 재등록해 주세요.`
      : `「${label}」이(가) ${days}일 후 만료됩니다. 미리 갱신해 주세요.`;
    await admin.from('notifications').insert({ user_id: d.seller_id, kind: 'docs', title: '서류 만료 안내', body: msg });
    await admin.from('documents').update({ expiry_notified: true }).eq('id', d.id);
    notified++;
  }

  return NextResponse.json({ ok: true, checked: docs?.length ?? 0, notified });
}
