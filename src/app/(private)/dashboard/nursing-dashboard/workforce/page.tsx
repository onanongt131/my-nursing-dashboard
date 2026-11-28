'use client';

import React, { useEffect, useMemo, useState } from 'react';

type Shift = 'night' | 'morning' | 'evening';
type Unit = {
  id: number; name: string; group: string;
  np: number | null; shiftNp: Record<Shift, number | null>;
  pcs: number | null; pcsScoreSum: number; pcsPatients: number;
  shiftsRecorded: number; missingNp: number;
  rnSum: number; reqSum: number; wisnShifts: number; wisnRatio: number | null;
  skillMix: number | null; mixRn: number; mixAll: number; icu: boolean; rnTarget: number;
};
type Level = 'green' | 'yellow' | 'red' | 'none';

const MONTH_TH = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const FIRST_MONTH = '2026-10'; // เริ่มเก็บสถิติรายเวร (ปีงบประมาณ 2570)
const SHIFTS: { key: Shift; label: string }[] = [{ key: 'night', label: 'เวรดึก' }, { key: 'morning', label: 'เวรเช้า' }, { key: 'evening', label: 'เวรบ่าย' }];

const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (v: string) => `${MONTH_TH[Number(v.slice(5, 7))]} ${Number(v.slice(0, 4)) + 543}`;
function monthOptions() {
  const out: string[] = [];
  const now = ym(new Date());
  for (let d = new Date(2026, 9, 1); ym(d) <= now; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) out.push(ym(d));
  return out.length ? out.reverse() : [FIRST_MONTH];
}
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

// เกณฑ์เดิมของหน้า: Productivity 90–110 / PCS ≤ 3.2 ปกติ, 3.2–3.8 เฝ้าระวัง, > 3.8 สูง
const npLevel = (v: number | null): Level => (v === null ? 'none' : v > 110 ? 'red' : v < 90 ? 'yellow' : 'green');
const pcsLevel = (v: number | null): Level => (v === null ? 'none' : v > 3.8 ? 'red' : v > 3.2 ? 'yellow' : 'green');
// WISN ratio ≥ 1.00 = เพียงพอ, 0.80–0.99 = ขาดเล็กน้อย, < 0.80 = ขาดมาก
// Skill Mix เทียบสัดส่วน RN ที่ใช้คิดอัตรากำลัง: สามัญ 70%, ICU 90% · ถึงเป้า = เขียว, ต่ำกว่าไม่เกิน 10% = เหลือง
const wisnLevel = (v: number | null): Level => (v === null ? 'none' : v >= 1 ? 'green' : v >= 0.8 ? 'yellow' : 'red');
const mixLevel = (v: number | null, target = 70): Level => (v === null ? 'none' : v >= target ? 'green' : v >= target - 10 ? 'yellow' : 'red');
const targetOf = (list: Unit[]) => { const w = list.reduce((t, u) => t + u.mixAll, 0); return w ? list.reduce((t, u) => t + u.rnTarget * u.mixAll, 0) / w : 70; };
const levelBadge = (l: Level) => (l === 'green' ? 'bg-emerald-50 text-emerald-700' : l === 'yellow' ? 'bg-amber-50 text-amber-700' : l === 'red' ? 'bg-rose-50 text-rose-700' : 'bg-gray-100 text-gray-500');
const levelText = (l: Level) => (l === 'green' ? 'text-emerald-700' : l === 'yellow' ? 'text-amber-700' : l === 'red' ? 'text-rose-700' : 'text-gray-800');
const npText = (v: number | null) => (v === null ? 'text-gray-300' : v > 110 ? 'text-rose-700' : v < 90 ? 'text-amber-700' : 'text-emerald-700');
const npDot = (v: number | null) => (v === null ? 'bg-gray-300' : v > 110 ? 'bg-rose-500' : v < 90 ? 'bg-amber-400' : 'bg-emerald-500');
const npCategory = (v: number | null) => (v === null ? 'ไม่มีข้อมูล' : v > 110 ? '>110 (High)' : v < 90 ? '<90 (Low)' : '90-110 (Target)');
function riskOf(levels: Level[]) {
  const known = levels.filter((l) => l !== 'none');
  if (!known.length) return { label: 'ไม่มีข้อมูล', cls: 'text-gray-500 bg-gray-100' };
  if (known.includes('red')) return { label: 'High', cls: 'text-rose-700 bg-rose-50' };
  if (known.includes('yellow')) return { label: 'Medium', cls: 'text-amber-700 bg-amber-50' };
  return { label: 'Low', cls: 'text-emerald-700 bg-emerald-50' };
}

function Dot({ level, title }: { level: Level; title?: string }) {
  if (level === 'none') return <span className="text-[10px] text-gray-300" title={title ?? 'ไม่มีข้อมูล'}>—</span>;
  const c = level === 'green' ? 'bg-emerald-500' : level === 'yellow' ? 'bg-amber-400' : 'bg-rose-500';
  return <div className={`mx-auto h-3.5 w-3.5 rounded-full ${c} shadow-2xs`} title={title} />;
}

function NpBar({ value, size = 'sm' }: { value: number | null; size?: 'sm' | 'md' }) {
  return (
    <div className={`relative w-full rounded-full bg-gray-200 ${size === 'md' ? 'h-2' : 'h-1.5'}`}>
      <div className="absolute bottom-0 left-[60%] right-[26.7%] top-0 rounded-full bg-emerald-200 opacity-70" title="ช่วงเป้าหมาย 90–110" />
      {value !== null && <div className={`absolute -top-[3px] h-3 w-3 rounded-full border-2 border-white shadow-xs ${npDot(value)}`} style={{ left: `${Math.min(Math.max((value / 150) * 100, 3), 95)}%` }} title={`NP ${value}`} />}
    </div>
  );
}

export default function WorkforceDashboardPage() {
  const months = useMemo(monthOptions, []);
  const [month, setMonth] = useState(months[0]);
  const [state, setState] = useState<{ month: string; items: Unit[]; error?: string } | null>(null);

  const [viewMode, setViewMode] = useState<'unit' | 'group'>('group');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [riskViewMode, setRiskViewMode] = useState<'unit' | 'group'>('group');
  const [riskSearchTerm, setRiskSearchTerm] = useState('');
  const [tab, setTab] = useState<'risk' | 'productivity'>('risk');
  const [selectedRiskGroup, setSelectedRiskGroup] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/workforce-dashboard?month=' + month, { cache: 'no-store', signal: controller.signal })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'อ่านข้อมูลไม่สำเร็จ'); setState({ month, items: d.items || [] }); })
      .catch((e) => { if (!controller.signal.aborted) setState({ month, items: [], error: e.message }); });
    return () => controller.abort();
  }, [month]);

  const loading = state?.month !== month;
  const units = useMemo(() => (loading ? [] : state?.items ?? []), [loading, state]);

  const groups = useMemo(() => {
    const map = new Map<string, Unit[]>();
    for (const u of units) map.set(u.group, [...(map.get(u.group) ?? []), u]);
    return [...map.entries()].map(([name, list]) => {
      const nps = list.map((u) => u.np).filter((v): v is number => v !== null);
      const score = list.reduce((t, u) => t + u.pcsScoreSum, 0), patients = list.reduce((t, u) => t + u.pcsPatients, 0);
      const rn = list.reduce((t, u) => t + u.rnSum, 0), req = list.reduce((t, u) => t + u.reqSum, 0), mr = list.reduce((t, u) => t + u.mixRn, 0), ma = list.reduce((t, u) => t + u.mixAll, 0);
      return { name, units: list, np: nps.length ? Number(mean(nps)!.toFixed(2)) : null, pcs: patients ? Number((score / patients).toFixed(2)) : null, wisn: req ? Number((rn / req).toFixed(2)) : null, mix: ma ? Number((mr / ma * 100).toFixed(1)) : null, target: targetOf(list), withData: nps.length };
    }).sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [units]);

  const summary = useMemo(() => {
    const nps = units.map((u) => u.np).filter((v): v is number => v !== null);
    const score = units.reduce((t, u) => t + u.pcsScoreSum, 0), patients = units.reduce((t, u) => t + u.pcsPatients, 0);
    return {
      np: nps.length ? Number(mean(nps)!.toFixed(1)) : null,
      npUnits: nps.length,
      pcs: patients ? Number((score / patients).toFixed(2)) : null,
      reporting: units.filter((u) => u.shiftsRecorded > 0).length,
      ...(() => { const rn = units.reduce((t, u) => t + u.rnSum, 0), req = units.reduce((t, u) => t + u.reqSum, 0), mr = units.reduce((t, u) => t + u.mixRn, 0), ma = units.reduce((t, u) => t + u.mixAll, 0); return { wisn: req ? Number((rn / req).toFixed(2)) : null, rn, req, wisnUnits: units.filter((u) => u.reqSum > 0).length, mix: ma ? Number((mr / ma * 100).toFixed(1)) : null, target: targetOf(units) }; })(),
    };
  }, [units]);

  // ---------- Risk Matrix ----------
  const riskRows = useMemo(() => {
    const q = riskSearchTerm.toLowerCase();
    if (riskViewMode === 'unit') {
      return units
        .filter((u) => !selectedRiskGroup || u.group === selectedRiskGroup)
        .filter((u) => u.name.toLowerCase().includes(q) || u.group.toLowerCase().includes(q))
        .map((u) => ({ key: String(u.id), group: u.group, unit: u.name, np: u.np, pcs: u.pcs, wisn: u.wisnRatio, mix: u.skillMix, target: u.rnTarget, risk: riskOf([npLevel(u.np), pcsLevel(u.pcs), wisnLevel(u.wisnRatio), mixLevel(u.skillMix, u.rnTarget)]), count: 0 }));
    }
    return groups.filter((g) => g.name.toLowerCase().includes(q))
      .map((g) => ({ key: g.name, group: g.name, unit: '', np: g.np, pcs: g.pcs, wisn: g.wisn, mix: g.mix, target: g.target, risk: riskOf([npLevel(g.np), pcsLevel(g.pcs), wisnLevel(g.wisn), mixLevel(g.mix, g.target)]), count: g.units.length }));
  }, [units, groups, riskViewMode, riskSearchTerm, selectedRiskGroup]);

  // ---------- Productivity by Unit & Group ----------
  const prodRows = useMemo(() => {
    const q = searchTerm.toLowerCase();
    if (viewMode === 'unit') return units.filter((u) => !selectedGroup || u.group === selectedGroup).filter((u) => u.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name, 'th'));
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [units, groups, viewMode, searchTerm, selectedGroup]);

  return (
    <div className="min-h-screen w-full bg-gray-50/50 px-6 pb-12 sm:px-8 lg:px-12">
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 pt-6">
          <div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Workforce Command Center</span>
            <h2 className="mt-2 text-2xl font-extrabold text-gray-900">วิเคราะห์อัตรากำลังและภาระงาน</h2>
            <p className="mt-1 text-sm text-gray-600">จากสถิติรายเวรที่หน่วยงานบันทึก · {monthLabel(month)}{!loading && ` · ส่งข้อมูล ${summary.reporting}/${units.length} หน่วยงาน`}</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">เลือกเดือน
            <select value={month} onChange={(e) => { setMonth(e.target.value); }} className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-emerald-900">
              {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </label>
        </div>

        {state?.error && !loading && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}

        {/* การ์ดสรุป */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card label="RN Available (WISN ratio)" value={loading ? '…' : summary.wisn === null ? null : summary.wisn.toFixed(2)} valueCls={levelText(wisnLevel(summary.wisn))}
            badge={summary.wisn === null ? 'ไม่มีข้อมูล' : summary.wisn >= 1 ? 'เพียงพอ' : summary.wisn >= 0.8 ? 'ขาดเล็กน้อย' : 'ขาดมาก'} badgeCls={levelBadge(wisnLevel(summary.wisn))}
            note={summary.wisn === null ? 'RN ขึ้นเวรจริง ÷ RN ที่ต้องมีตามภาระงาน (อ.ว)' : `RN ขึ้นจริง ${summary.rn} ÷ ต้องมี ${summary.req} คน-เวร · ${summary.wisnUnits} หน่วยงาน`} />
          <Card label="Productivity" value={loading ? '…' : summary.np === null ? null : `${summary.np}%`} valueCls={npText(summary.np)}
            badge={summary.np === null ? 'ไม่มีข้อมูล' : npCategory(summary.np)} badgeCls={summary.np === null ? 'bg-gray-100 text-gray-500' : npLevel(summary.np) === 'green' ? 'bg-emerald-50 text-emerald-700' : npLevel(summary.np) === 'red' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}
            note={`เฉลี่ยจาก ${summary.npUnits} หน่วยงาน · สูตรเดียวกับรายงาน Productivity`} />
          <Card label="PCS (Acuity)" value={loading ? '…' : summary.pcs === null ? null : summary.pcs.toFixed(2)}
            badge={summary.pcs === null ? 'ไม่มีข้อมูล' : summary.pcs > 3.8 ? 'สูง' : summary.pcs > 3.2 ? 'เฝ้าระวัง' : 'ปกติ'}
            badgeCls={pcsLevel(summary.pcs) === 'green' ? 'bg-blue-50 text-blue-700' : pcsLevel(summary.pcs) === 'red' ? 'bg-rose-50 text-rose-700' : pcsLevel(summary.pcs) === 'yellow' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}
            note="ค่าเฉลี่ยถ่วงน้ำหนักระดับความรุนแรง 1–6 ของผู้ป่วยทุกเวร" />
          <Card label="Skill Mix" value={loading ? '…' : summary.mix === null ? null : `${summary.mix}%`} valueCls={levelText(mixLevel(summary.mix, summary.target))}
            badge={summary.mix === null ? 'ไม่มีข้อมูล' : summary.mix >= summary.target ? 'ถึงเป้า' : summary.mix >= summary.target - 10 ? 'เฝ้าระวัง' : 'ต่ำกว่าเป้า'} badgeCls={levelBadge(mixLevel(summary.mix, summary.target))}
            note={summary.mix === null ? 'ต้องบันทึกจำนวน TN / PN / NA รายเวร · เป้า RN สามัญ 70% ICU 90%' : `RN ÷ (RN + TN + PN + NA) · เป้า ${Math.round(summary.target)}% (สามัญ 70% ICU 90%)`} />
        </div>

        <div role="tablist" aria-label="มุมมองข้อมูลอัตรากำลัง" className="inline-flex rounded-xl border border-emerald-200 bg-white p-1 shadow-sm">
          {([['risk', 'Workforce Risk Matrix'], ['productivity', 'Productivity by Unit & Group']] as const).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${tab === k ? 'bg-emerald-800 text-amber-300' : 'text-emerald-900 hover:bg-emerald-50'}`}>{label}</button>
          ))}
        </div>

        {/* Risk Matrix */}
        {tab === 'risk' && <section className="w-full space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <Header
            title={selectedRiskGroup ? `Workforce Risk Matrix (กลุ่ม: ${selectedRiskGroup})` : 'Workforce Risk Matrix'}
            sub={riskViewMode === 'unit' ? (selectedRiskGroup ? `แสดงหน่วยงานในกลุ่ม ${selectedRiskGroup}` : 'ประเมินความเสี่ยงรายหน่วยงาน') : 'ประเมินความเสี่ยงตามกลุ่มงาน (กดดูข้อมูลกลุ่มงานเพื่อเจาะลึกรายหน่วยงาน)'}
            onBack={selectedRiskGroup ? () => { setSelectedRiskGroup(null); setRiskViewMode('group'); } : undefined}
            search={riskSearchTerm} onSearch={setRiskSearchTerm} mode={riskViewMode} selected={!!selectedRiskGroup}
            onMode={(m) => { setSelectedRiskGroup(null); setRiskViewMode(m); }} />
          <div className="w-full overflow-x-auto">
            <table className="w-full table-auto border-collapse text-left">
              <thead><tr className="border-b border-gray-100 text-xs font-bold text-gray-400">
                {(riskViewMode === 'group' || !selectedRiskGroup) && <th className="w-1/4 px-6 py-3">กลุ่มงาน</th>}
                {riskViewMode === 'unit' && <th className="w-1/4 px-6 py-3">หน่วยงาน</th>}
                <th className="px-4 py-3 text-center">Productivity</th>
                <th className="px-4 py-3 text-center">PCS</th>
                <th className="px-4 py-3 text-center">Skill Mix</th>
                <th className="px-4 py-3 text-center">RN Available</th>
                <th className="px-6 py-3 text-right">Risk</th>
                {riskViewMode === 'group' && <th className="px-6 py-3 text-center">ดูข้อมูลกลุ่มงาน</th>}
              </tr></thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {loading ? <tr><td colSpan={8} className="py-6 text-center text-gray-400">กำลังโหลดข้อมูล…</td></tr>
                  : !riskRows.length ? <tr><td colSpan={8} className="py-6 text-center text-gray-400">ไม่พบข้อมูล</td></tr>
                  : riskRows.map((r) => (
                    <tr key={r.key} className="hover:bg-gray-50/50">
                      {(riskViewMode === 'group' || !selectedRiskGroup) && <td className={`px-6 py-4 font-bold ${riskViewMode === 'group' ? 'text-gray-800' : 'text-emerald-800'}`}>{r.group}</td>}
                      {riskViewMode === 'unit' && <td className="px-6 py-4 font-medium text-gray-700">{r.unit}</td>}
                      <td className="px-4 py-4 text-center"><Dot level={npLevel(r.np)} title={r.np === null ? undefined : `NP ${r.np}`} /></td>
                      <td className="px-4 py-4 text-center"><Dot level={pcsLevel(r.pcs)} title={r.pcs === null ? undefined : `PCS ${r.pcs}`} /></td>
                      <td className="px-4 py-4 text-center"><Dot level={mixLevel(r.mix, r.target)} title={r.mix === null ? undefined : `Skill Mix ${r.mix}% (เป้า ${Math.round(r.target)}%)`} /></td>
                      <td className="px-4 py-4 text-center"><Dot level={wisnLevel(r.wisn)} title={r.wisn === null ? undefined : `WISN ratio ${r.wisn.toFixed(2)}`} /></td>
                      <td className="px-6 py-4 text-right"><span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${r.risk.cls}`}>{r.risk.label}</span></td>
                      {riskViewMode === 'group' && <td className="px-6 py-4 text-center">
                        <button type="button" onClick={() => { setSelectedRiskGroup(r.group); setRiskViewMode('unit'); }} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
                          ดูข้อมูลกลุ่มงาน <span className="font-normal text-gray-400">({r.count})</span>
                        </button>
                      </td>}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <RiskLegend />
        </section>}

        {/* Productivity by Unit & Group */}
        {tab === 'productivity' && <section className="w-full space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <Header
            title={selectedGroup ? `กลุ่มงาน: ${selectedGroup}` : 'Productivity by Unit & Group'}
            sub={viewMode === 'unit' ? (selectedGroup ? `แสดงหน่วยงานภายใต้กลุ่ม ${selectedGroup}` : 'รายหน่วยงาน · ค่าเฉลี่ยรายเวรของเดือน + ค่ารายเดือน') : 'ภาพรวมตามกลุ่มงาน (ค่าเฉลี่ยของหน่วยงานที่มีข้อมูล)'}
            onBack={selectedGroup ? () => { setSelectedGroup(null); setViewMode('group'); } : undefined}
            search={searchTerm} onSearch={setSearchTerm} mode={viewMode} selected={!!selectedGroup}
            onMode={(m) => { setSelectedGroup(null); setViewMode(m); }} />
          <div className="max-h-[600px] w-full space-y-3 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-4 pr-2">
            {loading ? <p className="py-8 text-center text-xs text-gray-400">กำลังโหลดข้อมูล…</p>
              : !prodRows.length ? <p className="py-8 text-center text-xs text-gray-400">ไม่พบข้อมูล</p>
              : viewMode === 'unit' ? (prodRows as Unit[]).map((u) => (
                <div key={u.id} className="grid w-full grid-cols-1 items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-2xs lg:grid-cols-5">
                  <div className="flex flex-col border-b border-gray-100 pb-2 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-3">
                    <span className="truncate text-xs font-extrabold text-gray-800" title={u.name}>{u.name}</span>
                    <span className="truncate text-[10px] text-gray-400">({u.group}) · บันทึก {u.shiftsRecorded} เวร{u.missingNp ? ` · NP ว่าง ${u.missingNp}` : ''}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-3">
                    {SHIFTS.map((s) => { const v = u.shiftNp[s.key]; return (
                      <div key={s.key} className="flex flex-col gap-1.5 rounded-xl border border-gray-100 bg-gray-50/70 p-2.5">
                        <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-gray-500">{s.label}</span><span className={`text-[11px] font-bold ${npText(v)}`}>{v === null ? '-' : `${v}%`}</span></div>
                        <NpBar value={v} />
                      </div>
                    ); })}
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border-t border-gray-100 bg-emerald-50/30 p-2.5 pt-2 lg:justify-end lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
                    <div className="flex items-center gap-1.5"><div className={`h-2.5 w-2.5 rounded-full ${npDot(u.np)}`} /><span className="text-[10px] font-bold text-gray-500">ทั้งเดือน</span></div>
                    <span className={`text-sm font-black ${npText(u.np)}`}>{u.np === null ? '—' : `${u.np}%`}</span>
                  </div>
                </div>
              )) : (prodRows as typeof groups).map((g) => (
                <div key={g.name} className="flex w-full flex-col justify-between gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-2xs sm:flex-row sm:items-center">
                  <div className="w-full sm:w-1/4"><span className="block truncate text-xs font-bold text-gray-800" title={g.name}>{g.name}</span><span className="text-[10px] text-gray-400">มีข้อมูล {g.withData}/{g.units.length} หน่วยงาน</span></div>
                  <div className="flex-1 px-4"><NpBar value={g.np} size="md" /></div>
                  <div className="flex w-56 items-center justify-between gap-6 text-xs sm:justify-end">
                    <span className="text-gray-400">สถานะ: <span className="font-medium text-gray-600">{npCategory(g.np)}</span></span>
                    <span className={`rounded-lg px-2.5 py-1 text-sm font-bold ${npText(g.np)}`}>{g.np === null ? '—' : `${g.np}%`}</span>
                  </div>
                  <button type="button" onClick={() => { setSelectedGroup(g.name); setViewMode('unit'); }} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
                    ดูข้อมูลหน่วยงาน <span className="font-normal text-gray-400">({g.units.length})</span>
                  </button>
                </div>
              ))}
          </div>
        </section>}
      </div>
    </div>
  );
}

const LEGEND: { dot: string; label: string; items: string[] }[] = [
  { dot: 'bg-emerald-500', label: 'เขียว (ปกติ)', items: ['Productivity 90–110', 'PCS ≤ 3.2', 'Skill Mix ถึงเป้า RN (สามัญ ≥ 70%, ICU ≥ 90%)', 'RN Available (WISN ratio) ≥ 1.00'] },
  { dot: 'bg-amber-400', label: 'เหลือง (เฝ้าระวัง)', items: ['Productivity < 90', 'PCS 3.21–3.8', 'Skill Mix ต่ำกว่าเป้าไม่เกิน 10%', 'RN Available 0.80–0.99'] },
  { dot: 'bg-rose-500', label: 'แดง (เสี่ยง)', items: ['Productivity > 110', 'PCS > 3.8', 'Skill Mix ต่ำกว่าเป้าเกิน 10%', 'RN Available < 0.80'] },
];

function RiskLegend() {
  return (
    <div className="space-y-1.5 rounded-xl bg-gray-50 p-3 text-[11px] text-gray-600">
      <p className="font-bold text-gray-700">เกณฑ์</p>
      {LEGEND.map((l) => (
        <div key={l.label} className="flex flex-wrap items-start gap-x-2 gap-y-0.5">
          <span className="flex w-32 shrink-0 items-center gap-1.5 font-semibold"><span className={`inline-block h-2.5 w-2.5 rounded-full ${l.dot}`} />{l.label}</span>
          <span className="min-w-0 flex-1">{l.items.join(' · ')}</span>
        </div>
      ))}
      <p className="pt-1 text-gray-500">RN Available (WISN ratio) = RN ขึ้นเวรจริง ÷ อ.ว · Risk = ระดับที่แย่ที่สุดของตัวชี้วัดที่มีข้อมูล · — = ไม่มีข้อมูล</p>
    </div>
  );
}

function Card({ label, value, valueCls = 'text-gray-800', badge, badgeCls, note }: { label: string; value: string | null; valueCls?: string; badge: string; badgeCls: string; note: string }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
      <span className="text-xs font-bold text-gray-400">{label}</span>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className={`text-xl font-black ${value === null ? 'text-gray-300' : valueCls}`}>{value ?? '—'}</span>
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${badgeCls}`}>{badge}</span>
      </div>
      <p className="mt-1.5 text-[10px] text-gray-400">{note}</p>
    </div>
  );
}

function Header({ title, sub, onBack, search, onSearch, mode, selected, onMode }: { title: string; sub: string; onBack?: () => void; search: string; onSearch: (v: string) => void; mode: 'unit' | 'group'; selected: boolean; onMode: (m: 'unit' | 'group') => void }) {
  return (
    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-gray-800">{title}</h3>
          {onBack && <button type="button" onClick={onBack} className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-200">← กลับไปภาพรวมกลุ่มงาน</button>}
        </div>
        <p className="mt-0.5 text-xs text-gray-500">{sub}</p>
      </div>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <input type="text" value={search} onChange={(e) => onSearch(e.target.value)} placeholder={mode === 'group' ? '🔍 ค้นหาชื่อกลุ่มงาน...' : '🔍 ค้นหาชื่อหน่วยงาน...'}
          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 sm:w-64" />
        <div className="flex shrink-0 items-center rounded-xl bg-gray-100 p-1">
          <button type="button" onClick={() => onMode('unit')} className={`rounded-lg px-3.5 py-1.5 text-xs font-bold ${mode === 'unit' && !selected ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}>🏥 รายหน่วยงาน</button>
          <button type="button" onClick={() => onMode('group')} className={`rounded-lg px-3.5 py-1.5 text-xs font-bold ${mode === 'group' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}>📊 ภาพรวมกลุ่มงาน</button>
        </div>
      </div>
    </div>
  );
}
