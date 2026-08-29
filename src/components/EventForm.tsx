'use client';

import { useState } from 'react';
import Link from 'next/link';
import { uploadEventNotice } from '@/lib/supabase/queries';
import { REQUIRED_DOC_KINDS, DOC_META } from '@/lib/types';
import type { EventRow, Profile, SiteDetails, RecruitSlot, EventRequiredDocs, DocKind, EventExtraDoc } from '@/lib/types';

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
  recruit_slots: RecruitSlot[]; // v38: 부문별 모집
  required_docs: EventRequiredDocs; // v39: 행사별 필수서류
  notice_url: string;   // v40: 모집공고문 URL
  notice_name: string;  // v40: 모집공고문 파일명
  operating_days: string[]; // v41: 운영 요일
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
    recruit_slots: row.recruit_slots ?? [],
    required_docs: {
      standard: row.required_docs?.standard ?? [...REQUIRED_DOC_KINDS],
      extra: row.required_docs?.extra ?? [],
    },
    notice_url: row.notice_url ?? '',
    notice_name: row.notice_name ?? '',
    operating_days: row.operating_days ?? [],
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
    recruit_slots: [],
    required_docs: { standard: [...REQUIRED_DOC_KINDS], extra: [] },
    notice_url: '',
    notice_name: '',
    operating_days: [],
  };
}

interface EventFormProps {
  mode: 'create' | 'edit';
  initial: EventFormValues;
  submitting: boolean;
  error: string | null;
  cancelHref: string;
  showDelete?: boolean;
  ownerId?: string; // v40: 모집공고문 업로드용
  categories?: string[]; // v42: 관리자 편집 카테고리 (없으면 기본)
  onSubmit: (values: EventFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function EventForm({ mode, initial, submitting, error, cancelHref, showDelete, ownerId, categories, onSubmit, onDelete }: EventFormProps) {
  const [v, setV] = useState<EventFormValues>(initial);
  const catOptions = (categories && categories.length ? categories : EVENT_CATEGORIES).filter((c) => c.trim());
  const [noticeUploading, setNoticeUploading] = useState(false);
  const todayStr = (() => { const dt = new Date(); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`; })();

  async function handleNotice(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !ownerId) return;
    if (file.size > 15 * 1024 * 1024) { alert('파일이 너무 큽니다 (최대 15MB)'); return; }
    setNoticeUploading(true);
    try {
      const url = await uploadEventNotice(ownerId, file);
      setV((p) => ({ ...p, notice_url: url, notice_name: file.name }));
    } catch (err) {
      alert('공고문 업로드 실패: ' + (err as Error).message);
    } finally {
      setNoticeUploading(false);
    }
  }
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
                {!catOptions.includes(v.category) && v.category && <option value={v.category}>{v.category}</option>}
                {catOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="주최 단체명" required>
              <input required value={v.organizer} onChange={(e) => set('organizer', e.target.value)} className="input" placeholder="예: 성동구청 문화체육과" />
            </Field>
          </div>
          <Field label="소개글">
            <textarea rows={3} value={v.description} onChange={(e) => set('description', e.target.value)} className="input resize-none" placeholder="어떤 행사인지 파트너에게 짧게 설명해주세요" />
          </Field>
          <div>
            <div className="text-[12px] font-semibold text-ink-soft mb-1.5">모집 공고문 <span className="text-text-tertiary font-normal ml-1">· 선택 (지자체 등 공식 공고문 PDF)</span></div>
            {v.notice_url ? (
              <div className="flex items-center gap-2 p-2.5 rounded-input" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)' }}>
                <span className="text-[13px] font-semibold text-ink flex-1 truncate">📄 {v.notice_name || '공고문'}</span>
                <a href={v.notice_url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-bold text-info hover:underline shrink-0">보기</a>
                <button type="button" onClick={() => { set('notice_url', ''); set('notice_name', ''); }} className="text-[12px] text-danger font-bold shrink-0">제거</button>
              </div>
            ) : (
              <label className={`btn-secondary text-[13px] cursor-pointer inline-flex ${noticeUploading ? 'opacity-60 pointer-events-none' : ''}`}>
                {noticeUploading ? '업로드 중…' : '공고문 파일 첨부'}
                <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handleNotice} disabled={noticeUploading} />
              </label>
            )}
            <div className="text-[11px] text-text-tertiary mt-1">첨부하면 파트너가 행사 상세에서 공고문을 열람·다운로드할 수 있습니다.</div>
          </div>
        </Section>

        <Section title="2. 일정 & 장소">
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <Field label="행사 시작일" required>
              <input required type="date" min={todayStr} value={v.start_date} onChange={(e) => { const s = e.target.value; setV((p) => ({ ...p, start_date: s, end_date: p.end_date && p.end_date < s ? s : p.end_date })); }} className="input" />
            </Field>
            <Field label="행사 종료일" required>
              <input required type="date" min={v.start_date || todayStr} value={v.end_date} onChange={(e) => set('end_date', e.target.value)} className="input" />
            </Field>
            <Field label="신청 마감일">
              <input type="date" min={todayStr} max={v.start_date || undefined} value={v.deadline} onChange={(e) => set('deadline', e.target.value)} className="input" />
              <div className="text-[11px] text-text-tertiary mt-1 leading-relaxed">
                입점 파트너가 <b>이 날까지</b> 신청할 수 있어요. 보통 <b>행사 시작 1~2주 전</b>으로 설정하면 검토·준비 시간이 넉넉합니다. (비우면 상시 모집)
              </div>
            </Field>
          </div>

          {/* 운영 요일 (선택) */}
          <div>
            <div className="text-[12px] font-semibold text-ink-soft mb-1">운영 요일 <span className="text-text-tertiary font-normal ml-1">· 선택 (기간 중 특정 요일만 운영할 때)</span></div>
            <div className="text-[11px] text-text-tertiary mb-2">예: 9/1~9/30 중 <b>금·토·일만</b> 운영. 비우면 기간 내 매일 운영으로 안내됩니다.</div>
            <div className="flex flex-wrap gap-1.5">
              {['월', '화', '수', '목', '금', '토', '일'].map((w) => {
                const on = v.operating_days.includes(w);
                return (
                  <button type="button" key={w}
                    onClick={() => set('operating_days', on ? v.operating_days.filter((x) => x !== w) : [...v.operating_days, w])}
                    className={`chip ${on ? 'selected' : ''}`}>{w}</button>
                );
              })}
              {['주말(토·일)', '금·토·일'].map((preset) => (
                <button type="button" key={preset} onClick={() => set('operating_days', preset === '주말(토·일)' ? ['토', '일'] : ['금', '토', '일'])} className="chip">{preset}</button>
              ))}
            </div>
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

        <Section title="5. 모집 부문">
          <p className="text-[11px] text-text-tertiary -mt-1">예: 플리마켓 20 · 푸드트럭 10 · 음식부스 10. 부문마다 참가비·시설을 다르게 둘 수 있어요(비우면 행사 기본값). 파트너는 부문을 선택해 신청합니다. (부문을 나누지 않으면 비워두세요)</p>
          {v.recruit_slots.length > 0 && (
            <div className="space-y-2">
              {v.recruit_slots.map((s, i) => {
                const upd = (patch: Partial<RecruitSlot>) => { const n = [...v.recruit_slots]; n[i] = { ...n[i], ...patch }; set('recruit_slots', n); };
                return (
                  <div key={i} className="p-3 rounded-input border border-line-faint" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)' }}>
                    <div className="flex gap-2 items-center mb-2">
                      <input value={s.type} onChange={(e) => upd({ type: e.target.value })} className="input flex-1" placeholder="부문 (예: 푸드트럭)" />
                      <input type="number" min={1} value={s.count || ''} onChange={(e) => upd({ count: Number(e.target.value) || 0 })} className="input" style={{ width: 84 }} placeholder="수" />
                      <button type="button" onClick={() => set('recruit_slots', v.recruit_slots.filter((_, j) => j !== i))} className="text-danger text-[12px] font-bold px-1.5 shrink-0">삭제</button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-text-tertiary">참가비</span>
                        <input type="number" value={s.fee ?? ''} onChange={(e) => upd({ fee: e.target.value === '' ? null : Number(e.target.value) })} className="input py-1.5" style={{ width: 108 }} placeholder="행사 기본" />
                      </div>
                      <span className="text-[11px] text-text-tertiary ml-1">시설</span>
                      <button type="button" onClick={() => upd({ electric: !s.electric })} className={`chip ${s.electric ? 'selected' : ''}`}>전기</button>
                      <button type="button" onClick={() => upd({ water: !s.water })} className={`chip ${s.water ? 'selected' : ''}`}>수도</button>
                      <button type="button" onClick={() => upd({ gas: !s.gas })} className={`chip ${s.gas ? 'selected' : ''}`}>가스</button>
                    </div>
                    <input value={s.note ?? ''} onChange={(e) => upd({ note: e.target.value })} className="input py-1.5 mt-2 text-[13px]" placeholder="이 부문 조건 안내 (선택 · 예: 3.5t 이하 · 자체 발전기 지참)" />
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {['플리마켓', '푸드트럭', '음식부스', '체험부스'].map((t) => (
              <button type="button" key={t} onClick={() => set('recruit_slots', [...v.recruit_slots, { type: t, count: 10 }])} className="chip">+ {t}</button>
            ))}
            <button type="button" onClick={() => set('recruit_slots', [...v.recruit_slots, { type: '', count: 10 }])} className="chip">+ 직접 추가</button>
          </div>
        </Section>

        <Section title="6. 담당자 정보">
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

        <Section title="7. 이 행사 필수 서류">
          <p className="text-[12px] text-text-tertiary mb-3">표준 서류 중 확인할 항목을 고르고, 이 행사만의 추가 서류를 넣을 수 있어요. 열람·검증 기준(표준 6종)은 그대로 유지됩니다.</p>
          <div className="text-[12px] font-semibold text-ink-soft mb-1.5">표준 서류 · 확인 요청</div>
          <div className="flex flex-wrap gap-1.5 mb-5">
            {REQUIRED_DOC_KINDS.map((k: DocKind) => {
              const on = v.required_docs.standard?.includes(k) ?? false;
              return (
                <button type="button" key={k}
                  onClick={() => { const cur = v.required_docs.standard ?? []; const next = on ? cur.filter((x) => x !== k) : [...cur, k]; set('required_docs', { ...v.required_docs, standard: next }); }}
                  className={`chip ${on ? 'selected' : ''}`}>{DOC_META[k].label}</button>
              );
            })}
          </div>
          <div className="text-[12px] font-semibold text-ink-soft mb-1.5">추가 서류 · <span className="text-text-tertiary font-normal">신청 시 파트너가 업로드</span></div>
          {(v.required_docs.extra ?? []).length > 0 && (
            <div className="space-y-2 mb-2">
              {v.required_docs.extra!.map((d: EventExtraDoc, i: number) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={d.label} onChange={(e) => { const n = [...(v.required_docs.extra ?? [])]; n[i] = { ...n[i], label: e.target.value }; set('required_docs', { ...v.required_docs, extra: n }); }} className="input flex-1" placeholder="서류명 (예: 화기취급 서약서 · 보험증서)" />
                  <button type="button" onClick={() => set('required_docs', { ...v.required_docs, extra: (v.required_docs.extra ?? []).filter((_, j) => j !== i) })} className="text-danger text-[12px] font-bold px-2 shrink-0">삭제</button>
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={() => set('required_docs', { ...v.required_docs, extra: [...(v.required_docs.extra ?? []), { label: '' }] })} className="chip">+ 추가 서류</button>
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
