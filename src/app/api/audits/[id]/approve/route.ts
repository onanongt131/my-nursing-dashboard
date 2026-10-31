import { NextRequest, NextResponse } from 'next/server';
import { canApprove, currentUser, db, fail, unexpected, validId } from '@/lib/audits/chartServer';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
// Review approval only. Does not certify numerical KPI/score until an approved rubric is implemented.
export async function POST(_request: NextRequest, context: Context) {
  try {
    const user = await currentUser(); if (!user) return fail('กรุณาเข้าสู่ระบบ', 401);
    const { id } = await context.params; if (!validId(id)) return fail('ID ไม่ถูกต้อง');
    const { data: item, error } = await db().from('nso_special_audits')
      .select('id,department_id,status,created_by').eq('id', id).maybeSingle();
    if (error) return unexpected(error);
    if (!item) return fail('ไม่พบรายการ', 404);
    if (!canApprove(user, item.department_id)) return fail('ไม่มีสิทธิ์อนุมัติ', 403);
    if (item.created_by === user.id) return fail('ไม่สามารถอนุมัติรายการของตนเอง', 403);
    if (item.status !== 'pending') return fail('อนุมัติได้เฉพาะรายการรอตรวจสอบ', 409);
    const { data, error: updateError } = await db().from('nso_special_audits')
      .update({ status: 'approved', approved_by: user.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id).eq('status', 'pending').select('id,status,approved_by,approved_at').maybeSingle();
    if (updateError) return unexpected(updateError);
    if (!data) return fail('สถานะถูกเปลี่ยนแล้ว กรุณาโหลดใหม่', 409);
    return NextResponse.json({ item: data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return unexpected(e); }
}
