'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { WorkItem } from '@/lib/workMenus';

export type WorkSection = { key: 'units' | 'branches' | 'committee' | 'staff'; title: string; groups: { label?: string; items: WorkItem[] }[] };

const icon: Record<WorkSection['key'], string> = {
  units: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M9 9h.01M15 9h.01M9 12h.01M15 12h.01',
  branches: 'M4 6h16M4 12h16M4 18h10',
  committee: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  staff: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
};

/** หน้า "ระบบงาน": มีเฉพาะ 4 กล่อง แต่ละกล่องกดแล้วเปิด dropdown ให้เลือกหน้า */
export default function WorkOverview({ sections }: { sections: WorkSection[] }) {
  const [open, setOpen] = useState<WorkSection['key'] | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const count = (s: WorkSection) => s.groups.reduce((n, g) => n + g.items.length, 0);

  useEffect(() => {
    const onOutside = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null); };
    const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => { document.removeEventListener('pointerdown', onOutside); document.removeEventListener('keydown', onEscape); };
  }, []);

  return (
    <div ref={ref} className="-mt-2 grid grid-cols-1 items-start gap-2 sm:grid-cols-2 md:-mt-3 lg:grid-cols-4">
      {sections.map((s) => {
        const on = open === s.key;
        return (
          <div key={s.key} className={`rounded-xl border bg-white transition-colors ${on ? 'border-emerald-700 shadow-md ring-1 ring-amber-400' : 'border-emerald-100 hover:border-emerald-300'}`}>
            <button type="button" aria-expanded={on} aria-controls={`work-${s.key}`} onClick={() => setOpen(on ? null : s.key)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left ${on ? 'rounded-b-none bg-emerald-800 text-white' : 'text-emerald-950 hover:bg-emerald-50'}`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${on ? 'bg-emerald-700 text-amber-300' : 'bg-emerald-50 text-emerald-700'}`}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d={icon[s.key]} /></svg>
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{s.title}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${on ? 'bg-amber-300 text-emerald-950' : 'bg-emerald-100 text-emerald-800'}`}>{count(s)}</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 shrink-0 transition-transform ${on ? 'rotate-180 text-amber-300' : 'text-emerald-700'}`}><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {on && (
              <div id={`work-${s.key}`} className="max-h-[60vh] overflow-y-auto p-2">
                {count(s) === 0 && <p className="px-2 py-1.5 text-sm text-slate-500">ยังไม่มีรายการ</p>}
                {s.groups.map((g, i) => (
                  <div key={g.label ?? i} className="mb-1 last:mb-0">
                    {g.label && <p className="px-2 pb-0.5 pt-1.5 text-xs font-semibold text-emerald-700">{g.label}</p>}
                    <ul>
                      {g.items.map((it) => (
                        <li key={it.href}>
                          <Link href={it.href} onClick={() => setOpen(null)} className="block rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-900">{it.label}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
