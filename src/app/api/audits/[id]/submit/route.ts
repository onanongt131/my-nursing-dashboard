import { NextRequest, NextResponse } from 'next/server';
import { canCreate, currentUser, db, fail, unexpected, validId, safeAnswers, validateLRSubmission, validateSpecialUnitAnswers } from '@/lib/audits/chartServer';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
export async function POST(_request: NextRequest, context: Context) {
  try {
    const user = await currentUser(); if (!user) return fail('กรุณาเข้าสู่ระบบ', 401);
    const { id } = await context.params; if (!validId(id)) return fail('ID ไม่ถูกต้อง');
    const { data: item, error } = await db().from('nso_special_audits')
      .select('id,department_id,status,created_by,answers,form_type').eq('id', id).maybeSingle();
    if (error) return unexpected(error);
    if (!item) return fail('ไม่พบรายการ', 404);
    if (!canCreate(user, item.department_id) || (item.created_by !== user.id && !['admin','head_nurse'].includes(user.role))) return fail('ไม่มีสิทธิ์ส่งรายการนี้',403);
    if (item.status !== 'draft') return fail('ส่งได้เฉพาะฉบับร่าง',409);
    if (!['lr','dialysis','er','anesthesia','hbot'].includes(item.form_type)) return fail('ประเภทแบบประเมินไม่รองรับ',400);
    if (!safeAnswers(item.answers)) return fail('รูปแบบคำตอบไม่ถูกต้อง');
    const issue=item.form_type==='lr'?validateLRSubmission(item.answers):validateSpecialUnitAnswers(item.form_type,item.answers,true); if (issue) return fail(issue);
    const { data, error: updateError } = await db().from('nso_special_audits')
      .update({status:'pending',updated_at:new Date().toISOString()})
      .eq('id',id).eq('status','draft').select('id,status').maybeSingle();
    if (updateError) return unexpected(updateError);
    if (!data) return fail('สถานะเปลี่ยนแล้ว กรุณาโหลดใหม่',409);
    return NextResponse.json({item:data},{headers:{'Cache-Control':'no-store'}});
  } catch(e) { return unexpected(e); }
}
