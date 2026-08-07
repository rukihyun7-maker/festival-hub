'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import EventForm, { initialFormValues, type EventFormValues } from '@/components/EventForm';
import { createEvent, fetchMyProfile } from '@/lib/supabase/queries';
import type { Profile } from '@/lib/types';

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

  useEffect(() => {
    (async () => {
      const p = await fetchMyProfile();
      setMe(p);
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
        status: v.status,
        review_status: me.role === 'admin' ? 'approved' : 'pending', // 주최=승인 대기 / 관리자=즉시 공개
      });
      // 주최는 관리자 승인 후 공개 → 요청 현황으로, 관리자는 바로 상세로
      router.push(me.role === 'admin' ? `/events/${row.id}` : '/host/events?submitted=1');
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
          <p className="t-sub">필수 항목을 입력하면 파트너가 즉시 신청 가능합니다.</p>
        </div>

        <EventForm
          mode="create"
          initial={initialFormValues(me)}
          submitting={submitting}
          error={error}
          cancelHref="/host"
          onSubmit={handleSubmit}
        />
      </div>
    </main>
  );
}
