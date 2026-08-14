'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import {
  fetchMyProfile,
  fetchMyHostEvents,
  fetchApplicationsForEvent,
  fetchHostGivenRatings,
  fetchPlatformSettings,
  createRating,
} from '@/lib/supabase/queries';
import { periodLabel } from '@/lib/types';
import type { Profile, EventRow, ApplicationWithRelations, Rating } from '@/lib/types';

/**
 * 입점 파트너 평가 (행사 주최 · 설계 11)
 * 종료 행사의 승인 파트너에게 위생/시간 준수/고객 응대 5점 + 코멘트.
 * 관리자가 평가 기능을 끄면(platform_settings.host_rating=false) 잠금 배너.
 */

type Ratable = { seller: Profile; event: EventRow; app: ApplicationWithRelations };

export default function HostRatingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Ratable[]>([]);
  const [ratedKeys, setRatedKeys] = useState<Set<string>>(new Set());
  const [ratingEnabled, setRatingEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchMyProfile();
        setProfile(p);
        if (!p || p.role !== 'host') return;

        const [settings, events, given] = await Promise.all([
          fetchPlatformSettings(),
          fetchMyHostEvents(p.id),
          fetchHostGivenRatings(p.id),
        ]);
        setRatingEnabled(settings?.host_rating ?? true);
        setRatedKeys(new Set(given.map((r: Rating) => `${r.seller_id}:${r.event_id}`)));

        // 종료(또는 마감) 행사만
        const ended = events.filter(
          (e) => e.status === 'close' || e.status === 'canceled' || new Date(e.end_date) < new Date()
        );
        const lists = await Promise.all(ended.map((e) => fetchApplicationsForEvent(e.id)));
        const ratable: Ratable[] = [];
        ended.forEach((e, idx) => {
          lists[idx]
            .filter((a) => a.status === 'approved' && a.seller)
            .forEach((a) => ratable.push({ seller: a.seller as Profile, event: e, app: a }));
        });
        setItems(ratable);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function markRated(sellerId: string, eventId: string) {
    setRatedKeys((prev) => new Set(prev).add(`${sellerId}:${eventId}`));
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="host" />
        <div className="container-app py-12">
          <div className="animate-pulse space-y-4 max-w-[720px]">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-40 bg-muted rounded w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (!profile || profile.role !== 'host') {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="host" />
        <div className="container-app py-12">
          <div className="card max-w-[640px]">
            <div className="text-[16px] font-bold text-ink mb-2">행사 주최 계정으로 로그인이 필요합니다</div>
            <Link href="/login" className="btn-primary inline-flex mt-2">로그인</Link>
          </div>
        </div>
      </main>
    );
  }

  const pending = items.filter((it) => !ratedKeys.has(`${it.seller.id}:${it.event.id}`));

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="host" />
      <div className="container-app py-8 max-w-[760px]">
        <div className="mb-6">
          <div className="t-section text-[20px]">입점 파트너 평가</div>
          <div className="t-sub mt-1">종료된 행사에 참여한 승인 파트너를 평가합니다. 평가는 파트너 신뢰도에 반영됩니다.</div>
        </div>

        {!ratingEnabled && (
          <div className="card mb-4" style={{ background: 'var(--warning-bg, #FFF3C4)' }}>
            <div className="text-[14px] font-bold text-ink mb-1">평가 기능이 잠겨 있습니다</div>
            <div className="text-[13px] text-ink-soft">현재 플랫폼 정책상 주최 평가가 비활성화되어 있습니다. 관리자에게 문의하세요.</div>
          </div>
        )}

        {pending.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-[15px] font-bold text-ink mb-1">평가할 파트너가 없습니다</div>
            <div className="t-sub">종료된 행사의 승인 파트너가 생기면 이곳에서 평가할 수 있어요.</div>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((it) => (
              <RatingCard
                key={`${it.seller.id}:${it.event.id}`}
                item={it}
                hostId={profile.id}
                disabled={!ratingEnabled}
                onDone={() => markRated(it.seller.id, it.event.id)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function RatingCard({
  item, hostId, disabled, onDone,
}: { item: Ratable; hostId: string; disabled: boolean; onDone: () => void }) {
  const [hygiene, setHygiene] = useState(0);
  const [punctual, setPunctual] = useState(0);
  const [service, setService] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const name = item.seller.business_name || item.seller.name || '파트너';
  const complete = hygiene > 0 && punctual > 0 && service > 0;

  async function submit() {
    if (!complete) return;
    setSaving(true);
    try {
      await createRating({
        seller_id: item.seller.id,
        host_id: hostId,
        event_id: item.event.id,
        hygiene, punctual, service,
        comment: comment.trim() || null,
      });
      onDone();
    } catch (e) {
      alert('평가 등록 실패: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <div className="text-[15px] font-extrabold text-ink truncate">{name}</div>
        <div className="text-[12px] text-text-tertiary truncate">{item.event.name}</div>
      </div>
      <div className="text-[11px] text-text-tertiary mb-3">{periodLabel(item.event.start_date, item.event.end_date)}</div>

      <StarRow label="위생 관리" value={hygiene} onChange={setHygiene} disabled={disabled} />
      <StarRow label="시간 준수" value={punctual} onChange={setPunctual} disabled={disabled} />
      <StarRow label="고객 응대" value={service} onChange={setService} disabled={disabled} />

      <textarea
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={disabled}
        placeholder="코멘트 (선택) · 다른 주최에게 참고가 됩니다"
        className="input resize-none mt-3 text-[13px]"
      />
      <button onClick={submit} disabled={disabled || !complete || saving} className="btn-primary w-full mt-3">
        {saving ? '등록 중…' : '평가 등록'}
      </button>
    </div>
  );
}

function StarRow({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[13px] font-semibold text-ink-soft">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            disabled={disabled}
            onClick={() => onChange(n)}
            aria-label={`${label} ${n}점`}
            className="text-[19px] leading-none"
            style={{ color: n <= value ? 'var(--accent, #FFC800)' : 'var(--bg-muted, #F0ECE1)' }}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}
