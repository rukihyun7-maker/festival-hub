'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import EventForm, { toFormValues, type EventFormValues } from '@/components/EventForm';
import { deleteEvent, fetchEventById, fetchEventContact, fetchMyProfile, updateEvent } from '@/lib/supabase/queries';
import { compactSiteDetails } from '@/lib/types';
import type { EventRow, Profile } from '@/lib/types';

/**
 * 행사 수정 페이지 · Host or Admin only
 * 소유주 검증 + 초기값 로드 + updateEvent 호출
 */
export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [me, setMe] = useState<Profile | null>(null);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [contact, setContact] = useState<{ contact: string | null; phone: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, e] = await Promise.all([fetchMyProfile(), fetchEventById(params.id)]);
        setMe(p);
        setEvent(e);
        try { setContact(await fetchEventContact(params.id)); } catch { /* 권한 없음 → null */ }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  async function handleSubmit(v: EventFormValues) {
    if (!event) return;
    setError(null);
    setSubmitting(true);
    try {
      await updateEvent(event.id, {
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
        status: v.status,
        settlement_cycle: v.settlement_cycle.trim() || null,
        payment_method: v.payment_method.trim() || null,
        site_details: compactSiteDetails(v.site),
      });
      router.push(`/events/${event.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!event) return;
    if (!confirm(`"${event.name}"을 삭제하시겠어요?\n관련된 신청/매출도 함께 삭제됩니다 (CASCADE).\n이 작업은 되돌릴 수 없습니다.`)) return;
    setDeleting(true);
    try {
      await deleteEvent(event.id);
      router.push('/host');
    } catch (err) {
      setError((err as Error).message);
      setDeleting(false);
    }
  }

  if (loading) {
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

  if (!event) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="host" />
        <div className="container-app py-12">
          <div className="card">
            <div className="text-[16px] font-bold text-danger mb-2">행사를 찾을 수 없습니다</div>
            <div className="text-[13px] text-text-secondary mb-4">삭제되었거나 접근 권한이 없습니다.</div>
            <Link href="/host" className="btn-secondary">← 대시보드로</Link>
          </div>
        </div>
      </main>
    );
  }

  const isOwner = me?.id === event.owner_id;
  const isAdmin = me?.role === 'admin';
  const canEdit = isOwner || isAdmin;

  if (!canEdit) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="host" />
        <div className="container-app py-12">
          <div className="card">
            <div className="text-[16px] font-bold text-ink mb-2">이 행사를 수정할 권한이 없습니다</div>
            <div className="text-[13px] text-text-secondary mb-4">소유 주최 또는 관리자만 수정할 수 있습니다.</div>
            <div className="flex gap-2">
              <Link href={`/events/${event.id}`} className="btn-secondary">상세 보기</Link>
              <Link href="/host" className="btn-primary">대시보드</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-page">
      <AppNav role={isAdmin ? 'admin' : 'host'} />

      <div className="container-app py-8 md:py-12">
        <nav className="text-[12px] font-semibold text-text-tertiary mb-4">
          <Link href="/host" className="hover:text-ink">주최 대시보드</Link>
          <span className="mx-2">/</span>
          <Link href={`/events/${event.id}`} className="hover:text-ink">{event.name}</Link>
          <span className="mx-2">/</span>
          <span className="text-ink">수정</span>
        </nav>

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="t-title mb-2">행사 수정</h1>
            <p className="t-sub">
              등록일 {new Date(event.created_at).toLocaleDateString('ko-KR')}
              {event.updated_at !== event.created_at && ` · 최근 수정 ${new Date(event.updated_at).toLocaleDateString('ko-KR')}`}
              {isAdmin && !isOwner && ' · 관리자 편집'}
            </p>
          </div>
          <Link href={`/events/${event.id}`} className="btn-secondary text-[13px] py-2 px-3 shrink-0">
            상세 페이지 →
          </Link>
        </div>

        <EventForm
          mode="edit"
          initial={{ ...toFormValues(event), contact: contact?.contact ?? '', phone: contact?.phone ?? '' }}
          submitting={submitting || deleting}
          error={error}
          cancelHref={`/events/${event.id}`}
          showDelete
          onSubmit={handleSubmit}
          onDelete={handleDelete}
        />
      </div>
    </main>
  );
}
