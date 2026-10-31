import { NextRequest, NextResponse } from "next/server";
import { canCreate, currentUser, db } from "@/lib/audits/server";
import { wpSpecialCriteria, type WpFormType } from "@/lib/wpSpecialCriteria";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const formTypes = ["or", "opd", "er", "anesthesia", "lr"] as const;
const clean = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return error("กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับอนุญาต", 401);
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return error("ข้อมูลไม่ถูกต้อง");
    const b = body as Record<string, unknown>;
    const dept = b.department_id;
    if (typeof dept !== "number" || !Number.isSafeInteger(dept) || dept <= 0) return error("รหัสหน่วยงานไม่ถูกต้อง");
    if (!canCreate(user, dept)) return error("ไม่มีสิทธิ์บันทึกข้อมูลหน่วยงานนี้", 403);
    if (typeof b.form_type !== "string" || !formTypes.includes(b.form_type as WpFormType)) return error("ประเภทแบบฟอร์มไม่ถูกต้อง");
    const type = b.form_type as WpFormType;
    const month = b.audit_month;
    if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return error("เดือนประเมินไม่ถูกต้อง");
    const auditor = clean(b.auditor_name, 200);
    if (!auditor) return error("กรุณาระบุชื่อผู้ประเมิน");
    const answers = b.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers) || JSON.stringify(answers).length > 60000) return error("รายการผลประเมินไม่ถูกต้อง");
    const rows = answers as Record<string, unknown>;
    const items = wpSpecialCriteria[type].flatMap(s => s.items);
    if (Object.keys(rows).length !== items.length || items.some(item => !Object.prototype.hasOwnProperty.call(rows, item.id))) return error("จำนวนข้อประเมินไม่ครบหรือไม่ตรงเกณฑ์");
    const verified: Record<string, { total_evaluated: number; total_practiced: number; unpracticed_reasons: string | null }> = {};
    for (const item of items) {
      const raw = rows[item.id];
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return error(`ข้อมูลข้อ ${item.number} ไม่ถูกต้อง`);
      const v = raw as Record<string, unknown>;
      const a = v.total_evaluated, p = v.total_practiced;
      if (typeof a !== "number" || !Number.isSafeInteger(a) || a < 1) return error(`ข้อ ${item.number}: จำนวนประเมินต้องมากกว่า 0`);
      if (typeof p !== "number" || !Number.isSafeInteger(p) || p < 0 || p > a) return error(`ข้อ ${item.number}: จำนวนปฏิบัติไม่ถูกต้อง`);
      if (typeof v.unpracticed_reasons === "string" && v.unpracticed_reasons.length > 2000) return error(`ข้อ ${item.number}: หมายเหตุยาวเกินกำหนด`);
      const note = clean(v.unpracticed_reasons, 2000);
      if (p < a && !note) return error(`ข้อ ${item.number}: ต้องระบุเหตุผลที่ไม่ได้ปฏิบัติ`);
      verified[item.id] = { total_evaluated: a, total_practiced: p, unpracticed_reasons: p < a ? note : null };
    }
    const { data: department, error: deptError } = await db().from("departments").select("id").eq("id", dept).maybeSingle();
    if (deptError || !department) return error("ไม่พบหน่วยงาน");
    // The special-unit WP records table stores one monthly form as one row (answers JSONB).
    const { data, error: insertError } = await db().from("nso_special_wp_records").insert({
      department_id: dept, form_type: type, form_version: "1.0", audit_month: month,
      reference_number: clean(b.reference_number, 100) || null,
      auditor_name: auditor,
      answers: { ...verified, ...(clean(b.general_note, 2000) ? { _general_note: clean(b.general_note, 2000) } : {}) },
      status: "pending", created_by: user.id,
    }).select("id,status,department_id,form_type,audit_month").single();
    if (insertError) {
      console.error("Special WP insert error", insertError.code);
      return error("บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าฐานข้อมูล", 500);
    }
    return NextResponse.json({ item: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("Special WP API error", e instanceof Error ? e.name : "unknown");
    return error("เกิดข้อผิดพลาดภายในระบบ", 500);
  }
}
