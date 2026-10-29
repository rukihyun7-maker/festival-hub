'use client';

import { useEffect, useState } from 'react';
import { fetchActiveAnnouncements } from '@/lib/supabase/queries';
import type { Announcement, AnnouncementLevel } from '@/lib/types';

/**
 * 상단 공지 배너 · 관리자가 대상(전체/파트너/주최) 선택해 발행
 * - 노출 대상·기간 필터는 RLS(fetchActiveAnnouncements)가 처리
 * - 레벨별 톤(일반/업데이트/주의), 닫기(localStorage 저장)
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
    <div className="space-y-2 mb-5">
      {visible.map((a) => {
        const lv = LV[a.level] ?? LV.info;
        const titleEl = (
          <span className="min-w-0">
            <span className="font-extrabold" style={{ color: lv.fg }}>{a.title}</span>
            {a.body && <span className="text-ink-soft"> — {a.body}</span>}
          </span>
        );
        return (
          <div key={a.id} className="flex items-start gap-2.5 rounded-card border px-4 py-2.5 text-[13px]" style={{ background: lv.bg, borderColor: lv.border }}>
            <span className="shrink-0 text-[10.5px] font-extrabold px-1.5 py-0.5 rounded-full mt-0.5" style={{ background: '#fff', color: lv.fg, border: `1px solid ${lv.border}` }}>
              {lv.label}
            </span>
            <div className="min-w-0 flex-1 leading-relaxed">
              {a.url
                ? <a href={a.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{titleEl}<span className="text-[11px]" style={{ color: lv.fg }}> 자세히 ↗</span></a>
                : titleEl}
            </div>
            <button onClick={() => dismiss(a.id)} aria-label="공지 닫기" className="shrink-0 text-text-tertiary hover:text-ink text-[16px] leading-none px-1">×</button>
          </div>
        );
      })}
    </div>
  );
}
