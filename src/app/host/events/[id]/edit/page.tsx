'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import EventForm, { toFormValues, type EventFormValues } from '@/components/EventForm';
import { deleteEvent, fetchEventById, fetchEventContact, fetchMyProfile, updateEvent, fetchPlatformSettings, requestEventDeletion, withdrawEventDeletion } from '@/lib/supabase/queries';
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
  const [categories, setCategories] = useState<string[] | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const [p, e] = await Promise.all([fetchMyProfile(), fetchEventById(params.id)]);
        setMe(p);
        setEvent(e);
        try { const st = await fetchPlatformSettings(); if (st?.event_categories?.length) setCategories(st.event_categories); } catch { /* 기본 사용 */ }
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
        contact_public: v.contact_public,
        status: v.status,
        settlement_cycle: v.settlement_cycle.trim() || null,
        payment_method: v.payment_method.trim() || null,
        site_details: compactSiteDetails(v.site),
        recruit_slots: v.recruit_slots.filter((s) => s.type.trim() && s.count > 0),
        required_docs: { standard: v.required_docs.standard ?? [], extra: (v.required_docs.extra ?? []).filter((d) => d.label.trim()) },
        notice_url: v.notice_url || null,
        notice_name: v.notice_name || null,
        operating_days: v.operating_days,
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

  // 승인된 행사(파트너에게 공개됨)는 주최가 바로 삭제할 수 없고 관리자 승인을 받아야 함 (사고 방지)
  async function handleRequestDeletion() {
    if (!event) return;
    const reason = prompt('삭제를 요청하는 사유를 입력해 주세요. 관리자 검토 후 삭제됩니다.\n(신청한 파트너가 있으면 함께 정리됩니다)');
    if (reason === null) return;
    setDeleting(true);
    try {
      await requestEventDeletion(event.id, reason.trim());
      setEvent({ ...event, delete_requested_at: new Date().toISOString(), delete_reason: reason.trim() || null });
      alert('삭제 요청이 접수되었습니다. 관리자 검토 후 처리됩니다.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleWithdrawDeletion() {
    if (!event) return;
    setDeleting(true);
    try {
      await withdrawEventDeletion(event.id);
      setEvent({ ...event, delete_requested_at: null, delete_reason: null });
    } catch (err) {
      setError((err as Error).message);
    } finally {
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
  // 승인(공개)된 행사는 주최가 직접 삭제 불가 → 관리자 승인 절차. 관리자는 즉시 삭제.
  const needsApproval = event.review_status !== 'pending' && event.review_status !== 'rejected' && !isAdmin;
  const deletionRequested = !!event.delete_requested_at;
  const deleteAction = !needsApproval ? handleDelete : deletionRequested ? handleWithdrawDeletion : handleRequestDeletion;
  const deleteLabel = !needsApproval ? '행사 삭제' : deletionRequested ? '삭제 요청 철회' : '행사 삭제 요청';
  const deleteHint = !needsApproval
    ? (isAdmin ? '관리자 권한 · 즉시 삭제됩니다' : undefined)
    : deletionRequested ? '관리자 검토 중입니다' : '승인된 행사는 관리자 승인 후 삭제됩니다';

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

        {deletionRequested && (
          <div className="rounded-card p-4 mb-6 border" style={{ background: 'var(--danger-bg, #FCEDEA)', borderColor: 'var(--danger, #C7503E)' }}>
            <div className="text-[13px] font-bold text-danger mb-1">🗑️ 삭제 요청됨 · 관리자 검토 중</div>
            <div className="text-[12px] text-text-secondary leading-relaxed">
              관리자가 승인하면 이 행사와 관련 신청·매출이 삭제됩니다.{event.delete_reason ? ` 요청 사유: “${event.delete_reason}”` : ''} 취소하려면 아래 <b>삭제 요청 철회</b>를 누르세요.
            </div>
          </div>
        )}

        <EventForm
          mode="edit"
          initial={{ ...toFormValues(event), contact: contact?.contact ?? '', phone: contact?.phone ?? '' }}
          submitting={submitting || deleting}
          error={error}
          cancelHref={`/events/${event.id}`}
          showDelete
          ownerId={event.owner_id}
          categories={categories}
          lockCore={needsApproval}
          deleteLabel={deleteLabel}
          deleteHint={deleteHint}
          onSubmit={handleSubmit}
          onDelete={deleteAction}
        />
      </div>
    </main>
  );
}
