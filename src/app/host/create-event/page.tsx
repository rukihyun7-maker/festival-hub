'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import EventForm, { initialFormValues, type EventFormValues } from '@/components/EventForm';
import { createEvent, fetchMyProfile, updateEvent, fetchPlatformSettings } from '@/lib/supabase/queries';
import { compactSiteDetails } from '@/lib/types';
import type { Profile } from '@/lib/types';

type NearbySummary = { apartment: number; university: number; transit: number; commercial: number };

/**
 * 행사 등록 페이지 · Host only
 * EventForm 공용 컴포넌트 사용
 */
export default function CreateEventPage() {
  const router = useRouter();
  const [me, setMe] = useState<Profile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; name: string; isAdmin: boolean; summary: NearbySummary | null; located: boolean } | null>(null);
  const [categories, setCategories] = useState<string[] | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const p = await fetchMyProfile();
      setMe(p);
      try { const st = await fetchPlatformSettings(); if (st?.event_categories?.length) setCategories(st.event_categories); } catch { /* 기본 사용 */ }
      setCheckingAuth(false);
    })();
  }, []);

  async function handleSubmit(v: EventFormValues) {
    if (!me) {
      setError('로그인이 필요합니다');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const row = await createEvent({
        owner_id: me.id,
        name: v.name.trim(),
        category: v.category,
        organizer: v.organizer.trim(),
        start_date: v.start_date,
        end_date: v.end_date,
        region: v.region,
        address: v.address.trim(),
        visitors: v.visitors.trim() || null,
        capacity: v.capacity.trim() || null,
        fee: Number(v.fee),
        fee_rate: Number(v.fee_rate),
        deadline: v.deadline || null,
        electric: v.electric,
        water: v.water,
        gas: v.gas,
        parking: v.parking,
        description: v.description.trim() || null,
        contact: v.contact.trim() || null,
        phone: v.phone.trim() || null,
        contact_public: v.contact_public,
        contact_hidden: v.contact_hidden,
        status: v.status,
        settlement_cycle: v.settlement_cycle.trim() || null,
        settlement_method: v.settlement_method.trim() || null,
        payment_method: v.payment_method.trim() || null,
        vat_included: v.vat_included,
        site_details: compactSiteDetails(v.site),
        recruit_slots: v.recruit_slots.filter((s) => s.type.trim() && s.count > 0),
        required_docs: { standard: v.required_docs.standard ?? [], extra: (v.required_docs.extra ?? []).filter((d) => d.label.trim()) },
        notice_url: v.notice_url || null,
        notice_name: v.notice_name || null,
        operating_days: v.operating_days,
        review_status: me.role === 'admin' ? 'approved' : 'pending', // 주최=승인 대기 / 관리자=즉시 공개
      });

      // 자동 좌표 + 상권 요약 (실패해도 등록은 유지 · 비차단)
      let summary: NearbySummary | null = null;
      let located = false;
      try {
        const res = await fetch('/api/geocode-nearby', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: v.address.trim(), region: v.region, name: v.name.trim() }),
        });
        if (res.ok) {
          const j = await res.json();
          if (j.lat != null && j.lng != null) {
            await updateEvent(row.id, { lat: j.lat, lng: j.lng, geocoded_at: new Date().toISOString() });
            located = true;
            summary = j.summary ?? null;
          }
        }
      } catch { /* 지오코딩 실패 무시 */ }

      setSubmitting(false);
      setDone({ id: row.id, name: row.name, isAdmin: me.role === 'admin', summary, located });
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="host" />
        <div className="container-app py-12">
          <div className="animate-pulse space-y-3 max-w-[520px]">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-6 bg-muted rounded w-2/3" />
          </div>
        </div>
      </main>
    );
  }

  if (!me || (me.role !== 'host' && me.role !== 'admin')) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="host" />
        <div className="container-app py-12">
          <div className="card">
            <div className="text-[16px] font-bold text-ink mb-2">행사 주최 계정으로 로그인이 필요합니다</div>
            <Link href="/login" className="btn-primary">로그인 →</Link>
          </div>
        </div>
      </main>
    );
  }

  // 가입 심사/반려 주최는 행사 등록 불가 (관리자 승인 후 이용)
  if (me.role === 'host' && me.status !== '정상') {
    const pending = me.status === '가입 심사';
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="host" />
        <div className="container-app py-12 max-w-[520px]">
          <div className="card text-center py-14">
            <div className="text-[34px] mb-3">{pending ? '🕓' : '⚠️'}</div>
            <div className="text-[16px] font-bold text-ink mb-2">{pending ? '가입 심사 중입니다' : '가입이 반려되었습니다'}</div>
            <div className="t-sub mb-6">
              {pending
                ? '관리자 승인 후 행사를 등록할 수 있습니다. 결과는 이메일로 안내드립니다.'
                : '안내 메일의 사유를 확인해 정보를 보완한 뒤 재심사를 요청해 주세요.'}
            </div>
            <Link href="/host" className="btn-primary">대시보드로 이동</Link>
          </div>
        </div>
      </main>
    );
  }

  if (done) {
    const s = done.summary;
    const hasSummary = !!s && (s.apartment + s.university + s.transit + s.commercial) > 0;
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="host" />
        <div className="container-app py-10 max-w-[560px]">
          <div className="card text-center">
            <div className="w-14 h-14 rounded-pill bg-accent mx-auto mb-4 flex items-center justify-center text-[26px]">✓</div>
            <div className="t-section text-[19px] mb-1">행사 등록 완료</div>
            <div className="text-[15px] font-extrabold text-ink mb-2">{done.name}</div>
            <p className="t-sub mb-5">
              {done.isAdmin ? '즉시 공개되어 파트너에게 노출됩니다.' : '관리자 검수 후 공개되며, 검증된 입점 파트너의 신청을 받게 됩니다.'}
            </p>

            {hasSummary ? (
              <div className="rounded-card p-4 mb-5 text-left" style={{ background: 'var(--info-soft, #F4F7FE)' }}>
                <div className="text-[12px] font-extrabold mb-2" style={{ color: 'var(--info, #2B4B9B)' }}>📍 이 자리 반경 1km 상권 (자동 분석)</div>
                <div className="grid grid-cols-2 gap-2">
                  <SummaryTile icon="🏢" label="아파트 단지" n={s!.apartment} />
                  <SummaryTile icon="🚇" label="지하철역" n={s!.transit} />
                  <SummaryTile icon="🎓" label="대학교" n={s!.university} />
                  <SummaryTile icon="🛒" label="대형마트" n={s!.commercial} />
                </div>
                <div className="text-[11px] text-text-tertiary mt-2">주변 유동인구가 많을수록 파트너 신청이 늘어납니다. · 출처 카카오맵</div>
              </div>
            ) : done.located ? (
              <div className="text-[12px] text-text-secondary mb-5 p-3 rounded-input" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)' }}>
                위치 좌표가 등록되었습니다. 이 자리 반경 1km에는 등록된 대형 시설이 적습니다(한적한 입지).
              </div>
            ) : (
              <div className="text-[12px] text-text-secondary mb-5 p-3 rounded-input" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)' }}>
                주소로 좌표를 자동 인식하지 못했습니다. 상세 주소를 보완하면 상권 분석이 표시됩니다.
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <Link href={done.isAdmin ? `/events/${done.id}` : '/host/events?submitted=1'} className="btn-primary">
                {done.isAdmin ? '행사 보기' : '내 행사로 이동'}
              </Link>
              <button onClick={() => { setDone(null); }} className="btn-secondary">행사 추가 등록</button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="host" />

      <div className="container-app py-8 md:py-12">
        <nav className="text-[12px] font-semibold text-text-tertiary mb-4">
          <Link href="/host" className="hover:text-ink">주최 대시보드</Link>
          <span className="mx-2">/</span>
          <span className="text-ink">새 행사 등록</span>
        </nav>

        <div className="mb-8">
          <h1 className="t-title mb-2">새 행사 등록</h1>
          <p className="t-sub">필수 항목을 입력하고 등록하면, 관리자 검수를 거쳐 입점 파트너에게 공개됩니다.</p>
        </div>

        <EventForm
          mode="create"
          initial={initialFormValues(me)}
          submitting={submitting}
          error={error}
          cancelHref="/host"
          ownerId={me.id}
          categories={categories}
          onSubmit={handleSubmit}
        />
      </div>
    </main>
  );
}

function SummaryTile({ icon, label, n }: { icon: string; label: string; n: number }) {
  return (
    <div className="flex items-center justify-between gap-2 p-2.5 rounded-input bg-surface border border-line-faint">
      <span className="text-[12px] font-semibold text-ink">{icon} {label}</span>
      <span className="text-[15px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>{n}</span>
    </div>
  );
}
