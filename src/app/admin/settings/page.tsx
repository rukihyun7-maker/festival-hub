'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { fetchMyProfile, fetchPlatformSettings, updatePlatformSettings, fetchLandingRefCounts } from '@/lib/supabase/queries';
import { EVENT_CATEGORIES } from '@/components/EventForm';
import type { Profile, PlatformSettings, PublicScope } from '@/lib/types';

/**
 * 플랫폼 설정 (관리자 · 설계 12)
 * 평점 정책 스위치 4종 + 공개 범위 + 공개 최소 평가 수
 */

const SCOPES: PublicScope[] = ['전체 공개', '행사 주최에게만', '비공개'];
const MIN_REVIEWS = [1, 2, 3, 5];

export default function AdminSettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [s, setS] = useState<PlatformSettings | null>(null);
  const [ref, setRef] = useState<{ partners: number; events: number; recruiting: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchMyProfile();
        setProfile(p);
        if (p?.role === 'admin') {
          setS(await fetchPlatformSettings());
          fetchLandingRefCounts().then(setRef).catch(() => {});
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function patch(p: Partial<PlatformSettings>) {
    setS((prev) => (prev ? { ...prev, ...p } : prev));
  }

  async function save() {
    if (!s) return;
    setSaving(true);
    setSaved(false);
    try {
      const { id, updated_at, ...rest } = s;
      void id; void updated_at;
      await updatePlatformSettings(rest);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      alert('저장 실패: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="admin" />
        <div className="container-app py-12">
          <div className="animate-pulse space-y-4 max-w-[640px]">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-40 bg-muted rounded w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="admin" />
        <div className="container-app py-12">
          <div className="card max-w-[640px]">
            <div className="text-[16px] font-bold text-ink mb-2">관리자 계정으로 로그인이 필요합니다</div>
            <Link href="/login" className="btn-primary inline-flex mt-2">로그인</Link>
          </div>
        </div>
      </main>
    );
  }

  if (!s) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="admin" />
        <div className="container-app py-12">
          <div className="card max-w-[640px] text-center py-16">
            <div className="text-[15px] font-bold text-ink mb-1">정책 데이터가 없습니다</div>
            <div className="t-sub">platform_settings 초기 행(id=1)이 필요합니다.</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="admin" />
      <div className="container-app py-8 max-w-[640px]">
        <div className="mb-6">
          <div className="t-section text-[20px]">플랫폼 설정</div>
          <div className="t-sub mt-1">평점 정책과 공개 범위를 관리합니다. 파트너·주최 화면에 즉시 반영됩니다.</div>
        </div>

        <section className="card mb-4">
          <div className="t-section mb-1">행사 카테고리</div>
          <div className="t-sub mb-4">행사 등록 시 선택하는 카테고리입니다. 순서·내용을 편집하고 아래 저장을 누르면 등록 화면에 반영됩니다.</div>
          {(() => {
            const cats = s.event_categories ?? [...EVENT_CATEGORIES];
            return (
              <>
                <div className="space-y-2 mb-3">
                  {cats.map((c, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input value={c} onChange={(e) => { const n = [...cats]; n[i] = e.target.value; patch({ event_categories: n }); }} className="input flex-1" placeholder="카테고리명" />
                      <button type="button" disabled={i === 0} onClick={() => { const n = [...cats];[n[i - 1], n[i]] = [n[i], n[i - 1]]; patch({ event_categories: n }); }} className="btn-secondary py-1.5 px-2.5 text-[13px] disabled:opacity-30">↑</button>
                      <button type="button" disabled={i === cats.length - 1} onClick={() => { const n = [...cats];[n[i + 1], n[i]] = [n[i], n[i + 1]]; patch({ event_categories: n }); }} className="btn-secondary py-1.5 px-2.5 text-[13px] disabled:opacity-30">↓</button>
                      <button type="button" onClick={() => patch({ event_categories: cats.filter((_, j) => j !== i) })} className="text-danger text-[12px] font-bold px-1.5 shrink-0">삭제</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => patch({ event_categories: [...cats, ''] })} className="chip">+ 카테고리 추가</button>
              </>
            );
          })()}
        </section>

        <section className="card mb-4">
          <div className="t-section mb-1">평점 정책</div>
          <div className="t-sub mb-4">평가 기능의 동작을 제어합니다.</div>
          <Toggle label="주최 평점 부여" desc="행사 주최가 파트너를 평가할 수 있음" on={s.host_rating} onChange={(v) => patch({ host_rating: v })} />
          <Toggle label="파트너에게 평점 노출" desc="파트너 본인이 받은 평점을 볼 수 있음" on={s.seller_visible} onChange={(v) => patch({ seller_visible: v })} />
          <Toggle label="코멘트 공개" desc="평가 코멘트를 함께 노출" on={s.show_comments} onChange={(v) => patch({ show_comments: v })} />
          <Toggle label="이의제기 허용" desc="파트너가 평가에 이의를 제기할 수 있음" on={s.appeal} onChange={(v) => patch({ appeal: v })} />
        </section>

        <section className="card mb-4">
          <div className="t-section mb-1">공개 범위</div>
          <div className="t-sub mb-4">평점을 누구에게 공개할지 정합니다.</div>
          <div className="flex flex-wrap gap-2">
            {SCOPES.map((sc) => (
              <button key={sc} onClick={() => patch({ public_scope: sc })} className={`chip ${s.public_scope === sc ? 'selected' : ''}`}>
                {sc}
              </button>
            ))}
          </div>
        </section>

        <section className="card mb-4">
          <div className="t-section mb-1">공개 최소 평가 수</div>
          <div className="t-sub mb-4">이 수 이상 평가가 쌓여야 평점을 공개합니다.</div>
          <div className="flex gap-2">
            {MIN_REVIEWS.map((n) => (
              <button key={n} onClick={() => patch({ min_reviews: n })} className={`chip ${s.min_reviews === n ? 'selected' : ''}`}>
                {n}개
              </button>
            ))}
          </div>
        </section>

        <section className="card mb-4">
          <div className="t-section mb-1">가입·검수 정책</div>
          <div className="t-sub mb-4">공급자 검증 강도를 제어합니다. 해자(신뢰)의 핵심 설정입니다.</div>
          <Toggle
            label="입점 파트너 자동 승인"
            desc="끄면(권장) 신규 파트너는 '가입 심사' 상태로 시작해 관리자 승인 후 활동합니다"
            on={s.seller_auto_approve ?? false}
            onChange={(v) => patch({ seller_auto_approve: v })}
          />
          <Toggle
            label="주최사 신청자 서류 다운로드 허용"
            desc="켜면 주최사가 자기 행사 신청자의 제출 서류(사업자등록증 등)를 다운로드할 수 있습니다 (부스 사진은 항상 허용)"
            on={s.host_doc_download ?? false}
            onChange={(v) => patch({ host_doc_download: v })}
          />
          <div className="pt-3">
            <div className="text-[13px] font-semibold text-ink mb-1">승인 필수 서류 수</div>
            <div className="text-[12px] text-text-tertiary mb-2">이 수 이상 서류가 확인돼야 승인을 권장합니다.</div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button key={n} onClick={() => patch({ required_docs_count: n })} className={`chip ${(s.required_docs_count ?? 5) === n ? 'selected' : ''}`}>
                  {n}종
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="card mb-4">
          <div className="t-section mb-1">정산·수수료 기본값</div>
          <div className="t-sub mb-4">행사 등록 시 기본으로 안내되는 값입니다.</div>
          <label className="flex flex-col gap-1.5 mb-3">
            <span className="text-[12px] font-semibold text-ink-soft">플랫폼 기본 수수료 (%)</span>
            <input
              type="number" min={0} max={100} step={0.5}
              value={s.platform_fee_pct ?? 0}
              onChange={(e) => patch({ platform_fee_pct: Number(e.target.value) })}
              className="input max-w-[160px]"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-ink-soft">기본 정산 주기 안내</span>
            <input
              type="text"
              value={s.default_settlement ?? ''}
              onChange={(e) => patch({ default_settlement: e.target.value })}
              className="input"
              placeholder="예: 행사 종료 후 7영업일"
            />
          </label>
        </section>

        <section className="card mb-4">
          <div className="t-section mb-1">로그인 화면 노출 지표</div>
          <div className="t-sub mb-4">로그인·회원가입 화면에 노출되는 홍보 수치입니다. 아래 <b>실제값</b>을 참고해 직접 조정하세요. (실제값 = 현재 DB 기준)</div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <RefField label="입점 파트너 수 (팀)" value={s.landing_partners ?? 0} real={ref?.partners} onChange={(v) => patch({ landing_partners: v })} onApply={ref ? () => patch({ landing_partners: ref.partners }) : undefined} />
            <RefField label="등록 행사 수 (건)" value={s.landing_events ?? 0} real={ref?.events} onChange={(v) => patch({ landing_events: v })} onApply={ref ? () => patch({ landing_events: ref.events }) : undefined} />
            <RefField label="지금 모집 중 (건)" value={s.landing_recruiting ?? 0} real={ref?.recruiting} onChange={(v) => patch({ landing_recruiting: v })} onApply={ref ? () => patch({ landing_recruiting: ref.recruiting }) : undefined} />
          </div>
          {ref && (
            <button
              onClick={() => patch({ landing_partners: ref.partners, landing_events: ref.events, landing_recruiting: ref.recruiting })}
              className="btn-secondary text-[12px] py-1.5 px-3 mt-3"
            >
              실제값 전체 적용
            </button>
          )}
        </section>

        <div className="flex items-center gap-3 sticky bottom-0 bg-page/90 backdrop-blur py-3">
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? '저장 중…' : '정책 저장'}
          </button>
          {saved && <span className="text-[13px] font-semibold text-success">✓ 저장되었습니다</span>}
        </div>
      </div>
    </main>
  );
}

function RefField({ label, value, real, onChange, onApply }: { label: string; value: number; real?: number; onChange: (v: number) => void; onApply?: () => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-ink-soft">{label}</span>
      <input type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} className="input" />
      <span className="text-[11px] text-text-tertiary flex items-center gap-2">
        {real != null ? (
          <>
            <span>실제 <b className="text-ink font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>{real.toLocaleString()}</b></span>
            {onApply && value !== real && <button type="button" onClick={onApply} className="text-info font-bold hover:underline">적용</button>}
          </>
        ) : '실제값 불러오는 중…'}
      </span>
    </label>
  );
}

function Toggle({ label, desc, on, onChange }: { label: string; desc?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-line-faint last:border-0">
      <div className="min-w-0 pr-4">
        <div className="text-[14px] font-semibold text-ink">{label}</div>
        {desc && <div className="text-[12px] text-text-tertiary mt-0.5">{desc}</div>}
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
