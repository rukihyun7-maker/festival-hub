'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import {
  fetchMyProfile, fetchInventoryItems, createInventoryItem, updateInventoryItem,
  deleteInventoryItem, uploadInventoryImage, applyInventoryMove, fetchInventoryMoves,
  type InventoryItemInput,
} from '@/lib/supabase/queries';
import { needsReorder, INVENTORY_MOVE_LABEL } from '@/lib/types';
import type { Profile, InventoryItem, InventoryMove } from '@/lib/types';

/**
 * 내 창고 (재고 관리) · 입점 파트너 전용 · 비공개 개인 도구
 * 창고재고 ↔ 현장(출고)재고 2버킷. 축제 전 출고 → 종료 후 정산(잔여→소진 자동) → 재발주.
 */
export default function InventoryPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<InventoryItem | 'new' | null>(null);
  const [shipOpen, setShipOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [restock, setRestock] = useState<InventoryItem | null>(null);
  const [history, setHistory] = useState<InventoryItem | null>(null);

  async function reload(uid: string) {
    setItems(await fetchInventoryItems(uid));
  }

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchMyProfile();
        setProfile(p);
        if (p) await reload(p.id);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => ({
    total: items.length,
    outActive: items.filter((i) => i.out_qty > 0).length,
    reorder: items.filter((i) => needsReorder(i)).length,
  }), [items]);

  if (!loading && profile && profile.role !== 'seller') {
    return (
      <main className="min-h-screen bg-page">
        <AppNav role="seller" />
        <div className="container-app py-12">
          <div className="card"><div className="text-[15px] font-bold text-ink">입점 파트너 전용 기능입니다</div></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-page">
      <AppNav role="seller" />
      <div className="container-app py-8 md:py-12">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h1 className="t-title mb-1">내 창고</h1>
            <p className="t-sub">창고 재고와 현장 출고를 한 곳에서. 축제 전 출고 → 종료 후 잔여 입력하면 소진량이 자동 계산됩니다.</p>
          </div>
          {profile && <button onClick={() => setEditing('new')} className="btn-primary text-[13px] shrink-0 hidden sm:inline-flex">+ 품목 추가</button>}
        </div>

        {/* 요약 */}
        <div className="grid grid-cols-3 gap-2 my-5">
          <Tile label="품목" value={stats.total} />
          <Tile label="현장 출고중" value={stats.outActive} tone={stats.outActive > 0 ? 'info' : undefined} />
          <Tile label="재발주 필요" value={stats.reorder} tone={stats.reorder > 0 ? 'danger' : undefined} />
        </div>

        {/* 액션 바 */}
        <div className="flex flex-wrap gap-2 mb-5">
          <button onClick={() => setEditing('new')} className="btn-primary text-[13px] sm:hidden">+ 품목 추가</button>
          <button onClick={() => setShipOpen(true)} disabled={items.length === 0} className="btn-secondary text-[13px]">행사 출고</button>
          <button onClick={() => setSettleOpen(true)} disabled={stats.outActive === 0} className="btn-secondary text-[13px]">종료 정산</button>
        </div>

        {loading ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {[1, 2, 3].map((i) => <div key={i} className="card"><div className="animate-pulse h-24 bg-muted rounded" /></div>)}
          </div>
        ) : items.length === 0 ? (
          <div className="card text-center py-16">
            <div className="mb-2 flex justify-center text-text-tertiary"><BoxIcon size={34} /></div>
            <div className="text-[15px] font-bold text-ink mb-1">아직 등록한 품목이 없습니다</div>
            <div className="t-sub mb-5">자주 쓰는 상품·재료를 등록하고 창고 재고를 관리해 보세요.</div>
            <button onClick={() => setEditing('new')} className="btn-primary">+ 첫 품목 등록</button>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {items.map((it) => (
              <ItemCard key={it.id} item={it}
                onEdit={() => setEditing(it)}
                onRestock={() => setRestock(it)}
                onHistory={() => setHistory(it)}
              />
            ))}
          </div>
        )}
      </div>

      {editing && profile && (
        <ItemFormModal
          sellerId={profile.id}
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await reload(profile.id); }}
        />
      )}
      {shipOpen && profile && (
        <ShipModal items={items.filter((i) => i.warehouse_qty > 0)} onClose={() => setShipOpen(false)}
          onDone={async () => { setShipOpen(false); await reload(profile.id); }} />
      )}
      {settleOpen && profile && (
        <SettleModal items={items.filter((i) => i.out_qty > 0)} onClose={() => setSettleOpen(false)}
          onDone={async () => { setSettleOpen(false); await reload(profile.id); }} />
      )}
      {restock && profile && (
        <RestockModal item={restock} onClose={() => setRestock(null)}
          onDone={async () => { setRestock(null); await reload(profile.id); }} />
      )}
      {history && <HistoryModal item={history} onClose={() => setHistory(null)} />}
    </main>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone?: 'info' | 'danger' }) {
  const color = tone === 'danger' ? 'var(--danger,#9B2C22)' : tone === 'info' ? 'var(--info,#2B4B9B)' : 'var(--ink,#14120E)';
  return (
    <div className="rounded-input p-3 text-center" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)' }}>
      <div className="text-[22px] font-extrabold leading-none" style={{ color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div className="text-[11px] text-text-secondary mt-1">{label}</div>
    </div>
  );
}

function ItemCard({ item, onEdit, onRestock, onHistory }: {
  item: InventoryItem; onEdit: () => void; onRestock: () => void; onHistory: () => void;
}) {
  const low = needsReorder(item);
  return (
    <div className="card p-0 overflow-hidden flex flex-col">
      <div className="flex gap-3 p-4">
        <div className="w-16 h-16 rounded-input overflow-hidden shrink-0 flex items-center justify-center" style={{ background: 'var(--bg-muted,#F0ECE1)' }}>
          {item.image_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
            : <span className="text-text-tertiary"><BoxIcon size={24} /></span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[14px] font-bold text-ink truncate">{item.name}</span>
            {low && <span className="badge badge-danger">재발주</span>}
          </div>
          {item.spec && <div className="text-[11.5px] text-text-tertiary truncate mt-0.5">{item.spec}</div>}
          <div className="flex gap-3 mt-1.5 text-[12px]" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <span>창고 <b className="text-ink">{item.warehouse_qty}</b>{item.unit}</span>
            <span className={item.out_qty > 0 ? 'text-info' : 'text-text-tertiary'}>현장 <b>{item.out_qty}</b>{item.unit}</span>
          </div>
        </div>
      </div>
      {item.memo && <div className="px-4 pb-1 -mt-1 text-[11px] text-text-tertiary truncate">{item.memo}</div>}
      <div className="mt-auto flex items-center gap-1 border-t border-line-faint px-2 py-1.5 text-[12px] font-semibold">
        <button onClick={onRestock} className="px-2 py-1 rounded hover:bg-surface-sunken text-ink">+ 입고</button>
        <button onClick={onHistory} className="px-2 py-1 rounded hover:bg-surface-sunken text-text-secondary">이력</button>
        <button onClick={onEdit} className="px-2 py-1 rounded hover:bg-surface-sunken text-text-secondary">편집</button>
        {item.purchase_url && (
          <a href={item.purchase_url} target="_blank" rel="noopener noreferrer" className="ml-auto px-2 py-1 rounded text-info hover:underline">구매처 ↗</a>
        )}
      </div>
    </div>
  );
}

const UNITS = ['개', '박스', '팩', 'kg', 'L', '통', '병', '봉'];

function ItemFormModal({ sellerId, item, onClose, onSaved }: {
  sellerId: string; item: InventoryItem | null; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [spec, setSpec] = useState(item?.spec ?? '');
  const [unit, setUnit] = useState(item?.unit ?? '개');
  const [wh, setWh] = useState(String(item?.warehouse_qty ?? 0));
  const [out, setOut] = useState(String(item?.out_qty ?? 0));
  const [min, setMin] = useState(String(item?.min_qty ?? 0));
  const [price, setPrice] = useState(item?.purchase_price != null ? String(item.purchase_price) : '');
  const [url, setUrl] = useState(item?.purchase_url ?? '');
  const [memo, setMemo] = useState(item?.memo ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(item?.image_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { alert('사진이 너무 큽니다 (최대 8MB)'); return; }
    setUploading(true);
    try { setImageUrl(await uploadInventoryImage(sellerId, f)); }
    catch (err) { alert('업로드 실패: ' + (err as Error).message); }
    finally { setUploading(false); }
  }

  async function save() {
    if (!name.trim()) { alert('상품명을 입력해 주세요'); return; }
    setSaving(true);
    const payload: InventoryItemInput = {
      name: name.trim(), spec: spec.trim() || null, unit,
      warehouse_qty: Number(wh) || 0, out_qty: Number(out) || 0, min_qty: Number(min) || 0,
      purchase_price: price.trim() === '' ? null : Number(price) || 0,
      purchase_url: url.trim() || null, memo: memo.trim() || null, image_url: imageUrl,
    };
    try {
      if (item) await updateInventoryItem(item.id, payload);
      else await createInventoryItem(sellerId, payload);
      onSaved();
    } catch (err) { alert('저장 실패: ' + (err as Error).message); setSaving(false); }
  }

  async function remove() {
    if (!item) return;
    if (!confirm(`"${item.name}"을(를) 삭제할까요? 이력도 함께 삭제됩니다.`)) return;
    setSaving(true);
    try { await deleteInventoryItem(item.id); onSaved(); }
    catch (err) { alert('삭제 실패: ' + (err as Error).message); setSaving(false); }
  }

  return (
    <Modal title={item ? '품목 편집' : '품목 추가'} onClose={onClose}>
      <div className="flex gap-3 mb-3">
        <div className="w-20 h-20 rounded-input overflow-hidden shrink-0 flex items-center justify-center" style={{ background: 'var(--bg-muted,#F0ECE1)' }}>
          {imageUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            : <span className="text-text-tertiary"><BoxIcon size={26} /></span>}
        </div>
        <div className="flex flex-col gap-1.5 justify-center">
          <label className={`btn-secondary text-[12px] py-1.5 px-3 cursor-pointer inline-flex ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
            {uploading ? '업로드 중…' : imageUrl ? '사진 변경' : '사진 첨부'}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          </label>
          {imageUrl && <button type="button" onClick={() => setImageUrl(null)} className="text-[11px] text-danger hover:underline text-left">사진 제거</button>}
        </div>
      </div>

      <Field label="상품명" req><input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="예: 원두 1kg" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="규격"><input value={spec} onChange={(e) => setSpec(e.target.value)} className="input" placeholder="예: 1kg · 500ml" /></Field>
        <Field label="단위">
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className="input">
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            {!UNITS.includes(unit) && <option value={unit}>{unit}</option>}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="창고 재고"><input type="number" min={0} value={wh} onChange={(e) => setWh(e.target.value)} className="input" /></Field>
        <Field label="현장 재고"><input type="number" min={0} value={out} onChange={(e) => setOut(e.target.value)} className="input" /></Field>
        <Field label="최소재고" hint="재발주점"><input type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} className="input" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="구매 단가(원)" hint="선택"><input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="input" placeholder="예: 12000" /></Field>
        <Field label="구매처 링크" hint="재발주용"><input value={url} onChange={(e) => setUrl(e.target.value)} className="input" placeholder="https://…" /></Field>
      </div>
      <Field label="비고"><input value={memo} onChange={(e) => setMemo(e.target.value)} className="input" placeholder="보관 위치·특이사항 등" /></Field>

      <div className="flex gap-2 mt-4">
        {item && <button onClick={remove} disabled={saving} className="text-[13px] text-danger font-semibold hover:underline mr-auto px-2">삭제</button>}
        <button onClick={onClose} className="btn-secondary flex-1 max-w-[120px]">취소</button>
        <button onClick={save} disabled={saving || uploading} className="btn-primary flex-1 max-w-[160px]">{saving ? '저장 중…' : '저장'}</button>
      </div>
    </Modal>
  );
}

/** 행사 출고 (창고 → 현장) · 여러 품목 일괄 */
function ShipModal({ items, onClose, onDone }: { items: InventoryItem[]; onClose: () => void; onDone: () => void }) {
  const [qty, setQty] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const any = items.some((i) => (Number(qty[i.id]) || 0) > 0);

  async function submit() {
    setBusy(true);
    try {
      for (const it of items) {
        const q = Number(qty[it.id]) || 0;
        if (q > 0) await applyInventoryMove(it, { type: 'out', qty: q });
      }
      onDone();
    } catch (e) { alert('출고 실패: ' + (e as Error).message); setBusy(false); }
  }

  return (
    <Modal title="행사 출고 · 창고 → 현장" onClose={onClose}>
      <p className="text-[12px] text-text-secondary mb-3">이번 행사에 가져갈 수량을 입력하면 창고에서 차감되고 현장 재고로 이동합니다.</p>
      {items.length === 0 ? (
        <div className="text-[13px] text-text-tertiary py-6 text-center">창고에 재고가 있는 품목이 없습니다.</div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[46vh] overflow-y-auto">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-2 p-2 rounded-input" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)' }}>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-ink truncate">{it.name}</div>
                <div className="text-[11px] text-text-tertiary">창고 {it.warehouse_qty}{it.unit}</div>
              </div>
              <input type="number" min={0} max={it.warehouse_qty} value={qty[it.id] ?? ''} placeholder="0"
                onChange={(e) => setQty((p) => ({ ...p, [it.id]: e.target.value }))}
                className="input py-1.5" style={{ width: 84 }} />
              <span className="text-[12px] text-text-tertiary w-8">{it.unit}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 mt-4">
        <button onClick={onClose} className="btn-secondary flex-1">취소</button>
        <button onClick={submit} disabled={busy || !any} className="btn-primary flex-1">{busy ? '처리 중…' : '출고 확정'}</button>
      </div>
    </Modal>
  );
}

/** 행사 종료 정산 (현장 잔여 입력 → 소진 자동 · 잔여는 창고 복귀) */
function SettleModal({ items, onClose, onDone }: { items: InventoryItem[]; onClose: () => void; onDone: () => void }) {
  const [remain, setRemain] = useState<Record<string, string>>(() => Object.fromEntries(items.map((i) => [i.id, ''])));
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      for (const it of items) {
        const r = remain[it.id] === '' ? it.out_qty : (Number(remain[it.id]) || 0); // 미입력=전량 잔여(변동 없음)
        await applyInventoryMove(it, { type: 'settle', remain: r });
      }
      onDone();
    } catch (e) { alert('정산 실패: ' + (e as Error).message); setBusy(false); }
  }

  return (
    <Modal title="행사 종료 정산 · 잔여 입력" onClose={onClose}>
      <p className="text-[12px] text-text-secondary mb-3">현장에 <b>남은 수량(잔여)</b>을 입력하세요. 잔여는 창고로 복귀하고, <b>소진량(출고−잔여)</b>이 이력에 자동 기록됩니다.</p>
      <div className="flex flex-col gap-2 max-h-[46vh] overflow-y-auto">
        {items.map((it) => {
          const r = remain[it.id] === '' ? null : Number(remain[it.id]) || 0;
          const consumed = r == null ? null : Math.max(0, it.out_qty - r);
          return (
            <div key={it.id} className="flex items-center gap-2 p-2 rounded-input" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)' }}>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-ink truncate">{it.name}</div>
                <div className="text-[11px] text-text-tertiary">현장 {it.out_qty}{it.unit}{consumed != null && ` · 소진 ${consumed}${it.unit}`}</div>
              </div>
              <input type="number" min={0} max={it.out_qty} value={remain[it.id] ?? ''} placeholder={`잔여 (최대 ${it.out_qty})`}
                onChange={(e) => setRemain((p) => ({ ...p, [it.id]: e.target.value }))}
                className="input py-1.5" style={{ width: 96 }} />
              <span className="text-[12px] text-text-tertiary w-8">{it.unit}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={onClose} className="btn-secondary flex-1">취소</button>
        <button onClick={submit} disabled={busy} className="btn-primary flex-1">{busy ? '처리 중…' : '정산 확정'}</button>
      </div>
    </Modal>
  );
}

/** 입고(재발주 후) · 창고 += */
function RestockModal({ item, onClose, onDone }: { item: InventoryItem; onClose: () => void; onDone: () => void }) {
  const [qty, setQty] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={`입고 · ${item.name}`} onClose={onClose}>
      <p className="text-[12px] text-text-secondary mb-3">구매·재발주해서 창고에 들어온 수량을 입력하세요. 창고 재고에 더해집니다. (현재 {item.warehouse_qty}{item.unit})</p>
      <div className="flex items-center gap-2">
        <input type="number" min={1} value={qty} autoFocus placeholder="입고 수량" onChange={(e) => setQty(e.target.value)} className="input flex-1" />
        <span className="text-[13px] text-text-tertiary">{item.unit}</span>
      </div>
      {item.purchase_url && <a href={item.purchase_url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-bold text-info hover:underline inline-block mt-2">구매처에서 주문하기 ↗</a>}
      <div className="flex gap-2 mt-4">
        <button onClick={onClose} className="btn-secondary flex-1">취소</button>
        <button disabled={busy || (Number(qty) || 0) <= 0}
          onClick={async () => { setBusy(true); try { await applyInventoryMove(item, { type: 'in', qty: Number(qty) || 0 }); onDone(); } catch (e) { alert('입고 실패: ' + (e as Error).message); setBusy(false); } }}
          className="btn-primary flex-1">{busy ? '처리 중…' : '입고'}</button>
      </div>
    </Modal>
  );
}

function HistoryModal({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const [moves, setMoves] = useState<InventoryMove[] | null>(null);
  useEffect(() => { fetchInventoryMoves(item.id).then(setMoves).catch(() => setMoves([])); }, [item.id]);
  return (
    <Modal title={`이력 · ${item.name}`} onClose={onClose}>
      {moves == null ? (
        <div className="animate-pulse h-24 bg-muted rounded" />
      ) : moves.length === 0 ? (
        <div className="text-[13px] text-text-tertiary py-6 text-center">아직 입출고 기록이 없습니다.</div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-[50vh] overflow-y-auto">
          {moves.map((m) => {
            const tone = m.type === 'in' ? 'badge-success' : m.type === 'out' ? 'badge-info' : m.type === 'settle' ? 'badge-warning' : '';
            return (
              <div key={m.id} className="flex items-start gap-2 p-2.5 rounded-input" style={{ background: 'var(--bg-surface-sunken,#FDFBF6)' }}>
                <span className={`badge ${tone} shrink-0`}>{INVENTORY_MOVE_LABEL[m.type]}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink">{m.qty}{item.unit}{m.note ? '' : ''}</div>
                  {m.note && <div className="text-[11px] text-text-tertiary">{m.note}</div>}
                </div>
                <div className="text-[11px] text-text-tertiary shrink-0">{new Date(m.created_at).toLocaleDateString('ko-KR')}</div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-4"><button onClick={onClose} className="btn-secondary w-full">닫기</button></div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(20,18,14,0.4)' }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-[480px] bg-surface animate-fh-up" style={{ borderRadius: '20px 20px 0 0', padding: 'clamp(20px, 3vw, 28px)', maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="t-section">{title}</div>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] hover:bg-surface-sunken flex items-center justify-center text-text-tertiary">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function BoxIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8l9-4 9 4v8l-9 4-9-4z" /><path d="M3 8l9 4 9-4M12 12v8" />
    </svg>
  );
}

function Field({ label, req, hint, children }: { label: string; req?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 mb-2.5">
      <span className="text-[12px] font-semibold text-ink-soft">
        {label}{req && <span className="text-danger ml-0.5">*</span>}
        {hint && <span className="text-text-tertiary font-normal ml-1.5">· {hint}</span>}
      </span>
      {children}
    </label>
  );
}
