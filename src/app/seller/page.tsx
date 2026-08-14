'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import {
  fetchMyApplications,
  fetchMyMenus,
  fetchMyProfile,
  fetchMySales,
  createMenu,
  deleteMenu,
  updateMenu,
  setMenuSignature,
  uploadMenuImage,
  fetchSellerHistory,
  createSellerHistory,
  deleteSellerHistory,
  recordSale,
  fetchSellerRatings,
  fetchRatingSummary,
  updateProfile,
} from '@/lib/supabase/queries';
import { periodLabel } from '@/lib/types';
import type { ApplicationWithRelations, Menu, Profile, SaleWithEvent, SellerHistory, RatingWithRelations, RatingSummary, ShareFlags } from '@/lib/types';

/**
 * 입점 파트너 마이페이지 · Supabase 연동
 * 3 탭: 참여 이력(applications+sales) · 매출 요약 · 메뉴 관리(CRUD)
 */

type Tab = 'store' | 'history' | 'sales' | 'menu' | 'ratings';

export default function SellerMyPage() {
  const [tab, setTab] = useState<Tab>('store');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<ApplicationWithRelations[]>([]);
  const [sales, setSales] = useState<SaleWithEvent[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [history, setHistory] = useState<SellerHistory[]>([]);
  const [ratings, setRatings] = useState<RatingWithRelations[]>([]);
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const p = await fetchMyProfile();
      setProfile(p);
      if (p) {
        const [a, s, m, h, r, rs] = await Promise.all([
          fetchMyApplications(p.id),
          fetchMySales(p.id),
          fetchMyMenus(p.id),
          fetchSellerHistory(p.id),
          fetchSellerRatings(p.id).catch(() => [] as RatingWithRelations[]),
          fetchRatingSummary(p.id).catch(() => null),
        ]);
        setApplications(a);
        setSales(s);
        setMenus(m);
        setHistory(h);
        setRatings(r);
        setRatingSummary(rs);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const totalRevenue = sales.reduce((s, r) => s + r.revenue, 0);
  const totalDays = sales.reduce((sum, s) => {
    if (!s.event) return sum;
    const d = Math.max(1, Math.ceil((new Date(s.event.end_date).getTime() - new Date(s.event.start_date).getTime()) / 86400000) + 1);
    return sum + d;
  }, 0);
  const avgDaily = totalDays > 0 ? Math.round(totalRevenue / totalDays) : 0;

  const upcoming = applications.find((a) => a.status === 'approved' && a.event && new Date(a.event.start_date) > new Date());
  const upcomingLabel = upcoming?.event
    ? `D-${Math.max(0, Math.ceil((new Date(upcoming.event.start_date).getTime() - Date.now()) / 86400000))}`
    : '없음';

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="seller" />

      <div className="container-app py-8 md:py-12">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-pill bg-accent flex items-center justify-center text-ink font-extrabold text-[24px]">
            {profile?.name?.[0] ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="t-title mb-1 truncate">
              {profile?.name ?? '로그인 필요'}{profile?.business_name && ` · ${profile.business_name}`}
            </h1>
            <div className="flex flex-wrap gap-2 items-center text-[13px]">
              <span className="badge badge-success">인증 파트너</span>
              <span className="text-text-secondary">참여 {sales.length}회 · {totalDays}일</span>
              {ratingSummary && ratingSummary.review_count > 0 && (
                <span className="text-text-secondary">· ★ {ratingSummary.avg_score} ({ratingSummary.review_count})</span>
              )}
            </div>
          </div>
          <button onClick={() => setTab('store')} className="btn-secondary hidden sm:inline-flex">프로필 수정</button>
        </div>

        {error && (
          <div className="card mb-6" style={{ borderColor: '#E0DACB' }}>
            <div className="text-[13px] font-bold text-warning mb-1">데이터 불러오기 실패</div>
            <div className="text-[12px] text-text-secondary">{error}</div>
          </div>
        )}

        {/* 지표 3 */}
        <div className="grid gap-3 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <SummaryCard label="누적 매출" value={loading ? '—' : `₩${totalRevenue.toLocaleString()}`} note={`${sales.length}회 참여`} />
          <SummaryCard label="평균 일매출" value={loading ? '—' : `₩${avgDaily.toLocaleString()}`} note={`${totalDays}일 기준`} />
          <SummaryCard label="다음 참여" value={loading ? '—' : upcomingLabel} note={upcoming?.event?.name ?? '승인 대기 중'} />
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-muted rounded-input p-1 mb-6 overflow-x-auto no-scrollbar">
          <TabBtn active={tab === 'store'} onClick={() => setTab('store')}>매장 정보</TabBtn>
          <TabBtn active={tab === 'history'} onClick={() => setTab('history')}>참여 이력 ({applications.length + sales.length + history.length})</TabBtn>
          <TabBtn active={tab === 'sales'} onClick={() => setTab('sales')}>매출 요약</TabBtn>
          <TabBtn active={tab === 'menu'} onClick={() => setTab('menu')}>메뉴 관리 ({menus.length})</TabBtn>
          <TabBtn active={tab === 'ratings'} onClick={() => setTab('ratings')}>받은 평가 ({ratings.length})</TabBtn>
        </div>

        {tab === 'store' && (
          <StoreTab
            loading={loading}
            profile={profile}
            onSave={async (patch) => {
              if (!profile) return;
              const updated = await updateProfile(profile.id, patch);
              setProfile(updated);
            }}
          />
        )}
        {tab === 'ratings' && <RatingsTab loading={loading} ratings={ratings} summary={ratingSummary} />}

        {/* 탭 콘텐츠 */}
        {tab === 'history' && (
          <HistoryTab
            loading={loading}
            applications={applications}
            sales={sales}
            history={history}
            profile={profile}
            onAddHistory={async (input) => {
              if (!profile) return;
              await createSellerHistory({ ...input, seller_id: profile.id });
              load();
            }}
            onDeleteHistory={async (id) => {
              if (!confirm('이 참여이력을 삭제하시겠어요?')) return;
              await deleteSellerHistory(id);
              setHistory((prev) => prev.filter((h) => h.id !== id));
            }}
            onRecordSale={async (input) => {
              if (!profile) return;
              await recordSale({ ...input, seller_id: profile.id });
              load();
            }}
          />
        )}
        {tab === 'sales' && <SalesTab loading={loading} sales={sales} />}
        {tab === 'menu' && (
          <MenuTab
            loading={loading}
            menus={menus}
            profile={profile}
            onCreate={async (input) => {
              if (!profile) return;
              await createMenu({ ...input, seller_id: profile.id });
              load();
            }}
            onUpdate={async (id, patch) => {
              const updated = await updateMenu(id, patch);
              setMenus((prev) => prev.map((m) => (m.id === id ? updated : m)));
            }}
            onToggleSignature={async (id, signature) => {
              if (!profile) return;
              await setMenuSignature(profile.id, id, signature);
              setMenus((prev) => prev.map((m) => (m.id === id ? { ...m, signature } : m)));
            }}
            onUploadImage={async (id, file) => {
              if (!profile) return;
              const url = await uploadMenuImage(profile.id, id, file);
              const updated = await updateMenu(id, { image_url: url });
              setMenus((prev) => prev.map((m) => (m.id === id ? updated : m)));
            }}
            onDelete={async (id) => {
              if (!confirm('이 메뉴를 삭제하시겠어요?')) return;
              await deleteMenu(id);
              setMenus((prev) => prev.filter((m) => m.id !== id));
            }}
          />
        )}
      </div>
    </main>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-[8px] text-[14px] font-bold transition-colors ${active ? 'bg-surface text-ink' : 'text-text-secondary hover:text-ink'}`}
    >
      {children}
    </button>
  );
}

function SummaryCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card">
      <div className="t-sub mb-2">{label}</div>
      <div className="text-[22px] font-extrabold text-ink tracking-[-0.02em] mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div className="text-[11px] text-text-tertiary truncate">{note}</div>
    </div>
  );
}

function HistoryTab({
  loading, applications, sales, history, onAddHistory, onDeleteHistory, onRecordSale,
}: {
  loading: boolean;
  applications: ApplicationWithRelations[];
  sales: SaleWithEvent[];
  history: SellerHistory[];
  profile: Profile | null;
  onAddHistory: (input: { event_name: string; event_date?: string | null; region?: string | null; orders?: number | null; revenue?: number | null; note?: string | null }) => Promise<void>;
  onDeleteHistory: (id: string) => Promise<void>;
  onRecordSale: (input: { event_id: string; application_id?: string | null; orders: number; revenue: number; cost?: number | null; note?: string | null }) => Promise<void>;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [recordFor, setRecordFor] = useState<string | null>(null);

  if (loading) return <LoadingCard />;

  const salesEventIds = new Set(sales.map((s) => s.event_id));

  type Row =
    | { kind: 'sale'; key: string; title: string; period: string; date: string; revenue: number; orders: number }
    | { kind: 'app'; key: string; title: string; period: string; date: string; status: 'pending' | 'approved' | 'rejected' | 'canceled'; eventId: string; appId: string }
    | { kind: 'history'; key: string; title: string; period: string; date: string; revenue: number | null; orders: number | null; note: string | null; historyId: string };

  const rows: Row[] = [
    ...sales.map((s): Row => ({
      kind: 'sale', key: `sale-${s.id}`,
      title: s.event?.name ?? '(삭제된 행사)',
      period: s.event ? periodLabel(s.event.start_date, s.event.end_date) : '-',
      date: s.recorded_at, revenue: s.revenue, orders: s.orders,
    })),
    ...applications
      .filter((a) => a.event && !(a.status === 'approved' && salesEventIds.has(a.event_id)))
      .map((a): Row => ({
        kind: 'app', key: `app-${a.id}`,
        title: a.event!.name,
        period: periodLabel(a.event!.start_date, a.event!.end_date),
        date: a.applied_at, status: a.status, eventId: a.event_id, appId: a.id,
      })),
    ...history.map((h): Row => ({
      kind: 'history', key: `hist-${h.id}`,
      title: h.event_name,
      period: h.event_date ? h.event_date.replace(/-/g, '.') + (h.region ? ` · ${h.region}` : '') : (h.region ?? '-'),
      date: h.event_date ?? h.created_at,
      revenue: h.revenue, orders: h.orders, note: h.note, historyId: h.id,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const statusMeta: Record<'pending' | 'approved' | 'rejected' | 'canceled', { text: string; cls: string }> = {
    pending: { text: '승인 대기', cls: 'badge-warning' },
    approved: { text: '승인', cls: 'badge-info' },
    rejected: { text: '거절', cls: 'badge-danger' },
    canceled: { text: '취소', cls: 'badge' },
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="t-sub">플랫폼 실적과 직접 등록한 과거 이력이 함께 표시됩니다</div>
        <button onClick={() => setAddOpen((v) => !v)} className="btn-primary text-[13px] py-2 px-3">
          {addOpen ? '취소' : '+ 과거 참여이력 추가'}
        </button>
      </div>

      {addOpen && <AddHistoryForm onSubmit={async (input) => { await onAddHistory(input); setAddOpen(false); }} />}

      {rows.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-[15px] font-semibold text-ink mb-2">아직 참여 이력이 없습니다</div>
          <div className="t-sub mb-4">행사에 신청하거나, 과거 참여이력을 직접 등록해보세요</div>
          <Link href="/events" className="btn-primary text-[13px] py-2 px-3">행사 찾기</Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          {rows.map((r, i) => (
            <div key={r.key} className={`p-5 ${i !== rows.length - 1 ? 'border-b border-line-faint' : ''} hover:bg-surface-sunken transition-colors`}>
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {r.kind === 'sale' && <span className="badge badge-success">정산 완료</span>}
                    {r.kind === 'app' && <span className={`badge ${statusMeta[r.status].cls}`}>{statusMeta[r.status].text}</span>}
                    {r.kind === 'history' && <span className="badge">직접 등록</span>}
                  </div>
                  <div className="t-card mb-1 truncate">{r.title}</div>
                  <div className="t-sub">{r.period}</div>
                  {r.kind === 'history' && r.note && <div className="text-[12px] text-text-tertiary mt-1">{r.note}</div>}
                </div>
                <div className="text-right shrink-0">
                  {r.kind === 'sale' && (
                    <>
                      <div className="text-[18px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>₩{r.revenue.toLocaleString()}</div>
                      <div className="text-[11px] text-text-tertiary mt-0.5">{r.orders.toLocaleString()}건 판매</div>
                    </>
                  )}
                  {r.kind === 'app' && r.status === 'approved' && (
                    <button onClick={() => setRecordFor(recordFor === r.appId ? null : r.appId)} className="btn-secondary text-[13px] py-2 px-3">
                      {recordFor === r.appId ? '닫기' : '매출 기록'}
                    </button>
                  )}
                  {r.kind === 'app' && r.status !== 'approved' && <span className="text-[12px] text-text-tertiary">-</span>}
                  {r.kind === 'history' && (
                    <>
                      <div className="text-[16px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>{r.revenue != null ? `₩${r.revenue.toLocaleString()}` : '-'}</div>
                      <div className="text-[11px] text-text-tertiary mt-0.5">{r.orders != null ? `${r.orders.toLocaleString()}건` : '건수 미기재'}</div>
                    </>
                  )}
                </div>
                {r.kind === 'history' && (
                  <button onClick={() => onDeleteHistory(r.historyId)} className="text-[11px] text-text-tertiary hover:text-danger shrink-0 self-start">삭제</button>
                )}
              </div>

              {r.kind === 'app' && r.status === 'approved' && recordFor === r.appId && (
                <RecordSaleForm
                  onSubmit={async (orders, revenue, cost) => {
                    await onRecordSale({ event_id: r.eventId, application_id: r.appId, orders, revenue, cost });
                    setRecordFor(null);
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function AddHistoryForm({ onSubmit }: { onSubmit: (input: { event_name: string; event_date?: string | null; region?: string | null; orders?: number | null; revenue?: number | null; note?: string | null }) => Promise<void> }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [region, setRegion] = useState('');
  const [revenue, setRevenue] = useState('');
  const [orders, setOrders] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        event_name: name.trim(),
        event_date: date || null,
        region: region.trim() || null,
        revenue: revenue ? Number(revenue) : null,
        orders: orders ? Number(orders) : null,
        note: note.trim() || null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mb-4">
      <div className="t-section mb-1">과거 참여이력 직접 등록</div>
      <div className="t-sub mb-4">플랫폼 외부에서 참여한 행사 실적을 등록하면 주최 심사 시 신뢰도가 올라갑니다.</div>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-ink-soft">행사명</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="예: 여의도 봄꽃축제" required />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-ink-soft">참여일 (선택)</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-ink-soft">지역 (선택)</span>
          <input value={region} onChange={(e) => setRegion(e.target.value)} className="input" placeholder="서울 영등포구" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-ink-soft">매출 (선택)</span>
          <input type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} className="input" placeholder="3200000" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-ink-soft">판매건수 (선택)</span>
          <input type="number" value={orders} onChange={(e) => setOrders(e.target.value)} className="input" placeholder="290" />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 mt-3">
        <span className="text-[12px] font-semibold text-ink-soft">비고 (선택)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="예: 3일 운영, 클레임 없음" />
      </label>
      <div className="mt-4">
        <button type="submit" disabled={submitting} className="btn-primary">{submitting ? '등록 중…' : '이력 등록'}</button>
      </div>
    </form>
  );
}

function RecordSaleForm({ onSubmit }: { onSubmit: (orders: number, revenue: number, cost: number) => Promise<void> }) {
  const [orders, setOrders] = useState('');
  const [revenue, setRevenue] = useState('');
  const [cost, setCost] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const profit = revenue ? Number(revenue) - Number(cost || 0) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!orders || !revenue) return;
    setSubmitting(true);
    try {
      await onSubmit(Number(orders), Number(revenue), Number(cost || 0));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 pt-4 border-t border-line-faint">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-ink-soft">판매건수</span>
          <input type="number" value={orders} onChange={(e) => setOrders(e.target.value)} className="input" placeholder="290" required />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-ink-soft">매출</span>
          <input type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} className="input" placeholder="3200000" required />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-ink-soft">비용 (선택)</span>
          <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="input" placeholder="재료·인건 등" />
        </label>
      </div>
      {profit !== null && (
        <div className="flex items-center justify-between mt-3 p-3 rounded-input" style={{ background: 'var(--bg-surface-sunken, #FDFBF6)' }}>
          <span className="text-[12px] font-semibold text-ink-soft">예상 순익 (매출 − 비용)</span>
          <span className={`text-[15px] font-extrabold ${profit >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
            ₩{profit.toLocaleString()}
          </span>
        </div>
      )}
      <button type="submit" disabled={submitting} className="btn-primary w-full mt-3">{submitting ? '기록 중…' : '매출·순익 기록'}</button>
    </form>
  );
}

function SalesTab({ loading, sales }: { loading: boolean; sales: SaleWithEvent[] }) {
  if (loading) return <LoadingCard />;

  if (sales.length === 0) {
    return (
      <div className="card text-center py-16">
        <div className="text-[15px] font-semibold text-ink mb-2">아직 기록된 매출이 없습니다</div>
        <div className="t-sub">행사 참여 후 참여 이력 탭에서 매출을 기록하면 월별로 집계됩니다</div>
      </div>
    );
  }

  // 월별 집계 (입점 파트너가 직접 기록한 매출·비용 기반)
  const byMonth: Record<string, { revenue: number; cost: number; count: number }> = {};
  sales.forEach((s) => {
    const m = s.recorded_at.slice(0, 7); // YYYY-MM
    if (!byMonth[m]) byMonth[m] = { revenue: 0, cost: 0, count: 0 };
    byMonth[m].revenue += s.revenue;
    byMonth[m].cost += s.cost ?? 0;
    byMonth[m].count += 1;
  });
  const monthRows = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b));
  const maxMonth = Math.max(...Object.values(byMonth).map((v) => v.revenue), 1);
  const totalRevenue = sales.reduce((s, r) => s + r.revenue, 0);
  const totalCost = sales.reduce((s, r) => s + (r.cost ?? 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const hasCost = totalCost > 0;

  return (
    <div className="card">
      <div className="flex items-baseline justify-between mb-4">
        <div className="t-section">월별 매출{hasCost ? ' · 순익' : ''}</div>
        <div className="text-right">
          <div className="text-[16px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>
            ₩{totalRevenue.toLocaleString()} <span className="text-[12px] font-semibold text-text-tertiary">매출</span>
          </div>
          {hasCost && (
            <div className={`text-[12px] font-bold ${totalProfit >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
              순익 ₩{totalProfit.toLocaleString()}
            </div>
          )}
        </div>
      </div>
      <div className="t-sub mb-5">행사 참여 후 직접 기록한 매출{hasCost ? '·비용' : ''}을 월별로 집계합니다.</div>
      <div className="space-y-3.5">
        {monthRows.map(([m, v]) => {
          const label = `${parseInt(m.slice(0, 4), 10)}.${m.slice(5, 7)}`;
          const profit = v.revenue - v.cost;
          return (
            <div key={m}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-[13px] font-semibold text-ink">{label} <span className="text-[11px] font-normal text-text-tertiary">· {v.count}회</span></span>
                <span className="text-[13px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  ₩{v.revenue.toLocaleString()}
                  {v.cost > 0 && <span className={`ml-2 text-[11px] font-bold ${profit >= 0 ? 'text-success' : 'text-danger'}`}>순익 ₩{profit.toLocaleString()}</span>}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-pill overflow-hidden">
                <div className="h-full bg-accent" style={{ width: `${(v.revenue / maxMonth) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MenuTab({
  loading, menus, profile, onCreate, onUpdate, onToggleSignature, onUploadImage, onDelete,
}: {
  loading: boolean;
  menus: Menu[];
  profile: Profile | null;
  onCreate: (input: Omit<Menu, 'id' | 'created_at' | 'seller_id'>) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Pick<Menu, 'name' | 'price' | 'cost' | 'category' | 'description'>>) => Promise<void>;
  onToggleSignature: (id: string, signature: boolean) => Promise<void>;
  onUploadImage: (id: string, file: File) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState<Menu['category']>('MAIN');
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const sigCount = menus.filter((m) => m.signature).length;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price || !profile) return;
    setSubmitting(true);
    try {
      const autoCost = cost ? Number(cost) : Math.round(Number(price) * 0.35); // 비우면 판매가 35%
      await onCreate({ name: name.trim(), price: Number(price), cost: autoCost, category, description: desc.trim() || null });
      setName(''); setPrice(''); setCost(''); setDesc(''); setCategory('MAIN'); setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingCard />;

  return (
    <>
      <div className="flex items-center justify-between mb-1 gap-2">
        <div className="t-sub">등록 메뉴 {menus.length}개 · 대표 {sigCount}/2</div>
        <div className="flex items-center gap-2">
          {menus.length > 0 && (
            <div className="inline-flex rounded-input overflow-hidden border border-line-strong text-[12px] font-bold">
              <button onClick={() => setView('grid')} className={`px-2.5 py-1.5 ${view === 'grid' ? 'bg-ink text-page/95' : 'bg-surface text-ink-soft'}`}>이미지형</button>
              <button onClick={() => setView('list')} className={`px-2.5 py-1.5 ${view === 'list' ? 'bg-ink text-page/95' : 'bg-surface text-ink-soft'}`}>리스트형</button>
            </div>
          )}
          <button onClick={() => setShowForm((v) => !v)} className="btn-primary text-[13px] py-2 px-3">
            {showForm ? '취소' : '+ 메뉴 추가'}
          </button>
        </div>
      </div>
      <div className="text-[12px] text-text-tertiary mb-4">사진·설명이 등록된 메뉴는 심사 통과율이 높습니다. 원가를 비우면 판매가의 35%로 자동 계산됩니다.</div>

      {showForm && (
        <form onSubmit={handleAdd} className="card mb-4 flex flex-col gap-3">
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-ink-soft">메뉴명</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="예: 치즈 떡볶이" required />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-ink-soft">판매가</span>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="input" placeholder="8000" required />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-ink-soft">원가 (선택)</span>
              <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="input" placeholder="비우면 자동" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-ink-soft">카테고리</span>
              <select value={category} onChange={(e) => setCategory(e.target.value as Menu['category'])} className="input">
                <option value="MAIN">메인</option>
                <option value="SIDE">사이드</option>
                <option value="DRINK">음료</option>
                <option value="SET">세트</option>
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-ink-soft">한 줄 설명 (선택)</span>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} className="input" placeholder="예: 쫄깃한 떡에 모차렐라를 듬뿍" />
          </label>
          <button type="submit" disabled={submitting} className="btn-primary self-start">
            {submitting ? '추가 중…' : '메뉴 등록'}
          </button>
        </form>
      )}

      {menus.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-[15px] font-semibold text-ink mb-2">등록된 메뉴가 없습니다</div>
          <div className="t-sub">메뉴를 등록하면 신청 시 자동 첨부됩니다</div>
        </div>
      ) : view === 'grid' ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {menus.map((m) => (
            <MenuCard
              key={m.id}
              menu={m}
              sigCount={sigCount}
              layout="grid"
              onUpdate={onUpdate}
              onToggleSignature={onToggleSignature}
              onUploadImage={onUploadImage}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {menus.map((m) => (
            <MenuCard
              key={m.id}
              menu={m}
              sigCount={sigCount}
              layout="list"
              onUpdate={onUpdate}
              onToggleSignature={onToggleSignature}
              onUploadImage={onUploadImage}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </>
  );
}

function MenuCard({
  menu: m, sigCount, onUpdate, onToggleSignature, onUploadImage, onDelete, layout = 'grid',
}: {
  menu: Menu;
  sigCount: number;
  layout?: 'grid' | 'list';
  onUpdate: (id: string, patch: Partial<Pick<Menu, 'name' | 'price' | 'cost' | 'category' | 'description'>>) => Promise<void>;
  onToggleSignature: (id: string, signature: boolean) => Promise<void>;
  onUploadImage: (id: string, file: File) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(m.name);
  const [price, setPrice] = useState(String(m.price));
  const [cost, setCost] = useState(String(m.cost));
  const [desc, setDesc] = useState(m.description ?? '');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const margin = m.price > 0 ? Math.round(((m.price - m.cost) / m.price) * 100) : 0;
  const emoji = m.category === 'MAIN' ? '🍽️' : m.category === 'SIDE' ? '🍤' : m.category === 'DRINK' ? '🥤' : '🎁';

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { await onUploadImage(m.id, file); }
    catch (err) { alert('사진 업로드 실패: ' + (err as Error).message + '\n(menu-photos 버킷이 필요합니다)'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function saveEdit() {
    setBusy(true);
    try {
      await onUpdate(m.id, { name: name.trim() || m.name, price: Number(price) || m.price, cost: Number(cost) || 0, description: desc.trim() || null });
      setEditing(false);
    } catch (e) { alert('수정 실패: ' + (e as Error).message); }
    finally { setBusy(false); }
  }

  async function toggleSig() {
    if (!m.signature && sigCount >= 2) { alert('대표 메뉴는 최대 2개까지 지정할 수 있습니다.'); return; }
    setBusy(true);
    try { await onToggleSignature(m.id, !m.signature); }
    finally { setBusy(false); }
  }

  if (layout === 'list') {
    return (
      <div className="card p-3">
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-input overflow-hidden bg-muted-2 shrink-0 flex items-center justify-center">
            {m.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[22px]">{emoji}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {m.signature && <span className="badge badge-warning shrink-0">★ 대표</span>}
              <span className="text-[14px] font-bold text-ink truncate">{m.name}</span>
            </div>
            {m.description && <div className="text-[12px] text-text-secondary truncate">{m.description}</div>}
            <div className="text-[12px] text-text-secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>
              ₩{m.price.toLocaleString()}{m.cost > 0 && ` · 마진 ${margin}%`}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="text-[11px] font-bold py-1.5 px-2 rounded-[7px] bg-surface-sunken text-ink-soft hover:bg-muted">{uploading ? '…' : '사진'}</button>
            <button onClick={toggleSig} disabled={busy} className={`text-[11px] font-bold py-1.5 px-2 rounded-[7px] ${m.signature ? 'bg-ink text-page/95' : 'bg-surface-sunken text-ink-soft hover:bg-muted'}`}>{m.signature ? '대표해제' : '대표'}</button>
            <button onClick={() => setEditing((v) => !v)} className="text-[11px] font-bold py-1.5 px-2 rounded-[7px] bg-surface-sunken text-ink-soft hover:bg-muted">{editing ? '닫기' : '수정'}</button>
            <button onClick={() => onDelete(m.id)} className="text-[11px] font-bold py-1.5 px-2 rounded-[7px] text-text-tertiary hover:text-danger">삭제</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} className="hidden" />
        </div>
        {editing && (
          <div className="mt-3 pt-3 border-t border-line-faint flex flex-col gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} className="input text-[13px]" placeholder="메뉴명" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="input text-[13px]" placeholder="판매가" />
              <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="input text-[13px]" placeholder="원가" />
            </div>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} className="input text-[13px]" placeholder="한 줄 설명" />
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={busy} className="btn-primary flex-1 text-[13px] py-2">저장</button>
              <button onClick={() => setEditing(false)} className="btn-secondary flex-1 text-[13px] py-2">취소</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card p-4">
      {/* 사진 슬롯 */}
      <div className="relative w-full aspect-square rounded-input overflow-hidden bg-muted-2 mb-3">
        {m.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[36px]">{emoji}</div>
        )}
        {m.signature && (
          <span className="absolute top-2 left-2 badge badge-warning">★ 대표</span>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-2 right-2 text-[11px] font-bold px-2 py-1 rounded-[7px] bg-ink text-page/95"
        >
          {uploading ? '올리는 중…' : m.image_url ? '사진 변경' : '사진 추가'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} className="hidden" />
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input text-[13px]" placeholder="메뉴명" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="input text-[13px]" placeholder="판매가" />
            <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="input text-[13px]" placeholder="원가" />
          </div>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} className="input text-[13px]" placeholder="한 줄 설명" />
          <div className="flex gap-2">
            <button onClick={saveEdit} disabled={busy} className="btn-primary flex-1 text-[13px] py-2">저장</button>
            <button onClick={() => setEditing(false)} className="btn-secondary flex-1 text-[13px] py-2">취소</button>
          </div>
        </div>
      ) : (
        <>
          <div className="t-card text-[15px] mb-0.5 truncate">{m.name}</div>
          {m.description && <div className="text-[12px] text-text-secondary line-clamp-2 mb-1.5">{m.description}</div>}
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>₩{m.price.toLocaleString()}</span>
            {m.cost > 0 && <span className="text-[11px] font-semibold text-text-tertiary">원가 ₩{m.cost.toLocaleString()} · 마진 {margin}%</span>}
          </div>
          <div className="flex gap-1.5 mt-3">
            <button onClick={toggleSig} disabled={busy} className={`flex-1 text-[11px] font-bold py-1.5 rounded-[7px] transition-colors ${m.signature ? 'bg-ink text-page/95' : 'bg-surface-sunken text-ink-soft hover:bg-muted'}`}>
              {m.signature ? '대표 해제' : '대표 지정'}
            </button>
            <button onClick={() => setEditing(true)} className="flex-1 text-[11px] font-bold py-1.5 rounded-[7px] bg-surface-sunken text-ink-soft hover:bg-muted">수정</button>
            <button onClick={() => onDelete(m.id)} className="text-[11px] font-bold py-1.5 px-2 rounded-[7px] text-text-tertiary hover:text-danger">삭제</button>
          </div>
        </>
      )}
    </div>
  );
}

/** 매장 정보 (설계 06) · 항목별 공개 토글 + 저장 */
function StoreTab({
  loading, profile, onSave,
}: {
  loading: boolean;
  profile: Profile | null;
  onSave: (patch: Partial<Profile>) => Promise<void>;
}) {
  const [f, setF] = useState(() => fromProfile(profile));
  const [share, setShare] = useState<ShareFlags>(profile?.share_flags ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setF(fromProfile(profile));
    setShare(profile?.share_flags ?? {});
  }, [profile]);

  function set<K extends keyof StoreFields>(k: K, v: StoreFields[K]) { setF((p) => ({ ...p, [k]: v })); }
  function toggleShare(key: string) { setShare((p) => ({ ...p, [key]: p[key] === false ? true : false })); }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await onSave({
        business_name: f.business_name || null,
        name: f.name || undefined,
        business_no: f.business_no || null,
        phone: f.phone || null,
        region: f.region || null,
        affiliation: f.affiliation || null,
        vehicle: f.vehicle || null,
        power: f.power || null,
        cooking: f.cooking || null,
        hygiene_gear: f.hygiene_gear || null,
        crew: f.crew || null,
        sns: f.sns || null,
        intro: f.intro || null,
        share_flags: share,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      alert('저장 실패: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingCard />;

  const publicCount = STORE_SHAREABLE.filter((s) => share[s.key] !== false).length;

  return (
    <div className="card">
      <div className="flex items-baseline justify-between mb-1">
        <div className="t-section">매장 정보</div>
        <span className="text-[12px] text-text-tertiary">주최 공개 {publicCount}/{STORE_SHAREABLE.length}항목</span>
      </div>
      <div className="t-sub mb-5">항목별로 신청서에 넣을지 직접 고르세요. 끈 항목은 주최에게 &lsquo;비공개&rsquo;로 표시됩니다.</div>

      {/* 항상 공개 (필수) */}
      <StoreField label="상호" value={f.business_name} onChange={(v) => set('business_name', v)} always required placeholder="예: 민지네 분식차" />
      <StoreField label="대표자" value={f.name} onChange={(v) => set('name', v)} always required placeholder="예: 김민지" />
      <StoreField label="활동 지역" value={f.region} onChange={(v) => set('region', v)} always required placeholder="예: 서울 성동구" />

      {/* 공개 토글 */}
      {STORE_SHAREABLE.map((s) => (
        <StoreField
          key={s.key}
          label={s.label}
          placeholder={s.placeholder}
          value={f[s.field]}
          onChange={(v) => set(s.field, v)}
          required={s.required}
          shareOn={share[s.key] !== false}
          onToggle={() => toggleShare(s.key)}
          textarea={s.field === 'intro'}
        />
      ))}

      <div className="flex items-center gap-3 mt-5">
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? '저장 중…' : '매장 정보 저장'}</button>
        {saved && <span className="text-[13px] font-semibold text-success">✓ 저장되었습니다</span>}
      </div>
    </div>
  );
}

interface StoreFields {
  business_name: string; name: string; business_no: string; phone: string; region: string;
  affiliation: string; vehicle: string; power: string; cooking: string; hygiene_gear: string; crew: string; sns: string; intro: string;
}
function fromProfile(p: Profile | null): StoreFields {
  return {
    business_name: p?.business_name ?? '', name: p?.name ?? '', business_no: p?.business_no ?? '',
    phone: p?.phone ?? '', region: p?.region ?? '', affiliation: p?.affiliation ?? '',
    vehicle: p?.vehicle ?? '', power: p?.power ?? '', cooking: p?.cooking ?? '',
    hygiene_gear: p?.hygiene_gear ?? '', crew: p?.crew ?? '', sns: p?.sns ?? '', intro: p?.intro ?? '',
  };
}
const STORE_SHAREABLE: { key: string; label: string; field: keyof StoreFields; placeholder: string; required?: boolean }[] = [
  { key: 'biz_no', label: '사업자등록번호', field: 'business_no', placeholder: '214-05-88931', required: true },
  { key: 'phone', label: '연락처', field: 'phone', placeholder: '010-0000-0000', required: true },
  { key: 'affiliation', label: '소속', field: 'affiliation', placeholder: '예: 전국음식사업자협회' },
  { key: 'vehicle', label: '차량·부스 규격', field: 'vehicle', placeholder: '예: 3.5t 개조 푸드트럭 · 5.2×2.1m', required: true },
  { key: 'power', label: '전기 사용량', field: 'power', placeholder: '예: 3kW · 자체 발전기 보유', required: true },
  { key: 'cooking', label: '조리 설비', field: 'cooking', placeholder: '예: 가스 2구 + 전기 튀김기 1대', required: true },
  { key: 'hygiene_gear', label: '위생 관리', field: 'hygiene_gear', placeholder: '예: 마스크·모자·장갑 상시 착용', required: true },
  { key: 'crew', label: '운영 인원', field: 'crew', placeholder: '예: 상시 2명 (주말 3명)' },
  { key: 'sns', label: 'SNS', field: 'sns', placeholder: '예: @minji_bunsik · 팔로워 8,400' },
  { key: 'intro', label: '매장 소개', field: 'intro', placeholder: '어떤 매장인지 짧게 소개해주세요' },
];

function StoreField({
  label, value, onChange, placeholder, always, shareOn, onToggle, textarea, required,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  always?: boolean; shareOn?: boolean; onToggle?: () => void; textarea?: boolean; required?: boolean;
}) {
  const missing = required && !value.trim();
  return (
    <div className="py-3 border-b border-line-faint last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-semibold text-ink-soft">
          {label}
          {required
            ? <span className="text-danger ml-0.5">*</span>
            : <span className="text-text-tertiary font-normal ml-1.5">· 선택</span>}
          {missing && <span className="text-[11px] font-bold text-danger ml-2">미입력</span>}
        </span>
        {always ? (
          <span className="badge">항상 공개</span>
        ) : (
          <button
            onClick={onToggle}
            className={`badge ${shareOn ? 'badge-success' : ''}`}
            style={!shareOn ? { background: 'var(--bg-muted)', color: 'var(--text-tertiary)' } : undefined}
          >
            {shareOn ? '공개' : '비공개'}
          </button>
        )}
      </div>
      {textarea ? (
        <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} className="input resize-none text-[14px]" placeholder={placeholder} style={missing ? { borderColor: '#C7503E' } : undefined} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="input text-[14px]" placeholder={placeholder} style={missing ? { borderColor: '#C7503E' } : undefined} />
      )}
    </div>
  );
}

/** 받은 주최사 평가 (설계 06) */
function RatingsTab({ loading, ratings, summary }: { loading: boolean; ratings: RatingWithRelations[]; summary: RatingSummary | null }) {
  if (loading) return <LoadingCard />;
  return (
    <div className="card">
      <div className="flex items-baseline justify-between mb-1">
        <div className="t-section">받은 주최사 평가 {ratings.length > 0 && <span className="text-text-tertiary text-[14px]">{ratings.length}건</span>}</div>
        {summary && summary.review_count > 0 && <span className="text-[15px] font-extrabold text-ink">★ {summary.avg_score}</span>}
      </div>
      <div className="t-sub mb-4">주최사가 남긴 평가입니다.</div>
      {ratings.length === 0 ? (
        <div className="text-center py-12 text-[13px] text-text-tertiary">아직 받은 평가가 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {ratings.map((r) => {
            const host = r.host?.business_name || r.host?.name || '주최';
            const avg = ((r.hygiene + r.punctual + r.service) / 3).toFixed(1);
            return (
              <div key={r.id} className="p-4 rounded-input" style={{ background: 'var(--bg-surface-sunken, #FDFBF6)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[14px] font-bold text-ink">{host}
                      {r.event?.name && <span className="text-[12px] font-normal text-text-tertiary"> · {r.event.name}</span>}
                    </div>
                    <div className="text-[11px] text-text-tertiary mt-0.5">
                      위생 {r.hygiene} · 시간 {r.punctual} · 응대 {r.service} · {r.created_at.slice(0, 10).replace(/-/g, '.')}
                    </div>
                  </div>
                  <span className="text-[15px] font-extrabold text-ink shrink-0">{avg}</span>
                </div>
                {r.comment && <div className="text-[13px] text-ink-soft mt-2 leading-relaxed">{r.comment}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="card">
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
    </div>
  );
}
