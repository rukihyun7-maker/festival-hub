'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

/**
 * 회원가입 · 디자인 시스템 v2.0
 * 공개 가입 역할은 입점 파트너 / 행사 주최만 (관리자는 셀프가입 불가).
 * 입점 파트너는 가입 후 관리자 '가입 심사'를 거쳐 신청 가능.
 */

const ROLES = [
  { id: 'seller', mark: '입', label: '입점 파트너', desc: '푸드트럭·음식부스 사업자' },
  { id: 'host', mark: '주', label: '행사 주최', desc: '축제·팝업·플리마켓 운영' },
] as const;

const MAX_UPLOAD_MB = 10;
/** 업로드 파일 검증 (용량·형식) · null이면 통과 */
function fileError(f: File): string | null {
  if (f.size > MAX_UPLOAD_MB * 1024 * 1024) return `파일이 너무 큽니다 (최대 ${MAX_UPLOAD_MB}MB)`;
  if (!/^image\//.test(f.type) && f.type !== 'application/pdf') return '이미지 또는 PDF 파일만 업로드할 수 있습니다';
  return null;
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'seller' | 'host'>('seller');
  // 주최 명함 정보
  const [orgName, setOrgName] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [cardFile, setCardFile] = useState<File | null>(null);
  // 입점 파트너 사업자등록증
  const [bizNo, setBizNo] = useState('');
  const [bizFile, setBizFile] = useState<File | null>(null);
  // 약관 동의
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needConfirm, setNeedConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!agreeTerms || !agreePrivacy) {
      setError('이용약관과 개인정보 수집·이용에 동의해 주세요. (필수)');
      return;
    }
    if (role === 'seller' && !bizFile) {
      setError('사업자등록증 파일을 첨부해 주세요. (가입 필수)');
      return;
    }
    if (bizFile) { const fe = fileError(bizFile); if (fe) { setError(fe); return; } }
    if (cardFile) { const fe = fileError(cardFile); if (fe) { setError(fe); return; } }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    // 이메일 확인이 켜져 있으면 세션이 없음 → 안내 표시
    if (!data.session) {
      setLoading(false);
      setNeedConfirm(true);
      return;
    }
    const uid = data.session.user.id;

    // 주최: 명함 정보 저장 / 입점 파트너: 사업자등록증 업로드 + 사업자번호
    try {
      if (role === 'host') {
        let cardPath: string | null = null;
        if (cardFile) {
          try {
            const safeC = cardFile.name.replace(/[^a-zA-Z0-9._가-힣-]/g, '_');
            const cp = `${uid}/business_card/${Date.now()}_${safeC}`;
            const { error: cErr } = await supabase.storage.from('documents').upload(cp, cardFile, { cacheControl: '3600', upsert: false });
            if (!cErr) cardPath = cp;
          } catch { /* 명함 이미지는 선택 · 실패해도 진행 */ }
        }
        await supabase
          .from('profiles')
          .update({ business_name: orgName, position, phone, ...(cardPath ? { business_card_url: cardPath } : {}) })
          .eq('id', uid);
      } else if (role === 'seller' && bizFile) {
        const safe = bizFile.name.replace(/[^a-zA-Z0-9._가-힣-]/g, '_');
        const path = `${uid}/business_reg/${Date.now()}_${safe}`;
        const { error: upErr } = await supabase.storage.from('documents').upload(path, bizFile, { cacheControl: '3600', upsert: false });
        if (upErr) throw upErr;
        await supabase.from('documents').upsert(
          { seller_id: uid, kind: 'business_reg', file_name: bizFile.name, file_url: path, status: 'pending' },
          { onConflict: 'seller_id,kind' }
        );
        if (bizNo) await supabase.from('profiles').update({ business_no: bizNo }).eq('id', uid);
      }
    } catch (err) {
      setLoading(false);
      setError('사업자등록증 업로드에 실패했습니다: ' + (err as Error).message + ' · 로그인 후 [필수 서류]에서 다시 등록해 주세요.');
      return;
    }

    setLoading(false);
    router.push(role === 'host' ? '/host' : '/dashboard');
  }

  if (needConfirm) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-page">
        <div className="card w-full max-w-[440px] text-center">
          <div className="text-[40px] mb-3">✓</div>
          <div className="t-section mb-2">가입 신청 완료</div>
          <div className="t-sub mb-5">
            <b>{email}</b> 로 인증 메일을 보냈습니다. 메일의 링크를 눌러 인증을 마치면 로그인할 수 있어요.
          </div>
          <Link href="/login" className="btn-primary inline-flex">로그인으로 이동</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-page">
      <div className="card w-full max-w-[440px]">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-[8px] bg-ink flex items-center justify-center">
            <span className="text-accent font-extrabold text-[14px] leading-none">F</span>
          </div>
          <span className="font-extrabold text-[15px] tracking-[-0.02em] text-ink">Festival Hub</span>
        </div>
        <h1 className="t-title mb-1">회원가입</h1>
        <p className="t-sub mb-6">역할을 선택하고 1분 만에 시작하세요.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 역할 선택 */}
          <div>
            <span className="text-[12px] font-semibold text-ink-soft block mb-2">역할</span>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => {
                const on = role === r.id;
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className="text-left p-3 rounded-input border-2 transition-colors"
                    style={{
                      borderColor: on ? 'var(--ink, #14120E)' : 'var(--line, #E7E2D6)',
                      background: on ? 'var(--bg-surface-sunken, #FDFBF6)' : 'transparent',
                    }}
                  >
                    <div className="w-8 h-8 rounded-[9px] flex items-center justify-center font-extrabold text-[13px] text-ink mb-2" style={{ background: 'var(--warning-bg, #FFF3C4)' }}>{r.mark}</div>
                    <div className="text-[14px] font-bold text-ink">{r.label}</div>
                    <div className="text-[11px] text-text-tertiary mt-0.5">{r.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-ink-soft">{role === 'host' ? '담당자 이름' : '이름 / 담당자'}</span>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="홍길동" />
          </label>

          {/* 주최 명함 정보 (가입 즉시 행사 등록 가능) */}
          {role === 'host' && (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-ink-soft">소속 (주최사·기관·단체명)</span>
                <input type="text" required value={orgName} onChange={(e) => setOrgName(e.target.value)} className="input" placeholder="예: 서울숲재단" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-ink-soft">직함 / 부서</span>
                  <input type="text" required value={position} onChange={(e) => setPosition(e.target.value)} className="input" placeholder="예: 사업팀 매니저" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-ink-soft">담당자 연락처</span>
                  <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="010-0000-0000" />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-ink-soft">명함 이미지 <span className="text-text-tertiary font-normal">(선택 · 신뢰도↑)</span></span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setCardFile(e.target.files?.[0] ?? null)}
                  className="text-[12px] file:mr-3 file:py-2 file:px-3 file:rounded-input file:border-0 file:bg-ink file:text-accent file:font-bold file:text-[12px] file:cursor-pointer"
                />
                {cardFile && <span className="text-[11px] text-success">첨부됨: {cardFile.name}</span>}
              </label>
            </>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-ink-soft">이메일</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-ink-soft">비밀번호</span>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="6자 이상" />
          </label>

          {/* 입점 파트너 사업자등록증 (가입 필수) */}
          {role === 'seller' && (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-ink-soft">사업자등록번호</span>
                <input type="text" value={bizNo} onChange={(e) => setBizNo(e.target.value)} className="input" placeholder="000-00-00000" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-ink-soft">사업자등록증 첨부 <span className="text-danger">*</span></span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  required
                  onChange={(e) => setBizFile(e.target.files?.[0] ?? null)}
                  className="text-[12px] file:mr-3 file:py-2 file:px-3 file:rounded-input file:border-0 file:bg-ink file:text-accent file:font-bold file:text-[12px] file:cursor-pointer"
                />
                {bizFile && <span className="text-[11px] text-success">첨부됨: {bizFile.name}</span>}
              </label>
            </>
          )}

          {role === 'seller' ? (
            <div className="text-[12px] text-text-secondary leading-relaxed p-3 rounded-input" style={{ background: 'var(--info-soft, #F4F7FE)' }}>
              사업자등록증만 첨부하면 <b>바로 가입</b>됩니다. 가입 후 <b>필수 서류를 모두 등록·관리자 승인</b>을 마치면 행사 찾기·신청을 이용할 수 있습니다.
            </div>
          ) : (
            <div className="text-[12px] text-text-secondary leading-relaxed p-3 rounded-input" style={{ background: 'var(--info-soft, #F4F7FE)' }}>
              명함 정보만으로 <b>가입 즉시 행사를 등록</b>할 수 있습니다. 등록한 행사는 <b>관리자 검수 후 공개</b>되며, 검증된 입점 파트너의 신청을 받게 됩니다.
            </div>
          )}

          {/* 약관 동의 (필수) */}
          <div className="flex flex-col gap-2 p-3 rounded-input" style={{ background: 'var(--bg-surface-sunken, #FDFBF6)' }}>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-0.5 accent-[#14120E]" />
              <span className="text-[12px] text-text-secondary leading-relaxed">
                <span className="font-bold text-ink">[필수]</span>{' '}
                <Link href="/terms" target="_blank" className="text-info font-semibold underline">이용약관</Link>에 동의합니다
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} className="mt-0.5 accent-[#14120E]" />
              <span className="text-[12px] text-text-secondary leading-relaxed">
                <span className="font-bold text-ink">[필수]</span>{' '}
                <Link href="/privacy" target="_blank" className="text-info font-semibold underline">개인정보 수집·이용</Link>에 동의합니다
              </span>
            </label>
          </div>

          {error && (
            <div className="text-[12px] p-3 rounded-input badge-danger" style={{ display: 'block' }}>{error}</div>
          )}

          <button type="submit" disabled={loading || !agreeTerms || !agreePrivacy} className="btn-primary w-full">
            {loading ? '가입 중…' : '무료로 시작하기'}
          </button>
        </form>

        <p className="text-center text-[12px] text-text-tertiary mt-6">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-ink font-bold hover:underline">로그인</Link>
        </p>
      </div>
    </main>
  );
}
