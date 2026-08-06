'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import {
  fetchMyApplications,
  fetchMyMenus,
  fetchMyProfile,
  fetchMySales,
  createMenu,
  deleteMenu,
  fetchSellerHistory,
  createSellerHistory,
  deleteSellerHistory,
  recordSale,
} from '@/lib/supabase/queries';
import { periodLabel } from '@/lib/types';
import type { ApplicationWithRelations, Menu, Profile, SaleWithEvent, SellerHistory } from '@/lib/types';

/**
 * 셀러 마이페이지 · Supabase 연동
 * 3 탭: 참여 이력(applications+sales) · 매출 요약 · 메뉴 관리(CRUD)
 */

type Tab = 'history' | 'sales' | 'menu';

export default function SellerMyPage() {
  const [tab, setTab] = useState<Tab>('history');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<ApplicationWithRelations[]>([]);
  const [sales, setSales] = useState<SaleWithEvent[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [history, setHistory] = useState<SellerHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const p = await fetchMyProfile();
      setProfile(p);
      if (p) {
        const [a, s, m, h] = await Promise.all([
          fetchMyApplications(p.id),
          fetchMySales(p.id),
          fetchMyMenus(p.id),
          fetchSellerHistory(p.id),
        ]);
        setApplications(a);
        setSales(s);
        setMenus(m);
        setHistory(h);
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
            </div>
          </div>
          <Link href="/settings" className="btn-secondary hidden sm:inline-flex">프로필 수정</Link>
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
        <div className="inline-flex bg-muted rounded-input p-1 mb-6">
          <TabBtn active={tab === 'history'} onClick={() => setTab('history')}>참여 이력 ({applications.length + sales.length + history.length})</TabBtn>
          <TabBtn active={tab === 'sales'} onClick={() => setTab('sales')}>매출 요약</TabBtn>
          <TabBtn active={tab === 'menu'} onClick={() => setTab('menu')}>메뉴 관리 ({menus.length})</TabBtn>
        </div>

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
  onRecordSale: (input: { event_id: string; application_id?: string | null; orders: number; revenue: number; note?: string | null }) => Promise<void>;
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
                  onSubmit={async (orders, revenue) => {
                    await onRecordSale({ event_id: r.eventId, application_id: r.appId, orders, revenue });
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

function RecordSaleForm({ onSubmit }: { onSubmit: (orders: number, revenue: number) => Promise<void> }) {
  const [orders, setOrders] = useState('');
  const [revenue, setRevenue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!orders || !revenue) return;
    setSubmitting(true);
    try {
      await onSubmit(Number(orders), Number(revenue));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 pt-4 border-t border-line-faint grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold text-ink-soft">판매건수</span>
        <input type="number" value={orders} onChange={(e) => setOrders(e.target.value)} className="input" placeholder="290" required />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold text-ink-soft">매출</span>
        <input type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} className="input" placeholder="3200000" required />
      </label>
      <div className="flex items-end">
        <button type="submit" disabled={submitting} className="btn-primary w-full">{submitting ? '기록 중…' : '매출 기록'}</button>
      </div>
    </form>
  );
}

function SalesTab({ loading, sales }: { loading: boolean; sales: SaleWithEvent[] }) {
  if (loading) return <LoadingCard />;

  if (sales.length === 0) {
    return (
      <div className="card text-center py-16">
        <div className="text-[15px] font-semibold text-ink mb-2">매출 기록이 없습니다</div>
        <div className="t-sub">행사 종료 후 정산 데이터가 자동 기록됩니다</div>
      </div>
    );
  }

  // 월별 집계
  const byMonth: Record<string, number> = {};
  sales.forEach((s) => {
    const m = s.recorded_at.slice(0, 7); // YYYY-MM
    byMonth[m] = (byMonth[m] ?? 0) + s.revenue;
  });
  const monthRows = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b));
  const maxMonth = Math.max(...Object.values(byMonth), 1);

  const totalRevenue = sales.reduce((s, r) => s + r.revenue, 0);
  const qrShare = 82; // TODO: 실 데이터 컬럼 확장 시 sale.by_method 기반 계산

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
      <div className="card">
        <div className="t-section mb-4">월별 매출</div>
        <div className="space-y-3">
          {monthRows.map(([m, v]) => {
            const label = `${parseInt(m.slice(5, 7), 10)}월`;
            return (
              <div key={m}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[13px] font-semibold text-ink">{label}</span>
                  <span className="text-[13px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>₩{v.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-muted rounded-pill overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${(v / maxMonth) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="t-section mb-4">결제 수단 비중 (추정)</div>
        <div className="space-y-4">
          <PayMethodRow label="QR결제" value={qrShare} amount={Math.round(totalRevenue * qrShare / 100)} />
          <PayMethodRow label="카드결제" value={12} amount={Math.round(totalRevenue * 0.12)} />
          <PayMethodRow label="현금 (신고)" value={100 - qrShare - 12} amount={Math.round(totalRevenue * (100 - qrShare - 12) / 100)} />
        </div>
        <div className="mt-5 p-3 rounded-input bg-success-bg border border-success/20">
          <div className="text-[12px] font-bold text-success">{qrShare >= 80 ? '우선권 대상' : 'QR 비중 확대 권장'} · QR {qrShare}%</div>
          <div className="text-[11px] text-success mt-0.5">80% 이상 유지 시 다음 회차 우선 배정</div>
        </div>
      </div>
    </div>
  );
}

function PayMethodRow({ label, value, amount }: { label: string; value: number; amount: number }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-[13px] font-semibold text-ink">{label}</span>
        <span className="text-[13px] font-semibold text-text-secondary">
          <span className="font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}%</span>
          <span className="mx-2 text-line">|</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>₩{amount.toLocaleString()}</span>
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-pill overflow-hidden">
        <div className={`h-full ${label === 'QR결제' ? 'bg-accent' : label === '카드결제' ? 'bg-info-bar' : 'bg-warning'}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function MenuTab({
  loading, menus, profile, onCreate, onDelete,
}: {
  loading: boolean;
  menus: Menu[];
  profile: Profile | null;
  onCreate: (input: Omit<Menu, 'id' | 'created_at' | 'seller_id'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [category, setCategory] = useState<Menu['category']>('MAIN');
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price || !profile) return;
    setSubmitting(true);
    try {
      await onCreate({ name: name.trim(), price: Number(price), cost: Number(cost || 0), category });
      setName(''); setPrice(''); setCost(''); setCategory('MAIN'); setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingCard />;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="t-sub">등록 메뉴 {menus.length}개</div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary text-[13px] py-2 px-3">
          {showForm ? '취소' : '+ 메뉴 추가'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="card mb-4 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
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
            <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="input" placeholder="2800" />
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
          <div className="flex items-end">
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? '추가 중…' : '추가'}
            </button>
          </div>
        </form>
      )}

      {menus.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-[15px] font-semibold text-ink mb-2">등록된 메뉴가 없습니다</div>
          <div className="t-sub">메뉴를 등록하면 신청 시 자동 첨부됩니다</div>
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {menus.map((m) => (
            <div key={m.id} className="card p-4">
              <div className="w-full aspect-square rounded-input bg-muted-2 flex items-center justify-center text-[36px] mb-3">
                {m.category === 'MAIN' ? '🍽️' : m.category === 'SIDE' ? '🍤' : m.category === 'DRINK' ? '🥤' : '🎁'}
              </div>
              <div className="t-card text-[15px] mb-1 truncate">{m.name}</div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[14px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>₩{m.price.toLocaleString()}</span>
                {m.cost > 0 && (
                  <span className="text-[11px] font-semibold text-text-tertiary">
                    마진 {Math.round(((m.price - m.cost) / m.price) * 100)}%
                  </span>
                )}
              </div>
              <button
                onClick={() => onDelete(m.id)}
                className="mt-3 w-full text-[11px] text-text-tertiary hover:text-danger py-1 transition-colors"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </>
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
