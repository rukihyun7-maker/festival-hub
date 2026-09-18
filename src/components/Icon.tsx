/**
 * 공용 라인 아이콘 (이모지 대체) · currentColor 상속 → 주변 텍스트 색을 따름(모노톤)
 * 사용: <Icon name="bell" size={18} />  · 인라인 텍스트 옆에 두면 baseline 정렬됨
 */
import type { ReactNode } from 'react';

export type IconName =
  | 'bell' | 'lock' | 'file' | 'clip' | 'download' | 'eye' | 'clock' | 'warn'
  | 'id' | 'trash' | 'ban' | 'pin' | 'building' | 'cap' | 'train' | 'cart'
  | 'tent' | 'thumb' | 'camera' | 'contact' | 'utensils' | 'cup' | 'gift';

const P: Record<IconName, ReactNode> = {
  bell: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  lock: <><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></>,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
  clip: <path d="M21 11.5l-8.5 8.5a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3l8-8" />,
  download: <><path d="M12 3v12" /><path d="M7 11l5 5 5-5" /><path d="M5 21h14" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  warn: <><path d="M12 3l10 17H2z" /><path d="M12 10v4M12 17h.01" /></>,
  id: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="12" r="2" /><path d="M13 10h5M13 14h5M5.5 16a3 3 0 0 1 6 0" /></>,
  trash: <><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" /></>,
  ban: <><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></>,
  pin: <><path d="M12 21s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></>,
  building: <><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3" /></>,
  cap: <><path d="M2 8l10-4 10 4-10 4z" /><path d="M6 10v4c0 1.5 2.7 3 6 3s6-1.5 6-3v-4M22 8v5" /></>,
  train: <><rect x="5" y="3" width="14" height="13" rx="2.5" /><path d="M5 10h14M9 20l-2 2M15 20l2 2" /><circle cx="8.5" cy="13" r=".8" /><circle cx="15.5" cy="13" r=".8" /></>,
  cart: <><circle cx="9" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /><path d="M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.3h8.1a1.5 1.5 0 0 0 1.5-1.2L21 8H6" /></>,
  tent: <><path d="M12 4l9 16H3z" /><path d="M12 4v16" /></>,
  thumb: <><path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z" /><path d="M7 11l4-8a2.2 2.2 0 0 1 2 3l-1 4h5.5a2 2 0 0 1 2 2.4l-1.3 6A2 2 0 0 1 16.2 20H7" /></>,
  camera: <><path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L19 6h0a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><circle cx="12" cy="12.5" r="3.2" /></>,
  contact: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M5.5 16a3.5 3.5 0 0 1 7 0M15 9h4M15 13h4" /></>,
  utensils: <><path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10" /><path d="M17 3c-1.7 0-3 2-3 5s1 4 2 4v9" /></>,
  cup: <><path d="M6 8h12l-1 11a2 2 0 0 1-2 1.8H9A2 2 0 0 1 7 19z" /><path d="M6 8l-.5-3h13L18 8" /></>,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v9h14v-9M12 8v13" /><path d="M12 8S10.5 3.5 8.5 4.5 9.5 8 12 8zM12 8s1.5-4.5 3.5-3.5S14.5 8 12 8z" /></>,
};

export default function Icon({ name, size = 16, className, strokeWidth = 1.8, style }: {
  name: IconName; size?: number; className?: string; strokeWidth?: number; style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={{ display: 'inline-block', verticalAlign: '-0.15em', flexShrink: 0, ...style }}
      aria-hidden="true"
    >{P[name]}</svg>
  );
}
