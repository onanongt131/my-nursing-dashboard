'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { WorkItem } from '@/lib/workMenus';

export type WorkSection = { key: 'units' | 'branches' | 'committee' | 'staff'; title: string; desc: string; groups: { label?: string; items: WorkItem[] }[] };

const icon: Record<WorkSection['key'], string> = {
  units: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M9 9h.01M15 9h.01M9 12h.01M15 12h.01',
  branches: 'M4 6h16M4 12h16M4 18h10',
  committee: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  staff: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
};

/** 4 กล่องเรียงแถวเดียวด้านบน กดเลือกแล้วแสดงรายการด้านล่าง */
export default function WorkOverview({ sections }: { sections: WorkSection[] }) {
  const [selected, setSelected] = useState<WorkSection['key']>(sections[0]?.key ?? 'units');
  const current = sections.find((s) => s.key === selected);
  const count = (s: WorkSection) => s.groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section className="space-y-3">
      <h1 className="text-lg font-bold text-emerald-950">ระบบงาน</h1>
      <div role="tablist" aria-label="กลุ่มระบบงาน" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {sections.map((s) => {
          const on = s.key === selected;
          return (
            <button key={s.key} type="button" role="tab" aria-selected={on} aria-controls="work-panel" onClick={() => setSelected(s.key)}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${on ? 'border-emerald-700 bg-emerald-800 text-white shadow-sm ring-1 ring-amber-400' : 'border-emerald-100 bg-white text-emerald-950 hover:border-emerald-300 hover:bg-emerald-50'}`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${on ? 'bg-emerald-700 text-amber-300' : 'bg-emerald-50 text-emerald-700'}`}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d={icon[s.key]} /></svg>
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{s.title}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${on ? 'bg-amber-300 text-emerald-950' : 'bg-emerald-100 text-emerald-800'}`}>{count(s)}</span>
            </button>
          );
        })}
      </div>

      {current && (
        <div id="work-panel" role="tabpanel" className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm text-slate-500">{current.desc}</p>
          {count(current) === 0 && <p className="text-sm text-slate-500">ยังไม่มีรายการ</p>}
          <div className="space-y-4">
            {current.groups.map((g, i) => (
              <div key={g.label ?? i}>
                {g.label && <h2 className="mb-1.5 text-xs font-semibold text-emerald-700">{g.label}</h2>}
                <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {g.items.map((it) => (
                    <li key={it.href}>
                      <Link href={it.href} className="block truncate rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-900" title={it.label}>{it.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
