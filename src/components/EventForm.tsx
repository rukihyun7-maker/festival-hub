'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { EventRow, Profile, SiteDetails } from '@/lib/types';

/**
 * 행사 등록/수정 공용 폼
 * 생성/수정 페이지가 이 컴포넌트를 재사용
 */

export const EVENT_CATEGORIES = ['플리마켓', '축제', '팝업', '지역축제', '기업행사', '대학축제', '야시장'];
export const EVENT_REGIONS = ['서울', '경기', '인천', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '부산', '대구', '광주', '대전', '울산', '제주', '세종'];

export interface EventFormValues {
  name: string;
  category: string;
  organizer: string;
  start_date: string;
  end_date: string;
  region: string;
  address: string;
  visitors: string;
  capacity: string;
  fee: number;
  fee_rate: number;
  deadline: string;
  electric: boolean;
  water: boolean;
  gas: boolean;
  parking: boolean;
  description: string;
  contact: string;
  phone: string;
  contact_public: boolean; // 문의자(담당자·연락처) 공개 여부 (false=승인 후 공개)
  status: 'open' | 'upcoming' | 'close' | 'canceled';
  settlement_cycle: string;
  payment_method: string;
  site: SiteDetails; // v24: 푸드트럭 현장 인프라 상세 (선택)
}

export function toFormValues(row: EventRow): EventFormValues {
  return {
    name: row.name,
    category: row.category,
    organizer: row.organizer,
    start_date: row.start_date,
    end_date: row.end_date,
    region: row.region,
    address: row.address,
    visitors: row.visitors ?? '',
    capacity: row.capacity ?? '',
    fee: row.fee,
    fee_rate: row.fee_rate,
    deadline: row.deadline ?? '',
    electric: row.electric,
    water: row.water,
    gas: row.gas,
    parking: row.parking,
    description: row.description ?? '',
    contact: row.contact ?? '',
    phone: row.phone ?? '',
    contact_public: row.contact_public ?? false,
    status: row.status,
    settlement_cycle: row.settlement_cycle ?? '',
    payment_method: row.payment_method ?? '',
    site: row.site_details ?? {},
  };
}

export function initialFormValues(profile: Profile | null): EventFormValues {
  return {
    name: '',
    category: EVENT_CATEGORIES[0],
    organizer: profile?.business_name ?? '',
    start_date: '',
    end_date: '',
    region: EVENT_REGIONS[0],
    address: '',
    visitors: '',
    capacity: '',
    fee: 150000,
    fee_rate: 0,
    deadline: '',
    electric: true,
    water: true,
    gas: false,
    parking: false,
    description: '',
    contact: profile?.name ?? '',
    phone: profile?.phone ?? '',
    contact_public: false,
    status: 'open',
    settlement_cycle: '행사 종료 후 3영업일',
    payment_method: '현금 · 카드',
    site: {},
  };
}

interface EventFormProps {
  mode: 'create' | 'edit';
  initial: EventFormValues;
  submitting: boolean;
  error: string | null;
  cancelHref: string;
  showDelete?: boolean;
  onSubmit: (values: EventFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function EventForm({ mode, initial, submitting, error, cancelHref, showDelete, onSubmit, onDelete }: EventFormProps) {
  const [v, setV] = useState<EventFormValues>(initial);
  const set = <K extends keyof EventFormValues>(key: K, val: EventFormValues[K]) => setV((prev) => ({ ...prev, [key]: val }));
  const setSite = (key: keyof SiteDetails, val: string) => setV((prev) => ({ ...prev, site: { ...prev.site, [key]: val } }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (new Date(v.start_date) > new Date(v.end_date)) {
      alert('종료일이 시작일보다 빠릅니다');
      return;
    }
    if (v.deadline && new Date(v.deadline) > new Date(v.start_date)) {
      alert('마감일이 시작일보다 늦습니다');
      return;
    }
    await onSubmit(v);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
      <div className="space-y-6" style={{ minWidth: 0 }}>
        <Section title="1. 기본 정보">
          <Field label="행사명" required>
            <input required value={v.name} onChange={(e) => set('name', e.target.value)} className="input" placeholder="예: 서울숲 8월 플리마켓" />
          </Field>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <Field label="카테고리" required>
              <select value={v.category} onChange={(e) => set('category', e.target.value)} className="input">
                {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="주최 단체명" required>
              <input required value={v.organizer} onChange={(e) => set('organizer', e.target.value)} className="input" placeholder="예: 성동구청 문화체육과" />
            </Field>
          </div>
          <Field label="소개글">
            <textarea rows={3} value={v.description} onChange={(e) => set('description', e.target.value)} className="input resize-none" placeholder="어떤 행사인지 파트너에게 짧게 설명해주세요" />
          </Field>
        </Section>

        <Section title="2. 일정 & 장소">
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <Field label="시작일" required>
              <input required type="date" value={v.start_date} onChange={(e) => set('start_date', e.target.value)} className="input" />
            </Field>
            <Field label="종료일" required>
              <input required type="date" value={v.end_date} onChange={(e) => set('end_date', e.target.value)} className="input" />
            </Field>
            <Field label="신청 마감일">
              <input type="date" value={v.deadline} onChange={(e) => set('deadline', e.target.value)} className="input" />
              <div className="text-[11px] text-text-tertiary mt-1 leading-relaxed">
                입점 파트너가 <b>이 날까지</b> 신청할 수 있어요. 보통 <b>행사 시작 1~2주 전</b>으로 설정하면 검토·준비 시간이 넉넉합니다. (비우면 상시 모집)
              </div>
            </Field>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'minmax(120px, auto) minmax(200px, 1fr)' }}>
            <Field label="지역" required>
              <select value={v.region} onChange={(e) => set('region', e.target.value)} className="input">
                {EVENT_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="상세 주소" required>
              <input required value={v.address} onChange={(e) => set('address', e.target.value)} className="input" placeholder="예: 성동구 뚝섬로 273 · 서울숲 문화광장" />
            </Field>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <Field label="예상 유동인구" hint="숫자만 아닌 표현 가능">
              <input value={v.visitors} onChange={(e) => set('visitors', e.target.value)} className="input" placeholder="예: 일 평균 20,000명" />
            </Field>
            <Field label="파트너 자리 수" hint="'20자리' 또는 '공고 예정'">
              <input value={v.capacity} onChange={(e) => set('capacity', e.target.value)} className="input" placeholder="예: 20자리" />
            </Field>
          </div>
        </Section>

        <Section title="3. 조건 & 시설">
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <Field label="일 참가비 (원)" hint="0 = 무료">
              <input type="number" min={0} step={10000} value={v.fee} onChange={(e) => set('fee', Number(e.target.value))} className="input" />
            </Field>
            <Field label="매출 수수료율 (%)" hint="0 = 없음">
              <input type="number" min={0} max={30} step={0.5} value={v.fee_rate} onChange={(e) => set('fee_rate', Number(e.target.value))} className="input" />
            </Field>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <Field label="정산 주기" hint="입점 파트너에게 노출">
              <input value={v.settlement_cycle} onChange={(e) => set('settlement_cycle', e.target.value)} className="input" placeholder="예: 행사 종료 후 3영업일" />
            </Field>
            <Field label="결제 방식" hint="QR 미적용 시 현금·카드 등">
              <input value={v.payment_method} onChange={(e) => set('payment_method', e.target.value)} className="input" placeholder="예: 현금 · 카드 (QR 선택)" />
            </Field>
          </div>
          <div>
            <div className="text-[12px] font-semibold text-ink-soft mb-2">제공 시설</div>
            <div className="flex flex-wrap gap-2">
              <FacilityChip active={v.electric} onClick={() => set('electric', !v.electric)}>전기</FacilityChip>
              <FacilityChip active={v.water} onClick={() => set('water', !v.water)}>상수도</FacilityChip>
              <FacilityChip active={v.gas} onClick={() => set('gas', !v.gas)}>가스</FacilityChip>
              <FacilityChip active={v.parking} onClick={() => set('parking', !v.parking)}>주차</FacilityChip>
            </div>
          </div>
        </Section>

        <Section title="4. 푸드트럭 현장 상세">
          <p className="text-[12px] text-text-tertiary -mt-1 mb-1">
            선택 항목입니다. 입력하면 검증된 입점 파트너에게 표로 노출되어, 전화 문의 없이 입점 여부를 판단할 수 있습니다.
          </p>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <Field label="부스당 전기 용량" hint="발전기 사용 시 필수">
              <input value={v.site.power ?? ''} onChange={(e) => setSite('power', e.target.value)} className="input" placeholder="예: 부스당 3kW / 220V 15A" />
            </Field>
            <Field label="발전기 반입">
              <SiteSelect value={v.site.generator} onChange={(val) => setSite('generator', val)} options={['가능', '불가', '문의']} />
            </Field>
            <Field label="급수">
              <SiteSelect value={v.site.water} onChange={(val) => setSite('water', val)} options={['가능', '불가', '문의']} />
            </Field>
            <Field label="배수" hint="배수구 거리">
              <input value={v.site.drainage ?? ''} onChange={(e) => setSite('drainage', e.target.value)} className="input" placeholder="예: 가능 · 배수구 10m" />
            </Field>
            <Field label="LPG · 화기">
              <SiteSelect value={v.site.lpg} onChange={(val) => setSite('lpg', val)} options={['가능', '제한적', '불가']} />
            </Field>
            <Field label="차량 진입 제원" hint="길이·폭·높이">
              <input value={v.site.vehicle ?? ''} onChange={(e) => setSite('vehicle', e.target.value)} className="input" placeholder="예: 길이 6m · 폭 2.2m · 높이 3.2m" />
            </Field>
            <Field label="부스 사양" hint="면적·지면">
              <input value={v.site.booth ?? ''} onChange={(e) => setSite('booth', e.target.value)} className="input" placeholder="예: 3x3m · 아스팔트 · 천막 포함" />
            </Field>
            <Field label="판매 품목 제한">
              <input value={v.site.items ?? ''} onChange={(e) => setSite('items', e.target.value)} className="input" placeholder="예: 주류 불가 · 중복업종 조정" />
            </Field>
          </div>
          <Field label="우천/폭염 · 취소 정책">
            <input value={v.site.weather ?? ''} onChange={(e) => setSite('weather', e.target.value)} className="input" placeholder="예: 우천 시 순연 · 취소 시 참가비 환불" />
          </Field>
        </Section>

        <Section title="5. 담당자 정보">
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <Field label="담당자명">
              <input value={v.contact} onChange={(e) => set('contact', e.target.value)} className="input" placeholder="예: 김주무관" />
            </Field>
            <Field label="연락처">
              <input value={v.phone} onChange={(e) => set('phone', e.target.value)} className="input" placeholder="02-2286-1234" />
            </Field>
          </div>

          {/* 문의자 정보 공개 여부 (주최·관리자 설정) */}
          <div className="mt-4">
            <div className="text-[12px] font-bold text-ink mb-1.5">문의자 정보 공개</div>
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              {([
                [false, '승인 후 공개', '신청·승인한 파트너에게만 담당자·연락처를 공개(권장)'],
                [true, '바로 공개', '행사 상세를 보는 모든 파트너에게 담당자·연락처 공개'],
              ] as const).map(([val, title, desc]) => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => set('contact_public', val)}
                  className={`p-3 rounded-input border-2 text-left transition-all ${v.contact_public === val ? 'bg-ink text-white border-ink' : 'bg-surface text-ink border-line-strong hover:border-ink'}`}
                >
                  <div className="text-[13px] font-bold">{title}</div>
                  <div className={`text-[11px] mt-0.5 ${v.contact_public === val ? 'text-white/80' : 'text-text-tertiary'}`}>{desc}</div>
                </button>
              ))}
            </div>
            <div className="text-[11px] text-text-tertiary mt-1.5">비공개(승인 후 공개)로 두면 연락처가 함부로 노출되지 않아 문의 피로도를 줄일 수 있습니다.</div>
          </div>
        </Section>

        <Section title="게시 상태">
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            {(['open', 'upcoming', 'close', 'canceled'] as const).map((s) => {
              const info = {
                open: { title: '모집 중', desc: '즉시 신청 가능' },
                upcoming: { title: '예정', desc: '알림만 받음' },
                close: { title: '종료', desc: '신청 마감' },
                canceled: { title: '취소', desc: '행사 취소' },
              }[s];
              // 등록 모드에선 open/upcoming만 노출
              if (mode === 'create' && (s === 'close' || s === 'canceled')) return null;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('status', s)}
                  className={`p-3.5 rounded-input border-2 text-left transition-all ${v.status === s ? 'bg-ink text-white border-ink' : 'bg-surface text-ink border-line-strong hover:border-ink'}`}
                >
                  <div className="text-[13px] font-bold">{info.title}</div>
                  <div className={`text-[11px] mt-0.5 ${v.status === s ? 'text-white/60' : 'text-text-tertiary'}`}>{info.desc}</div>
                </button>
              );
            })}
          </div>
        </Section>

        {error && (
          <div className="card" style={{ borderColor: '#C7503E' }}>
            <div className="text-[13px] font-bold text-danger mb-1">
              {mode === 'create' ? '등록 실패' : '수정 실패'}
            </div>
            <div className="text-[12px] text-danger">{error}</div>
          </div>
        )}

        <div className="flex gap-2">
          {showDelete && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-[13px] text-danger hover:underline font-semibold px-3 mr-auto"
            >
              행사 삭제
            </button>
          )}
          <Link href={cancelHref} className="btn-secondary flex-1 text-center max-w-[200px]">취소</Link>
          <button type="submit" disabled={submitting} className="btn-primary flex-1 py-3.5 max-w-[240px]">
            {submitting ? (mode === 'create' ? '등록 중…' : '수정 중…') : mode === 'create' ? '행사 등록' : '수정 저장'}
          </button>
        </div>
      </div>

      {/* 우측 · 스티키 미리보기 */}
      <aside style={{ position: 'sticky', top: 88, alignSelf: 'start' }}>
        <div className="card card-apply">
          <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-accent-warm mb-3">
            {mode === 'create' ? '미리보기' : '현재 상태'}
          </div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`badge ${v.status === 'open' ? 'badge-warning' : v.status === 'upcoming' ? 'badge-info' : v.status === 'canceled' ? 'badge-danger' : ''}`}>
              {v.status === 'open' ? '신청형' : v.status === 'upcoming' ? '정보형' : v.status === 'canceled' ? '취소' : '종료'}
            </span>
            <span className="badge">{v.category}</span>
            {v.deadline && v.status === 'open' && (
              <span className="text-[10px] font-bold text-warning">
                D-{Math.max(0, Math.ceil((new Date(v.deadline).getTime() - Date.now()) / 86400000))}
              </span>
            )}
          </div>
          <div className="t-card mb-3">{v.name || '(행사명 없음)'}</div>
          <div className="space-y-1.5 text-[13px]">
            <PreviewRow label="주최" value={v.organizer || '-'} />
            <PreviewRow label="일정" value={v.start_date && v.end_date ? `${v.start_date.slice(5)} - ${v.end_date.slice(5)}` : '-'} />
            <PreviewRow label="장소" value={v.address ? `${v.region} ${v.address.split(' ').slice(-2).join(' ')}` : '-'} />
            <PreviewRow label="자리" value={v.capacity || '공고 예정'} />
            <PreviewRow label="참가비" value={v.fee > 0 ? `일 ${(v.fee / 10000).toFixed(0)}만원${v.fee_rate > 0 ? ` + ${v.fee_rate}%` : ''}` : '무료'} />
          </div>
        </div>
      </aside>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="t-section mb-4">{title}</div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-ink-soft">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
        {hint && <span className="text-text-tertiary font-normal ml-2">· {hint}</span>}
      </span>
      {children}
    </label>
  );
}

function SiteSelect({ value, onChange, options }: { value?: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="input">
      <option value="">선택 안 함</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function FacilityChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`chip ${active ? 'selected' : ''}`}>
      {active && <span className="mr-1">✓</span>}{children}
    </button>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-12 shrink-0 text-text-tertiary">{label}</span>
      <span className="text-ink font-semibold truncate">{value}</span>
    </div>
  );
}
