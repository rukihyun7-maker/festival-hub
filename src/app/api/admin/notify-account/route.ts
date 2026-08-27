import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 가입 승인/반려 안내 메일 발송 (관리자 전용)
 * POST { userId, decision: 'approved'|'rejected', reason? }
 * - 관리자 세션 검증 → 대상 프로필 이메일 조회 → Resend REST로 발송
 * - RESEND_API_KEY 미설정이면 발송 건너뜀(계정 상태 변경은 그대로 성공 처리)
 * 필요 env: RESEND_API_KEY, (선택) EMAIL_FROM (기본 noreply@festivalhub.co.kr)
 */
export const dynamic = 'force-dynamic';

const APP_URL = 'https://festivalhub.co.kr';

function buildEmail(decision: 'approved' | 'rejected', roleLabel: string, name: string, reason?: string) {
  const brand = '#C9622E';
  const wrap = (inner: string) => `
  <div style="background:#F6F1E7;padding:32px 0;font-family:'Apple SD Gothic Neo',-apple-system,BlinkMacSystemFont,'Malgun Gothic',sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#FFFDF8;border:1px solid #ECE3D2;border-radius:16px;overflow:hidden;">
      <div style="padding:22px 28px;border-bottom:1px solid #F0E9DA;">
        <span style="font-size:17px;font-weight:800;color:#1A140C;">Festival&nbsp;Hub</span>
      </div>
      <div style="padding:28px;">${inner}</div>
      <div style="padding:18px 28px;border-top:1px solid #F0E9DA;color:#9A9182;font-size:11px;line-height:1.6;">
        본 메일은 발신 전용입니다 · Festival Hub · <a href="${APP_URL}" style="color:#9A9182;">${APP_URL.replace('https://', '')}</a>
      </div>
    </div>
  </div>`;

  if (decision === 'approved') {
    return {
      subject: `[Festival Hub] ${roleLabel} 가입이 승인되었습니다`,
      html: wrap(`
        <div style="font-size:19px;font-weight:800;color:#1A140C;margin-bottom:10px;">가입이 승인되었습니다 🎉</div>
        <p style="font-size:14px;color:#4A4436;line-height:1.75;margin:0 0 18px;">
          <b>${name}</b>님, ${roleLabel} 가입 심사가 <b style="color:${brand};">승인</b>되었습니다.
          이제 로그인하여 서비스를 이용하실 수 있습니다.
        </p>
        <a href="${APP_URL}/login" style="display:inline-block;background:${brand};color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px;">로그인하기 →</a>
      `),
    };
  }
  return {
    subject: `[Festival Hub] ${roleLabel} 가입 심사 결과 안내`,
    html: wrap(`
      <div style="font-size:19px;font-weight:800;color:#1A140C;margin-bottom:10px;">가입 심사 결과 안내</div>
      <p style="font-size:14px;color:#4A4436;line-height:1.75;margin:0 0 14px;">
        <b>${name}</b>님, 안타깝게도 ${roleLabel} 가입이 <b style="color:#B4472E;">반려</b>되었습니다.
      </p>
      ${reason ? `<div style="background:#FBF3EC;border:1px solid #F0DAC9;border-radius:10px;padding:12px 14px;font-size:13px;color:#6A5140;line-height:1.7;margin:0 0 16px;"><b>사유</b><br/>${reason.replace(/</g, '&lt;')}</div>` : ''}
      <p style="font-size:13px;color:#6A6152;line-height:1.75;margin:0;">
        정보를 보완하여 재신청하시거나, 문의사항은 본 메일에 회신 대신 고객센터로 연락해 주세요.
      </p>
    `),
  };
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (me?.role !== 'admin') return NextResponse.json({ error: '관리자만 가능합니다' }, { status: 403 });

  let body: { userId?: string; decision?: string; reason?: string } = {};
  try { body = await req.json(); } catch { /* no body */ }
  const { userId, decision, reason } = body;
  if (!userId || (decision !== 'approved' && decision !== 'rejected')) {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }

  const { data: target } = await supabase
    .from('profiles').select('email, name, business_name, role').eq('id', userId).maybeSingle();
  if (!target?.email) return NextResponse.json({ error: '대상 이메일을 찾을 수 없습니다' }, { status: 404 });

  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ ok: true, skipped: true, note: 'RESEND_API_KEY 미설정 — 메일 미발송' });

  const from = process.env.EMAIL_FROM || 'Festival Hub <noreply@festivalhub.co.kr>';
  const roleLabel = target.role === 'host' ? '행사 주최' : '입점 파트너';
  const name = target.business_name || target.name || '회원';
  const { subject, html } = buildEmail(decision, roleLabel, name, reason);

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [target.email], subject, html }),
  });
  const j = await r.json().catch(() => ({} as { message?: string; id?: string }));
  if (!r.ok) return NextResponse.json({ error: 'Resend 발송 실패: ' + (j?.message || r.status) }, { status: 502 });

  return NextResponse.json({ ok: true, id: j?.id });
}
