"use client";

import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { wpSpecialCriteria, wpUnitNames, type WpFormType } from "@/lib/wpSpecialCriteria";

type WpRecord = { assessed: string; performed: string; note: string };
type Props = { isOpen: boolean; onClose: () => void; formType: WpFormType; departmentName?: string; departmentId: string | number; onSuccess?: () => void };
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const validNonnegativeInteger = (v: string) => v === "" || /^(0|[1-9]\d*)$/.test(v);

export default function WpSpecialAuditModal({ isOpen, onClose, formType, departmentName, departmentId, onSuccess }: Props) {
  const sections = wpSpecialCriteria[formType];
  const allItems = useMemo(() => sections.flatMap(s => s.items), [sections]);
  const [month, setMonth] = useState(currentMonth);
  const [reference, setReference] = useState("");
  const [auditor, setAuditor] = useState("");
  const [generalNote, setGeneralNote] = useState("");
  const [answers, setAnswers] = useState<Record<string, WpRecord>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = old; document.removeEventListener("keydown", escape); };
  }, [isOpen, onClose]);
  const setField = (id: string, field: keyof WpRecord, value: string) => {
    if (field !== "note" && !validNonnegativeInteger(value)) return;
    setPreview(false);
    setAnswers(prev => {

const current: WpRecord = prev[id] ?? {
  assessed: "",
  performed: "",
  note: "",
};

const next: WpRecord = {
  ...current,
  [field]: value,
};

      if (field !== "note" && next.assessed !== "" && next.performed !== "" && Number(next.assessed) === Number(next.performed)) next.note = "";
      return { ...prev, [id]: next };
    });
  };
  const stats = useMemo(() => {
    let assessed = 0, performed = 0, completed = 0, invalid = 0;
    for (const item of allItems) {
      const v = answers[item.id];
      if (!v || v.assessed === "" || v.performed === "") continue;
      const a = Number(v.assessed), p = Number(v.performed);
      if (!Number.isSafeInteger(a) || !Number.isSafeInteger(p) || p > a) { invalid++; continue; }
      assessed += a; performed += p; completed++;
    }
    return { assessed, performed, completed, invalid, total: allItems.length, percent: assessed ? 100 * performed / assessed : null };
  }, [answers, allItems]);
  const clear = () => {
    if (!window.confirm("ล้างข้อมูลที่กรอกในฟอร์มนี้ทั้งหมดหรือไม่?")) return;
    setAnswers({}); setReference(""); setAuditor(""); setGeneralNote(""); setPreview(false);
  };
  const handleSave = async () => {
    if (saving) return;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) { window.alert("กรุณาระบุเดือนประเมิน"); return; }
    if (!auditor.trim()) { window.alert("กรุณาระบุชื่อผู้ประเมิน / ผู้บันทึก"); return; }
    const dept = Number(departmentId);
    if (!Number.isSafeInteger(dept) || dept < 1) { window.alert("รหัสหน่วยงานไม่ถูกต้อง"); return; }
    const packed: Record<string, { total_evaluated: number; total_practiced: number; unpracticed_reasons: string | null }> = {};
    for (const item of allItems) {
      const v = answers[item.id];
      if (!v || v.assessed === "" || v.performed === "") { window.alert(`กรุณากรอกจำนวนประเมินและจำนวนปฏิบัติ ข้อ ${item.number}`); return; }
      const a = Number(v.assessed), b = Number(v.performed);
      if (!Number.isSafeInteger(a) || a <= 0) { window.alert(`ข้อ ${item.number}: จำนวนประเมินต้องมากกว่า 0`); return; }
      if (!Number.isSafeInteger(b) || b < 0 || b > a) { window.alert(`ข้อ ${item.number}: จำนวนปฏิบัติต้องอยู่ระหว่าง 0 ถึงจำนวนประเมิน`); return; }
      if (b !== a && !v.note.trim()) { window.alert(`ข้อ ${item.number}: กรุณาระบุสิ่งที่ไม่ได้ปฏิบัติ / หมายเหตุ`); return; }
      packed[item.id] = { total_evaluated: a, total_practiced: b, unpracticed_reasons: a !== b ? v.note.trim() : null };
    }
    setSaving(true);
    try {
      const response = await fetch("/api/wp-special", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ department_id: dept, form_type: formType, audit_month: month,
          reference_number: reference.trim() || null, auditor_name: auditor.trim(), answers: packed,
          general_note: generalNote.trim() || null })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
      window.alert("บันทึกข้อมูล WP/QA สำเร็จ (สถานะรออนุมัติ)");
      onSuccess?.();
      onClose();
    } catch (e) {
      window.alert("ไม่สามารถบันทึกข้อมูล WP/QA: " + (e instanceof Error ? e.message : "เกิดข้อผิดพลาด"));
    } finally { setSaving(false); }
  };
  if (!isOpen || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[2147483647] isolate flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label="ประเมิน WP เฉพาะหน่วยงาน">
      <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-emerald-100 bg-white px-4 py-3 sm:px-6">
          <div><h2 className="text-base font-bold text-emerald-900 sm:text-lg">ประเมินแนวปฏิบัติ WP — {departmentName || wpUnitNames[formType]}</h2>
            <p className="text-xs text-slate-500">จำนวนประเมิน / จำนวนปฏิบัติ รายข้อ — บันทึกสถานะรออนุมัติ</p></div>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100" aria-label="ปิด">✕</button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 sm:grid-cols-3">
            <label className="text-sm font-semibold text-emerald-900">ประจำเดือน (Month)<input type="month" value={month} onChange={e => setMonth(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm" /></label>
            <label className="text-sm font-semibold text-emerald-900">รหัสอ้างอิง (ถ้ามี)<input value={reference} onChange={e => setReference(e.target.value)} placeholder="รหัสอ้างอิงการประเมิน" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm" /></label>
            <label className="text-sm font-semibold text-emerald-900">ชื่อผู้ประเมิน / ผู้บันทึก<input value={auditor} onChange={e => setAuditor(e.target.value)} placeholder="ระบุชื่อ-นามสกุลผู้ประเมิน" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm" /></label>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-2"><p className="text-xs">ข้อเกณฑ์ทั้งหมด</p><strong>{stats.total}</strong></div>
            <div className="rounded-lg bg-sky-50 p-2"><p className="text-xs">ข้อที่กรอกครบ</p><strong>{stats.completed}/{stats.total}</strong></div>
            <div className="rounded-lg bg-emerald-50 p-2"><p className="text-xs">จำนวนปฏิบัติ / ประเมิน</p><strong>{stats.performed}/{stats.assessed}</strong></div>
            <div className="rounded-lg bg-violet-50 p-2"><p className="text-xs">ร้อยละปฏิบัติ</p><strong>{stats.percent === null ? "-" : `${stats.percent.toFixed(2)}%`}</strong></div>
          </div>
          {sections.map((section, i) => (
            <section key={`${formType}_${i}`} className="overflow-hidden rounded-xl border border-emerald-200">
              <button type="button" className="flex w-full items-center justify-between bg-emerald-700 px-4 py-3 text-left font-bold text-white" onClick={() => setExpanded(v => ({ ...v, [i]: v[i] === false }))}>
                <span>{i+1}. {section.title} ({section.items.length} ข้อ)</span><span>{expanded[i] === false ? "+" : "−"}</span>
              </button>
              {expanded[i] !== false && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
                    <colgroup><col style={{width:"39%"}}/><col style={{width:"15%"}}/><col style={{width:"15%"}}/><col style={{width:"31%"}}/></colgroup>
                    <thead><tr className="bg-emerald-100 text-left text-emerald-950">
                      <th className="px-3 py-3">หัวข้อ WP / QA</th><th className="px-3 py-3">จำนวนประเมิน</th><th className="px-3 py-3">จำนวนปฏิบัติ</th><th className="px-3 py-3">สิ่งที่ไม่ได้ปฏิบัติ / หมายเหตุ</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-200">{section.items.map(item => {
                      const v = answers[item.id] || { assessed: "", performed: "", note: "" };
                      const isInvalid = v.assessed !== "" && v.performed !== "" && Number(v.performed) > Number(v.assessed);
                      const needsNote = v.assessed !== "" && v.performed !== "" && Number(v.performed) !== Number(v.assessed);
                      return <tr key={item.id} className="align-top hover:bg-emerald-50/30">
                        <td className="px-3 py-3 leading-6 text-slate-800"><span className="mr-2 font-semibold text-emerald-900">{item.number}</span>{item.label}</td>
                        <td className="px-3 py-3"><input aria-label={`จำนวนประเมิน ${item.number}`} inputMode="numeric" pattern="[0-9]*" value={v.assessed} onChange={e => setField(item.id,"assessed",e.target.value)} placeholder="กรอก > 0" className="w-full max-w-32 rounded-lg border border-slate-300 px-2 py-2 text-center outline-emerald-500" /></td>
                        <td className="px-3 py-3"><input aria-label={`จำนวนปฏิบัติ ${item.number}`} inputMode="numeric" pattern="[0-9]*" value={v.performed} onChange={e => setField(item.id,"performed",e.target.value)} placeholder="กรอก > 0" className={`w-full max-w-32 rounded-lg border px-2 py-2 text-center outline-emerald-500 ${isInvalid ? "border-rose-500 bg-rose-50" : "border-slate-300"}`} />{isInvalid && <p className="mt-1 text-xs text-rose-600">ต้องไม่เกินจำนวนประเมิน</p>}</td>
                        <td className="px-3 py-3">{needsNote ? <input aria-label={`สิ่งที่ไม่ได้ปฏิบัติหรือหมายเหตุ ${item.number}`} value={v.note} onChange={e => setField(item.id,"note",e.target.value)} placeholder="ระบุเหตุผล/สิ่งที่ไม่ได้ปฏิบัติ..." className="w-full rounded-lg border border-amber-300 px-2 py-2 outline-amber-400" /> : <span className="text-xs italic text-slate-400">- ครบถ้วน / ปกติ -</span>}</td>
                      </tr>;
                    })}</tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
          <label className="block text-sm font-bold text-slate-800">หมายเหตุภาพรวม<textarea value={generalNote} onChange={e => setGeneralNote(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" placeholder="ข้อเสนอแนะและแนวทางปรับปรุง" /></label>
          {preview && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
            <strong>สรุปการกรอก (ยังไม่บันทึก):</strong> กรอกครบ {stats.completed}/{stats.total} ข้อ · ปฏิบัติ {stats.performed} จากประเมิน {stats.assessed} · ร้อยละ {stats.percent === null ? "-" : stats.percent.toFixed(2)+"%"}
            {stats.invalid > 0 && <p className="font-semibold text-rose-600">มี {stats.invalid} ข้อที่จำนวนปฏิบัติมากกว่าจำนวนประเมิน โปรดแก้ไข</p>}
            <p className="mt-1 text-xs">การคำนวณรวมเป็นเพียงตัวอย่างสำหรับตรวจสอบหน้าฟอร์ม เกณฑ์การสรุปทางการต้องยืนยันก่อนใช้งานรายงานจริง</p>
          </div>}
        </div>
        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t bg-white p-3 sm:px-6">
          <span className="mr-auto text-xs text-slate-500">บันทึกลง nso_special_wp_records · pending</span>
          <button type="button" onClick={clear} className="rounded-lg border px-4 py-2 text-sm font-semibold">ล้าง</button>
          <button type="button" onClick={onClose} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold">ปิด</button>
          <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "กำลังบันทึก..." : "บันทึกข้อมูล WP/QA"}</button>
        </footer>
      </div>
    </div>, document.body
  );
}
