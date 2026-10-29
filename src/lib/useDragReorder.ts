import { useEffect, useRef, useState } from 'react';

/**
 * 목록 드래그 정렬 훅(의존성 없음 · HTML5 Drag&Drop).
 * - items: {id} 를 가진 현재 목록(정렬 기준 순서)
 * - onCommit: 드롭 완료 시 새 순서의 id 배열을 저장(서버 반영)
 * 반환: order(실시간 미리보기 순서), handlers(i)=행에 스프레드, dragging(현재 끌고 있는지)
 *
 * 사용: 행에 `{...handlers(i)}` 를 펼치고, 손잡이(☰)에 `className="cursor-grab"`.
 */
export function useDragReorder<T extends { id: string }>(
  items: T[],
  onCommit: (orderedIds: string[]) => Promise<void> | void,
) {
  const [order, setOrder] = useState<T[]>(items);
  const [dragId, setDragId] = useState<string | null>(null);
  const fromRef = useRef<number | null>(null);
  const movedRef = useRef(false);
  const orderRef = useRef<T[]>(items);

  // 외부 목록이 바뀌면 동기화(단, 드래그 중엔 유지)
  useEffect(() => {
    if (fromRef.current === null) { setOrder(items); orderRef.current = items; }
  }, [items]);
  useEffect(() => { orderRef.current = order; }, [order]);

  function handlers(i: number) {
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        fromRef.current = i;
        movedRef.current = false;
        setDragId(orderRef.current[i]?.id ?? null);
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(i)); } catch { /* no-op */ }
      },
      onDragEnter: () => {
        const from = fromRef.current;
        if (from === null || from === i) return;
        setOrder((prev) => {
          const next = [...prev];
          const [m] = next.splice(from, 1);
          next.splice(i, 0, m);
          return next;
        });
        fromRef.current = i;
        movedRef.current = true;
      },
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDrop: (e: React.DragEvent) => e.preventDefault(),
      onDragEnd: async () => {
        fromRef.current = null;
        setDragId(null);
        if (movedRef.current) {
          movedRef.current = false;
          await onCommit(orderRef.current.map((x) => x.id));
        }
      },
    };
  }

  return { order, handlers, dragId };
}
