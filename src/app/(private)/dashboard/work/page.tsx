/** หน้า "ระบบงาน": ใช้เมนูใน Sidebar ด้านซ้ายเพื่อเลือกหน้า */
export default function WorkPage() {
  return (
    <section className="flex min-h-[16rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-emerald-200 bg-white p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="m15 18-6-6 6-6" /></svg>
      </span>
      <p className="text-base font-semibold text-emerald-950">กรุณาเลือกเมนูที่ต้องการ</p>
      <p className="text-sm text-slate-500">เลือกจากรายการในเมนู &quot;ระบบงาน&quot;</p>
    </section>
  );
}
