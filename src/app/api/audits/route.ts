import { NextRequest, NextResponse } from 'next/server';
import { AUDIT_COLUMNS, canApprove, canCreate, canRead, cleanText, currentUser, db, fail, isRecord, safeAnswers, unexpected, validDate, validDept, validForm, validateLRSubmission, validateSpecialUnitAnswers } from '@/lib/audits/chartServer';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/audits?department_id=40&status=pending&limit=50
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return fail('กรุณาเข้าสู่ระบบ', 401);
    const q = request.nextUrl.searchParams;
    const deptText = q.get('department_id');
    const dept = deptText ? Number(deptText) : null;
    if (deptText && !validDept(dept)) return fail('รหัสหน่วยงานไม่ถูกต้อง');
    if (dept && !(await canRead(user, dept))) return fail('ไม่มีสิทธิ์ดูข้อมูลหน่วยงานนี้', 403);
    if (!dept && !['head_nurse', 'admin'].includes(user.role)) {
      // Restrict non-org users to a single explicit department. This avoids cross-unit disclosure.
      return fail('กรุณาระบุ department_id ที่ได้รับสิทธิ์', 400);
    }
    const status = q.get('status');
    if (status && !['draft','pending','approved','rejected'].includes(status)) return fail('สถานะไม่ถูกต้อง');
    const limit = Math.min(Math.max(Number(q.get('limit') || 50) || 50, 1), 100);
    let query = db().from('nso_special_audits').select(AUDIT_COLUMNS).order('created_at', { ascending: false }).limit(limit);
    if (dept) query = query.eq('department_id', dept);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) return unexpected(error);
    return NextResponse.json({ items: data ?? [], can_approve: dept ? canApprove(user, dept) : false, user_id: user.id }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return unexpected(e); }
}

// POST creates draft. Score totals must be calculated on server after approved criteria are registered.
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return fail('กรุณาเข้าสู่ระบบ', 401);
    const body: unknown = await request.json().catch(() => null);
    if (!isRecord(body)) return fail('ข้อมูลไม่ถูกต้อง');
    const departmentId = body.department_id;
    if (!validDept(departmentId) || !validForm(body.form_type) || !validDate(body.audit_date) || !safeAnswers(body.answers)) return fail('รูปแบบข้อมูล Audit ไม่ถูกต้อง');
    if (body.form_type === 'lr') {
      const issue = validateLRSubmission(body.answers as Record<string, unknown>);
      if (issue) return fail(issue);
    }
    if (['dialysis','er','anesthesia','hbot'].includes(body.form_type)){const issue=validateSpecialUnitAnswers(body.form_type,body.answers as Record<string,unknown>,true);if(issue)return fail(issue);}
    if (!canCreate(user, departmentId)) return fail('ไม่มีสิทธิ์บันทึกหน่วยงานนี้', 403);
    // Confirm department exists. Do not trust department ID supplied by client.
    const { data: dept, error: de } = await db().from('departments').select('id').eq('id', departmentId).maybeSingle();
    if (de || !dept) return fail('ไม่พบหน่วยงาน', 400);
    const payload = {
      department_id: departmentId, form_type: body.form_type,
      form_version: cleanText(body.form_version, 32) ?? '1.0', audit_date: body.audit_date,
      audit_month: String(body.audit_date).slice(0, 7), reference_number: cleanText(body.reference_number, 100),
      auditor_name: cleanText(body.auditor_name, 200), answers: body.answers,
      notes: cleanText(body.notes, 3000), status: ['lr','dialysis','er','anesthesia','hbot'].includes(body.form_type) ? 'pending' : 'draft', created_by: user.id,
      // Scores deliberately NOT accepted from browser.
    };
    const { data, error } = await db().from('nso_special_audits').insert(payload).select(AUDIT_COLUMNS).single();
    if (error) return unexpected(error);
    return NextResponse.json({ item: data }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return unexpected(e); }
}
