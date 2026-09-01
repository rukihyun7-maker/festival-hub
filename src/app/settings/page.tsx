'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { fetchMyProfile, updateProfile } from '@/lib/supabase/queries';
import type { Profile, NotifPrefs, ShareFlags } from '@/lib/types';

/**
 * 설정 · 알림 수신 / 정보 공개 범위
 * - 알림: 앱·이메일 채널 + 종류별 수신 + 마감 사전 알림 기준일
 * - 공개(입점 파트너): 행사 주최 심사 시 노출할 항목 선택
 */

const DEFAULT_NOTIF: NotifPrefs = {
  days: 7, app: true, email: true, deadline: true, review: true, docs: true, new_event: true,
};
const DEFAULT_SHARE: ShareFlags = {
  sales_revenue: true, sales_count: true, biz_no: false, phone: true, vehicle: true, hygiene_gear: true,
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [copied, setCopied] = useState(false);
  const [notif, setNotif] = useState<NotifPrefs>(DEFAULT_NOTIF);
  const [share, setShare] = useState<ShareFlags>(DEFAULT_SHARE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchMyProfile();
        setProfile(p);
        if (p) {
          setNotif({ ...DEFAULT_NOTIF, ...(p.notif_prefs ?? {}) });
          setShare({ ...DEFAULT_SHARE, ...(p.share_flags ?? {}) });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile(profile.id, { notif_prefs: notif, share_flags: share });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      alert('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }

  const role = profile?.role ?? 'seller';

  if (loading) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role={role} />
        <div className="container-app py-12">
          <div className="animate-pulse space-y-4 max-w-[640px]">
            <div className="h-4 bg-muted rounded w-32" />
            <div className="h-8 bg-muted rounded w-2/3" />
            <div className="h-40 bg-muted rounded w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="seller" />
        <div className="container-app py-12">
          <div className="card max-w-[640px]">
            <div className="text-[16px] font-bold text-ink mb-2">로그인이 필요합니다</div>
            <div className="text-[13px] text-text-secondary mb-4">설정을 변경하려면 먼저 로그인하세요.</div>
            <Link href="/login" className="btn-primary inline-flex">로그인</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-page">
      <AppNav role={role} />
      <div className="container-app py-8 max-w-[640px]">
        <div className="mb-6">
          <div className="t-section text-[20px]">설정</div>
          <div className="t-sub mt-1">{role === 'seller' ? '알림 수신과 정보 공개 범위를 관리합니다.' : '알림 수신을 관리합니다.'}</div>
        </div>

        {/* 추천 코드 · 포인트 (입점 파트너) */}
        {role === 'seller' && (
          <section className="card mb-4">
            <div className="flex items-center justify-between gap-3 mb-1">
              <div className="t-section">추천 코드</div>
              <div className="text-[13px] font-bold text-ink">보유 포인트 <span className="text-accent-warm">{(profile.points ?? 0).toLocaleString()}P</span></div>
            </div>
            <div className="t-sub mb-3">지인에게 코드를 공유하고, 지인이 가입 승인되면 <b>10P</b>가 적립됩니다.</div>
            {profile.referral_code ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[16px] font-extrabold tracking-[0.15em] text-ink px-3 py-2.5 rounded-input text-center" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)', border: '1px solid var(--line,#E7DFCE)' }}>{profile.referral_code}</code>
                <button
                  onClick={() => { navigator.clipboard?.writeText(profile.referral_code!).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
                  className="btn-secondary shrink-0 text-[13px]"
                >{copied ? '복사됨 ✓' : '코드 복사'}</button>
              </div>
            ) : (
              <div className="text-[12px] text-text-tertiary p-3 rounded-input" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)' }}>
                가입 승인이 완료되면 나만의 추천 코드가 발급됩니다.
              </div>
            )}
          </section>
        )}

        {/* 알림 채널 */}
        <section className="card mb-4">
          <div className="t-section mb-1">알림 채널</div>
          <div className="t-sub mb-4">받고 싶은 경로를 선택하세요.</div>
          <Toggle label="앱 알림함" desc="앱 안에서 받는 알림" on={notif.app} onChange={(v) => setNotif({ ...notif, app: v })} />
          <Toggle label="이메일" desc={profile.email} on={notif.email} onChange={(v) => setNotif({ ...notif, email: v })} />
        </section>

        {/* 알림 종류 */}
        <section className="card mb-4">
          <div className="t-section mb-1">알림 종류</div>
          <div className="t-sub mb-4">받을 알림 유형을 켜고 끕니다.</div>
          {role === 'admin' ? (
            <>
              <Toggle label="검토 요청 알림" desc="파트너 서류·가입 검토 요청이 들어오면 알림" on={notif.docs} onChange={(v) => setNotif({ ...notif, docs: v })} />
              <Toggle label="행사 승인 요청" desc="주최가 새 행사를 등록해 승인 대기가 생기면 알림" on={notif.review} onChange={(v) => setNotif({ ...notif, review: v })} />
            </>
          ) : (
            <>
              <Toggle label="마감 임박" desc={role === 'host' ? '모집 마감 사전 알림' : '신청·서류 마감 사전 알림'} on={notif.deadline} onChange={(v) => setNotif({ ...notif, deadline: v })} />
              <Toggle label={role === 'host' ? '신청·심사 알림' : '심사 결과'} desc={role === 'host' ? '내 행사 승인·신규 신청자 알림' : '신청 승인·반려 통지'} on={notif.review} onChange={(v) => setNotif({ ...notif, review: v })} />
              {role === 'seller' && (
                <>
                  <Toggle label="서류 상태" desc="검증 결과·만료 예정" on={notif.docs} onChange={(v) => setNotif({ ...notif, docs: v })} />
                  <Toggle label="관심 행사 알림" desc="관심 등록한 행사의 새 소식·변경 알림" on={notif.new_event} onChange={(v) => setNotif({ ...notif, new_event: v })} />
                </>
              )}
              <div className="mt-4 pt-4 border-t border-line-faint">
                <div className="text-[13px] font-bold text-ink mb-2">마감 사전 알림 기준</div>
                <div className="flex gap-2">
                  {[7, 3, 1].map((d) => (
                    <button key={d} onClick={() => setNotif({ ...notif, days: d as 7 | 3 | 1 })} className={`chip ${notif.days === d ? 'selected' : ''}`}>D-{d}</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>

        {/* 정보 공개 (입점 파트너 전용) */}
        {role === 'seller' && (
          <section className="card mb-4">
            <div className="t-section mb-1">정보 공개 범위</div>
            <div className="t-sub mb-4">행사 주최가 신청을 검토할 때 보여줄 항목을 선택하세요. 끄면 주최에게 표시되지 않습니다.</div>
            <Toggle label="매출액" desc="참여이력의 신고 매출" on={!!share.sales_revenue} onChange={(v) => setShare({ ...share, sales_revenue: v })} />
            <Toggle label="판매 건수" desc="참여이력의 판매 건수" on={!!share.sales_count} onChange={(v) => setShare({ ...share, sales_count: v })} />
            <Toggle label="연락처" desc="전화번호" on={!!share.phone} onChange={(v) => setShare({ ...share, phone: v })} />
            <Toggle label="사업자번호" desc="사업자등록번호" on={!!share.biz_no} onChange={(v) => setShare({ ...share, biz_no: v })} />
            <Toggle label="부스·트럭 사진" desc="배수시설·쓰레기 처리 모습까지 포함한 전체 사진" on={!!share.vehicle} onChange={(v) => setShare({ ...share, vehicle: v })} />
            <Toggle label="위생 관리" desc="마스크·위생모 등 착용 여부" on={!!share.hygiene_gear} onChange={(v) => setShare({ ...share, hygiene_gear: v })} />
          </section>
        )}

        <div className="flex items-center gap-3 sticky bottom-0 bg-page/90 backdrop-blur py-3">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? '저장 중…' : '변경사항 저장'}
          </button>
          {saved && <span className="text-[13px] font-semibold text-success">✓ 저장되었습니다</span>}
        </div>
      </div>
    </main>
  );
}

function Toggle({ label, desc, on, onChange }: { label: string; desc?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-line-faint last:border-0">
      <div className="min-w-0 pr-4">
        <div className="text-[14px] font-semibold text-ink">{label}</div>
        {desc && <div className="text-[12px] text-text-tertiary mt-0.5 truncate">{desc}</div>}
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`relative w-[46px] h-[26px] rounded-pill shrink-0 transition-colors ${on ? 'bg-accent' : 'bg-muted'}`}
      >
        <span className={`absolute top-[3px] w-[20px] h-[20px] rounded-full bg-white shadow-sm transition-all ${on ? 'left-[23px]' : 'left-[3px]'}`} />
      </button>
    </div>
  );
}
