import Link from 'next/link';
import { dashboardContext } from '@/lib/auth/dashboardContext';
import { committees, nursingBranches, workforce, type WorkItem } from '@/lib/workMenus';

export const dynamic = 'force-dynamic';

type Section = { title: string; desc: string; groups: { label?: string; items: WorkItem[] }[] };

const icon = {
  units: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M9 9h.01M15 9h.01M9 12h.01M15 12h.01',
  branches: 'M4 6h16M4 12h16M4 18h10',
  committee: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  staff: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
};

/** หน้ารวม "ระบบงาน": เลือกกลุ่มเมนูก่อนเข้าหน้าย่อย */
export default async function WorkOverviewPage() {
  const { departments } = await dashboardContext();
  const unitGroups = new Map<string, WorkItem[]>();
  for (const d of departments) {
    const title = d.Department || d.department_name || d.name;
    if (d.id == null || !title) continue;
    const group = d.group || d.group_name || 'กลุ่มงานทั่วไป';
    unitGroups.set(group, [...(unitGroups.get(group) || []), { label: title, href: `/dashboard/departments/${encodeURIComponent(String(d.id))}` }]);
  }
  const sections: (Section & { key: keyof typeof icon })[] = [
    { key: 'units', title: 'หน่วยงานภายใน', desc: 'ตัวชี้วัดและข้อมูลของแต่ละหน่วยงาน', groups: [...unitGroups.entries()].map(([label, items]) => ({ label, items })) },
    { key: 'branches', title: '16 กลุ่มงาน', desc: 'กลุ่มงานการพยาบาลเฉพาะทาง', groups: [{ items: nursingBranches }] },
    { key: 'committee', title: 'คณะกรรมการ', desc: 'งานคณะกรรมการกลุ่มภารกิจด้านการพยาบาล', groups: [{ items: committees }] },
    { key: 'staff', title: 'อัตรากำลัง', desc: 'บุคลากร ตารางเวร และภาพรวมอัตรากำลัง', groups: [{ items: workforce }] },
  ];

  return (
    <section className="space-y-4">
      <header className="rounded-2xl bg-gradient-to-r from-emerald-900 to-emerald-800 px-5 py-5 text-white shadow-sm">
        <h1 className="text-xl font-bold text-amber-300">ระบบงาน</h1>
        <p className="mt-1 text-sm text-emerald-100">เลือกกลุ่มงานที่ต้องการ แล้วกดเพื่อดูรายการ</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((s) => {
          const count = s.groups.reduce((n, g) => n + g.items.length, 0);
          return (
            <details key={s.key} className="group rounded-2xl border border-emerald-100 bg-white shadow-sm open:ring-1 open:ring-emerald-300">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d={icon[s.key]} /></svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-emerald-950">{s.title} <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">{count}</span></span>
                  <span className="block text-sm text-slate-500">{s.desc}</span>
                </span>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-emerald-700 transition-transform group-open:rotate-180"><path d="m6 9 6 6 6-6" /></svg>
              </summary>
              <div className="max-h-[28rem] space-y-3 overflow-y-auto border-t border-emerald-50 px-4 pb-4 pt-3">
                {count === 0 && <p className="text-sm text-slate-500">ยังไม่มีรายการ</p>}
                {s.groups.map((g, i) => (
                  <div key={g.label ?? i}>
                    {g.label && <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">{g.label}</h2>}
                    <ul className="grid gap-1.5 sm:grid-cols-2">
                      {g.items.map((it) => (
                        <li key={it.href}>
                          <Link href={it.href} className="block rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-900">{it.label}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
