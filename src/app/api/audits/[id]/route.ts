import { NextRequest, NextResponse } from 'next/server';
import { AUDIT_COLUMNS, canCreate, canRead, cleanText, currentUser, db, fail, isRecord, safeAnswers, unexpected, validDate, validId, validateLRDraft, validateSpecialUnitAnswers } from '@/lib/audits/chartServer';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  try {
    const user = await currentUser(); if (!user) return fail('กรุณาเข้าสู่ระบบ', 401);
    const { id } = await context.params; if (!validId(id)) return fail('ID ไม่ถูกต้อง');
    const { data, error } = await db().from('nso_special_audits').select(AUDIT_COLUMNS).eq('id', id).maybeSingle();
    if (error) return unexpected(error);
    if (!data) return fail('ไม่พบรายการ', 404);
    if (!(await canRead(user, data.department_id))) return fail('ไม่มีสิทธิ์', 403);
    return NextResponse.json({ item: data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return unexpected(e); }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const user = await currentUser(); if (!user) return fail('กรุณาเข้าสู่ระบบ', 401);
    const { id } = await context.params; if (!validId(id)) return fail('ID ไม่ถูกต้อง');
    const { data: existing, error: readError } = await db().from('nso_special_audits').select('id,department_id,created_by,status,form_type').eq('id', id).maybeSingle();
    if (readError) return unexpected(readError);
    if (!existing) return fail('ไม่พบรายการ', 404);
    if (!canCreate(user, existing.department_id)) return fail('ไม่มีสิทธิ์แก้ไขข้อมูลหน่วยงานนี้', 403);
    if (existing.status !== 'draft') return fail('แก้ไขได้เฉพาะรายการร่าง', 409);
    if (existing.created_by !== user.id && !['admin','head_nurse'].includes(user.role)) return fail('ไม่มีสิทธิ์แก้ไข', 403);
    const body: unknown = await request.json().catch(() => null);
    if (!isRecord(body) || !safeAnswers(body.answers)) return fail('answers ไม่ถูกต้อง');
    if (existing.form_type === 'lr') {
      const issue = validateLRDraft(body.answers as Record<string, unknown>);
      if (issue) return fail(issue);
    }
    if(['dialysis','er','anesthesia','hbot'].includes(existing.form_type)){const issue=validateSpecialUnitAnswers(existing.form_type,body.answers as Record<string,unknown>);if(issue)return fail(issue);}
    if (body.audit_date !== undefined && !validDate(body.audit_date)) return fail('วันที่ไม่ถูกต้อง');
    const changes: Record<string, unknown> = { answers: body.answers, updated_at: new Date().toISOString() };
    if (body.audit_date) { changes.audit_date = body.audit_date; changes.audit_month = String(body.audit_date).slice(0, 7); }
    if (body.notes !== undefined) changes.notes = cleanText(body.notes, 3000);
    if (body.reference_number !== undefined) changes.reference_number = cleanText(body.reference_number, 100);
    if (body.auditor_name !== undefined) changes.auditor_name = cleanText(body.auditor_name, 200);
    const { data, error } = await db().from('nso_special_audits').update(changes)
      .eq('id', id).eq('status', 'draft').select(AUDIT_COLUMNS).maybeSingle();
    if (error) return unexpected(error);
    if (!data) return fail('รายการเปลี่ยนสถานะแล้ว กรุณาโหลดใหม่', 409);
    return NextResponse.json({ item: data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return unexpected(e); }
}
