/**
 * รวมการโหลดซ้ำจาก Realtime: หลายเหตุการณ์ติดกันจะโหลดใหม่ครั้งเดียวหลังรอ `delay` ms
 * และไม่โหลดขณะแท็บถูกซ่อน (จะโหลดครั้งเดียวเมื่อกลับมาดูหน้า) เพื่อลด egress ของ Supabase
 */
export function coalescedReload(reload: () => void, delay = 3000) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;
  const run = () => { timer = null; if (document.hidden) { dirty = true; return; } dirty = false; reload(); };
  const onVisible = () => { if (!document.hidden && dirty && !timer) run(); };
  document.addEventListener('visibilitychange', onVisible);
  return {
    trigger() { if (!timer) timer = setTimeout(run, delay); },
    cancel() { if (timer) clearTimeout(timer); timer = null; document.removeEventListener('visibilitychange', onVisible); },
  };
}
