'use client';

import { useEffect, useState } from 'react';
import { fetchActiveAnnouncements } from '@/lib/supabase/queries';
import type { Announcement, AnnouncementLevel } from '@/lib/types';

/**
 * 상단 공지 배너 · 관리자가 대상(전체/파트너/주최) 선택해 발행
 * - 한 줄 요약(공간 절약) · 클릭 시 상세 모달 · 닫기(localStorage)
 * - 노출 대상·기간 필터는 RLS(fetchActiveAnnouncements)가 처리
 */
const LV: Record<AnnouncementLevel, { bg: string; border: string; fg: string; label: string }> = {
  info: { bg: 'var(--info-soft, #F4F7FE)', border: '#C7D4F0', fg: 'var(--info, #2B4B9B)', label: '공지' },
  update: { bg: 'var(--warning-bg, #FFF3C4)', border: '#E6CE73', fg: 'var(--accent-warm, #8F6D00)', label: '업데이트' },
  warning: { bg: 'var(--danger-bg, #FBEDEA)', border: '#E5B8AE', fg: 'var(--danger, #C0392B)', label: '주의' },
};
const KEY = 'fh_ann_dismissed';

export default function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [open, setOpen] = useState<Announcement | null>(null);

  useEffect(() => {
    try { setDismissed(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { /* no-op */ }
    let cancelled = false;
    fetchActiveAnnouncements().then((d) => { if (!cancelled) setItems(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  function dismiss(id: string) {
    const next = Array.from(new Set([...dismissed, id]));
    setDismissed(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* no-op */ }
  }

  const visible = items.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <>
      <div className="space-y-1.5 mb-5">
        {visible.map((a) => {
          const lv = LV[a.level] ?? LV.info;
          return (
            <div key={a.id} className="flex items-center gap-2 rounded-card border px-3 py-2 text-[13px]" style={{ background: lv.bg, borderColor: lv.border }}>
              <button onClick={() => setOpen(a)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
                <span className="shrink-0 text-[10.5px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ background: '#fff', color: lv.fg, border: `1px solid ${lv.border}` }}>
                  {lv.label}
                </span>
                <span className="truncate font-bold" style={{ color: lv.fg }}>{a.title}</span>
                <span className="shrink-0 text-[11px] text-text-tertiary">자세히</span>
              </button>
              <button onClick={() => dismiss(a.id)} aria-label="공지 닫기" className="shrink-0 text-text-tertiary hover:text-ink text-[16px] leading-none px-1">×</button>
            </div>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={() => setOpen(null)}>
          <div className="bg-page w-full sm:max-w-md rounded-t-card sm:rounded-card p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0 text-[10.5px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ background: (LV[open.level] ?? LV.info).bg, color: (LV[open.level] ?? LV.info).fg, border: `1px solid ${(LV[open.level] ?? LV.info).border}` }}>
                  {(LV[open.level] ?? LV.info).label}
                </span>
                <h2 className="text-[16px] font-extrabold text-ink leading-snug">{open.title}</h2>
              </div>
              <button onClick={() => setOpen(null)} className="shrink-0 text-text-tertiary text-[18px] px-1">×</button>
            </div>
            {open.body && <div className="text-[13.5px] text-ink-soft leading-relaxed whitespace-pre-wrap">{open.body}</div>}
            <div className="mt-2 text-[11px] text-text-tertiary">{new Date(open.created_at).toLocaleDateString('ko-KR')}</div>
            <div className="flex gap-2 mt-5">
              {open.url && <a href={open.url} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 text-center">자세히 보기 ↗</a>}
              <button onClick={() => setOpen(null)} className={`btn-secondary ${open.url ? '' : 'flex-1'}`}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
