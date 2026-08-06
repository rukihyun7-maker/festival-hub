'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import {
  fetchAdminOverview,
  fetchMonthlyGmv,
  fetchMyProfile,
  fetchRecentActivity,
  fetchTopSellers,
  type AdminOverview,
  type MonthlyGmvRow,
  type TopSeller,
  type ActivityRow,
} from '@/lib/supabase/queries';
import type { Profile } from '@/lib/types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * 관리자 인사이트 · Supabase 연동
 * 관리자만 접근 가능. RLS 정책이 seller/host의 접근을 차단하지만
 * 클라이언트에서도 role 체크로 UX 방어.
 */
export default function AdminInsightsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [monthlyGmv, setMonthlyGmv] = useState<MonthlyGmvRow[]>([]);
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchMyProfile();
        setProfile(p);
        if (p?.role === 'admin') {
          const [o, g, t, a] = await Promise.all([
            fetchAdminOverview(),
            fetchMonthlyGmv(6),
            fetchTopSellers(5),
            fetchRecentActivity(12),
          ]);
          setOverview(o);
          setMonthlyGmv(g);
          setTopSellers(t);
          setActivity(a);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="admin" />
        <div className="container-app py-12">
          <div className="animate-pulse space-y-4 max-w-[720px]">
            <div className="h-4 bg-muted rounded w-32" />
            <div className="h-8 bg-muted rounded w-2/3" />
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
          <div className="card">
            <div className="text-[16px] font-bold text-ink mb-2">관리자 권한이 필요합니다</div>
            <div className="text-[13px] text-text-secondary mb-4">
              현재 계정({profile?.role ?? '비로그인'})으로는 이 페이지에 접근할 수 없습니다.
            </div>
            <Link href="/login" className="btn-primary">관리자로 로그인 →</Link>
          </div>
        </div>
      </main>
    );
  }

  if (!overview) {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="admin" />
        <div className="container-app py-12">
          <div className="card">
            <div className="text-[16px] font-bold text-danger mb-2">데이터 로드 실패</div>
            <div className="text-[13px] text-text-secondary">{error ?? '알 수 없는 오류'}</div>
          </div>
        </div>
      </main>
    );
  }

  const approvalRate = overview.applications.total > 0
    ? Math.round((overview.applications.approved / overview.applications.total) * 100)
    : 0;
  const platformFee = Math.round(overview.sales.totalGmv * 0.05);
  const monthlyRun = Math.round(overview.sales.recentGmv * 12);
  const maxRegion = Math.max(...overview.regions.map((r) => r.count), 1);

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="admin" />

      <div className="container-app py-8 md:py-12">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-[13px] font-semibold uppercase tracking-[0.05em] text-accent-warm mb-2">관리자 인사이트</div>
            <h1 className="t-title">플랫폼 전체 현황</h1>
            <p className="t-sub mt-1">실시간 지표 · 최근 30일 GMV 기준</p>
          </div>
          <div className="hidden md:flex gap-2">
            <button className="btn-secondary">CSV 내보내기</button>
          </div>
        </div>

        {/* 최상위 KPI 4개 */}
        <div className="grid gap-3 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <BigKpi
            label="누적 GMV"
            value={`₩${overview.sales.totalGmv.toLocaleString()}`}
            delta={`최근 30일 ₩${overview.sales.recentGmv.toLocaleString()}`}
            highlight
          />
          <BigKpi
            label="플랫폼 수수료"
            value={`₩${platformFee.toLocaleString()}`}
            delta={`5% 기준 · 연환산 ₩${Math.round(monthlyRun * 0.05).toLocaleString()}`}
          />
          <BigKpi
            label="사용자"
            value={overview.users.total.toString()}
            delta={`파트너 ${overview.users.seller} · 주최 ${overview.users.host} · 신규 ${overview.users.newLast7d}(7일)`}
          />
          <BigKpi
            label="승인률"
            value={`${approvalRate}%`}
            delta={`대기 ${overview.applications.pending} · 승인 ${overview.applications.approved} · 거절 ${overview.applications.rejected}`}
            tone={approvalRate >= 70 ? 'success' : approvalRate >= 40 ? 'warn' : 'danger'}
          />
        </div>

        {/* GMV 추이 · Recharts */}
        <div className="card mb-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="t-section">월별 GMV 추이</div>
              <div className="t-sub mt-1">최근 6개월 · 매출 & 주문 건수</div>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-[11px] text-text-tertiary">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-accent" /> GMV
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-ink" /> 주문
              </span>
            </div>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={monthlyGmv} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gmvFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFC800" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#FFC800" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="orderFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14120E" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#14120E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE8DC" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6F675A' }} tickLine={false} axisLine={{ stroke: '#E0DACB' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6F675A' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${Math.round(v / 1_000)}k` : String(v)}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    name === 'gmv' ? `₩${v.toLocaleString()}` : `${v.toLocaleString()}건`,
                    name === 'gmv' ? 'GMV' : '주문',
                  ]}
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid #E7E2D6',
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: '0 16px 40px rgba(20,18,14,0.16)',
                  }}
                  cursor={{ stroke: '#14120E', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="gmv" stroke="#FFC800" strokeWidth={2.5} fill="url(#gmvFill)" activeDot={{ r: 5, fill: '#14120E' }} />
                <Area type="monotone" dataKey="orders" stroke="#14120E" strokeWidth={1.5} fill="url(#orderFill)" strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {monthlyGmv.every((r) => r.gmv === 0) && (
            <div className="mt-3 text-[11px] text-text-tertiary text-center">
              최근 6개월 매출 데이터 없음 · 시드 실행 확인 필요
            </div>
          )}
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {/* 사용자 브레이크다운 */}
          <div className="card">
            <div className="t-section mb-4">사용자 · 역할별</div>
            <div className="space-y-4">
              <RoleBar label="입점 파트너" count={overview.users.seller} total={overview.users.total} color="bg-accent" />
              <RoleBar label="행사 주최" count={overview.users.host} total={overview.users.total} color="bg-info-bar" />
              <RoleBar label="관리자" count={overview.users.admin} total={overview.users.total} color="bg-ink" />
            </div>
            <div className="mt-5 p-3 rounded-input bg-surface-sunken border border-line-faint">
              <div className="text-[12px] font-bold text-ink mb-1">지난 7일 신규 가입</div>
              <div className="text-[24px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>
                +{overview.users.newLast7d}
              </div>
            </div>
          </div>

          {/* 행사 상태 */}
          <div className="card">
            <div className="t-section mb-4">행사 · 상태별</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-input bg-surface-sunken">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-[13px] font-semibold text-ink">모집 중 (open)</span>
                </div>
                <span className="text-[16px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>{overview.events.open}건</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-input bg-surface-sunken">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-info-bar" />
                  <span className="text-[13px] font-semibold text-ink">예정 (upcoming)</span>
                </div>
                <span className="text-[16px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>{overview.events.upcoming}건</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-input bg-surface-sunken">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-text-tertiary" />
                  <span className="text-[13px] font-semibold text-ink">종료 (close)</span>
                </div>
                <span className="text-[16px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>{overview.events.close}건</span>
              </div>
            </div>
            <div className="mt-5 text-[11px] text-text-tertiary">총 {overview.events.total}건 등록</div>
          </div>

          {/* 지역 분포 */}
          <div className="card">
            <div className="t-section mb-4">지역별 행사</div>
            {overview.regions.length === 0 ? (
              <div className="text-[13px] text-text-tertiary text-center py-6">지역 데이터 없음</div>
            ) : (
              <div className="space-y-3">
                {overview.regions.map((r) => (
                  <div key={r.region}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[13px] font-semibold text-ink">{r.region}</span>
                      <span className="text-[13px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>{r.count}건</span>
                    </div>
                    <div className="h-2 bg-muted rounded-pill overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: `${(r.count / maxRegion) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top 셀러 · 최근 활동 */}
        <div className="grid gap-6 mt-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
          {/* Top 셀러 */}
          <div className="card">
            <div className="flex items-end justify-between mb-4">
              <div className="t-section">Top 파트너 (누적 매출)</div>
              <span className="text-[11px] font-semibold text-text-tertiary">최대 5명</span>
            </div>
            {topSellers.length === 0 ? (
              <div className="text-[13px] text-text-tertiary text-center py-12">매출 이력 있는 파트너 없음</div>
            ) : (
              <div className="space-y-1">
                {topSellers.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-input hover:bg-surface-sunken transition-colors">
                    <div className={`w-7 h-7 rounded-pill flex items-center justify-center font-extrabold text-[13px] shrink-0 ${
                      i === 0 ? 'bg-accent text-ink' : 'bg-muted text-ink-soft'
                    }`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-bold text-ink truncate">{s.business_name ?? s.name}</div>
                      <div className="text-[11px] text-text-tertiary">
                        {s.name}{s.region && ` · ${s.region}`} · {s.saleCount}회 참여
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[14px] font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        ₩{s.totalRevenue.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 최근 활동 */}
          <div className="card">
            <div className="flex items-end justify-between mb-4">
              <div className="t-section">최근 활동</div>
              <span className="text-[11px] font-semibold text-text-tertiary">최대 12건</span>
            </div>
            {activity.length === 0 ? (
              <div className="text-[13px] text-text-tertiary text-center py-12">활동 없음</div>
            ) : (
              <div className="space-y-1 max-h-[420px] overflow-y-auto">
                {activity.map((a, i) => (
                  <div key={i} className="flex gap-3 p-2.5 rounded-input hover:bg-surface-sunken transition-colors">
                    <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                      a.type === 'signup' ? 'bg-success'
                      : a.type === 'event' ? 'bg-info-bar'
                      : a.type === 'application' ? 'bg-warning'
                      : 'bg-accent'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-ink truncate">{a.title}</div>
                      {a.detail && <div className="text-[11px] text-text-tertiary truncate">{a.detail}</div>}
                    </div>
                    <div className="text-[11px] text-text-tertiary shrink-0">
                      {new Date(a.at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 하단 액션 */}
        <div className="mt-8 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <AdminAction href="/admin/users" title="사용자 관리" desc="가입 · 정지 · 권한 변경" />
          <AdminAction href="/admin/events" title="행사 검수" desc="공고 승인 · 삭제" />
          <AdminAction href="/admin/documents" title="서류 검증" desc="파트너 필수 서류 승인·반려" />
          <AdminAction href="/admin/payments" title="결제 관제" desc="정산 · 환불 · 이슈" />
        </div>
      </div>
    </main>
  );
}

function BigKpi({ label, value, delta, tone, highlight }: { label: string; value: string; delta: string; tone?: 'success' | 'warn' | 'danger'; highlight?: boolean; }) {
  const deltaCls = tone === 'success' ? 'text-success' : tone === 'warn' ? 'text-warning' : tone === 'danger' ? 'text-danger' : 'text-text-secondary';
  return (
    <div className={`card ${highlight ? 'border-2 border-ink' : ''}`}>
      <div className="t-sub mb-2">{label}</div>
      <div className="text-[28px] font-extrabold text-ink tracking-[-0.03em] mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div className={`text-[11px] font-semibold ${deltaCls} truncate`}>{delta}</div>
    </div>
  );
}

function RoleBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-[13px] font-semibold text-ink">{label}</span>
        <span className="text-[13px] font-semibold text-text-secondary">
          <span className="font-extrabold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>{count}</span>
          <span className="mx-2 text-line">|</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
        </span>
      </div>
      <div className="h-2 bg-muted rounded-pill overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AdminAction({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="card card-hover block">
      <div className="text-[15px] font-extrabold text-ink mb-1">{title}</div>
      <div className="text-[12px] text-text-secondary">{desc}</div>
      <div className="text-[11px] font-semibold text-accent-warm mt-3">이동 →</div>
    </Link>
  );
}
