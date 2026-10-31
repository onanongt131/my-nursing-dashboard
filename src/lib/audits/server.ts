import 'server-only';
import { auth } from '@/auth';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export type AuditRole = 'staff' | 'head_department' | 'head_group' | 'head_nurse' | 'admin';
export type AuditUser = { id: string; role: AuditRole; departmentId: number | null; group: string | null };
export const FORM_TYPES = ['er', 'lr', 'or', 'dialysis', 'hbot', 'anesthesia', 'opd'] as const;
export type FormType = typeof FORM_TYPES[number];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Only instantiate server-side; this key bypasses RLS. Every endpoint must check authorization.
export function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing server Supabase configuration');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
export function unexpected(error: unknown) {
  // Never log patient identifiers or submitted answer content.
  console.error('Audit API failure', error instanceof Error ? error.name : 'unknown');
  return fail('ไม่สามารถดำเนินการได้ กรุณาติดต่อผู้ดูแลระบบ', 500);
}
export async function currentUser(): Promise<AuditUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id || !UUID.test(id)) return null;
  const { data: p, error } = await db().from('profiles')
    .select('id, role, department_id, status, departments(group)')
    .eq('id', id).maybeSingle();
  if (error || !p || p.status !== 'approved') return null;
  const roles: AuditRole[] = ['staff', 'head_department', 'head_group', 'head_nurse', 'admin'];
  if (!roles.includes(p.role as AuditRole)) return null;
  const d = p.departments as unknown as { group?: string | null } | null;
  return { id: p.id, role: p.role as AuditRole, departmentId: p.department_id, group: d?.group ?? null };
}
export async function canRead(user: AuditUser, departmentId: number) {
  if (user.role === 'admin' || user.role === 'head_nurse') return true;
  if (user.departmentId === departmentId) return true;
  if (user.role !== 'head_group' || !user.group) return false;
  const { data, error } = await db().from('departments').select('id').eq('id', departmentId).eq('group', user.group).maybeSingle();
  if (error) return false;
  return !!data;
}
export function canCreate(user: AuditUser, departmentId: number) {
  return user.role === 'admin' || user.role === 'head_nurse' || user.departmentId === departmentId;
}
export function canApprove(user: AuditUser, departmentId: number) {
  return user.role === 'admin' || user.role === 'head_nurse' || (user.role === 'head_department' && user.departmentId === departmentId);
}
export function validId(id: string) { return UUID.test(id); }
export function validDept(n: unknown): n is number { return typeof n === 'number' && Number.isSafeInteger(n) && n > 0; }
export function validForm(n: unknown): n is FormType { return typeof n === 'string' && FORM_TYPES.includes(n as FormType); }
export function isRecord(v: unknown): v is Record<string, unknown> { return !!v && typeof v === 'object' && !Array.isArray(v); }
export function validDate(v: unknown) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)); }
export function cleanText(v: unknown, max = 500): string | null { return typeof v === 'string' ? v.trim().slice(0, max) || null : null; }
export function safeAnswers(v: unknown): v is Record<string, unknown> {
  if (!isRecord(v) || JSON.stringify(v).length > 60000 || Object.keys(v).length > 250) return false;
  return Object.entries(v).every(([key, value]) => /^[a-zA-Z0-9_.-]{1,80}$/.test(key) && (
    value === null || typeof value === 'number' && Number.isFinite(value) || typeof value === 'string' && value.length <= 2000 ||
    isRecord(value) && Object.keys(value).every(k => ['score', 'note', 'na'].includes(k)) &&
    (value.score === undefined || value.score === null || typeof value.score === 'number' && Number.isFinite(value.score)) &&
    (value.note === undefined || typeof value.note === 'string' && value.note.length <= 2000) &&
    (value.na === undefined || typeof value.na === 'boolean')
  ));
}
export const AUDIT_COLUMNS = 'id,department_id,form_type,form_version,audit_date,audit_month,reference_number,auditor_name,answers,total_score,max_score,percentage,notes,status,created_by,created_at,updated_at,approved_by,approved_at';
