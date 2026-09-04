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
import { periodLabel, PRAISE_TAGS, IMPROVE_TAGS, REHIRE_OPTIONS } from '@/lib/types';
import type { Profile, EventRow, ApplicationWithRelations, Rating, Rehire } from '@/lib/types';

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
        if (!p || (p.role !== 'host' && p.role !== 'admin')) return;

        const [settings, events, given] = await Promise.all([
          fetchPlatformSettings(),
          fetchMyHostEvents(p.id),
          fetchHostGivenRatings(p.id),
        ]);
        setRatingEnabled(settings?.host_rating ?? true);
        setRatedKeys(new Set(given.map((r: Rating) => `${r.seller_id}:${r.event_id}`)));

        // 종료(또는 마감) 행사만 · 취소된 행사는 실제 진행되지 않았으므로 평가 대상에서 제외
        const ended = events.filter(
          (e) => e.status !== 'canceled' && (e.status === 'close' || new Date(e.end_date) < new Date())
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

  if (!profile || (profile.role !== 'host' && profile.role !== 'admin')) {
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
            <div className="text-[13px] text-ink-soft">지금은 평가 기능이 잠겨 있어요. 자세한 내용은 관리자에게 문의해 주세요.</div>
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
  const [praise, setPraise] = useState<string[]>([]);
  const [improve, setImprove] = useState<string[]>([]);
  const [rehire, setRehire] = useState<Rehire | null>(null);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const name = item.seller.business_name || item.seller.name || '파트너';
  const complete = rehire !== null; // 재섭외 의향은 필수, 태그는 선택

  const toggle = (arr: string[], set: (v: string[]) => void, t: string) =>
    set(arr.includes(t) ? arr.filter((x) => x !== t) : [...arr, t]);

  async function submit() {
    if (!complete) return;
    setSaving(true);
    try {
      await createRating({
        seller_id: item.seller.id,
        host_id: hostId,
        event_id: item.event.id,
        event_end: item.event.end_date,
        praise_tags: praise,
        improve_tags: improve,
        rehire,
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
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <div className="text-[15px] font-extrabold text-ink truncate">{name}</div>
        <div className="text-[12px] text-text-tertiary truncate">{item.event.name}</div>
      </div>
      <div className="text-[11px] text-text-tertiary mb-4">{periodLabel(item.event.start_date, item.event.end_date)}</div>

      {/* 재섭외 의향 (필수) */}
      <div className="mb-4">
        <div className="text-[12px] font-bold text-ink mb-1.5">다시 함께 하시겠어요? <span className="text-danger">*</span></div>
        <div className="grid grid-cols-3 gap-2">
          {REHIRE_OPTIONS.map((o) => (
            <button key={o.key} type="button" disabled={disabled} onClick={() => setRehire(o.key)}
              className={`py-2.5 rounded-input border-2 text-[12.5px] font-bold transition-all ${rehire === o.key ? 'bg-ink text-white border-ink' : 'bg-surface text-ink border-line-strong hover:border-ink'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* 칭찬 태그 (공개) */}
      <div className="mb-4">
        <div className="text-[12px] font-bold text-ink mb-1.5">👍 좋았던 점 <span className="text-[11px] font-normal text-text-tertiary">· 파트너·다른 주최에 공개</span></div>
        <div className="flex flex-wrap gap-1.5">
          {PRAISE_TAGS.map((t) => (
            <button key={t} type="button" disabled={disabled} onClick={() => toggle(praise, setPraise, t)}
              className={`chip ${praise.includes(t) ? 'selected' : ''}`}>{t}</button>
          ))}
        </div>
      </div>

      {/* 개선점 태그 (비공개) */}
      <div className="mb-4">
        <div className="text-[12px] font-bold text-ink mb-1.5">🔒 개선점 <span className="text-[11px] font-normal text-text-tertiary">· 비공개(파트너 본인만, 닉네임) · 신뢰도에 반영</span></div>
        <div className="flex flex-wrap gap-1.5">
          {IMPROVE_TAGS.map((t) => (
            <button key={t} type="button" disabled={disabled} onClick={() => toggle(improve, setImprove, t)}
              className={`chip ${improve.includes(t) ? 'selected' : ''}`}>{t}</button>
          ))}
        </div>
      </div>

      <textarea
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={disabled}
        placeholder="칭찬 코멘트 (선택) · 공개됩니다"
        className="input resize-none text-[13px]"
      />
      <div className="text-[11px] text-text-tertiary mt-2 mb-3">
        평가는 <b>행사 종료 14일 후</b> 파트너에게 <b>닉네임(익명)</b>으로 반영됩니다. 개선점은 집계 점수에만 반영되고 파트너 본인만 볼 수 있어요.
      </div>
      <button onClick={submit} disabled={disabled || !complete || saving} className="btn-primary w-full">
        {saving ? '등록 중…' : '평가 등록'}
      </button>
    </div>
  );
}
