import 'server-only';
import { db } from '@/lib/audits/chartServer';
import { isDialysis } from './dialysisStats';

export async function isDialysisDepartment(id: number) {
  const { data, error } = await db().from('departments').select('Department').eq('id', id).maybeSingle();
  if (error) throw error;
  return isDialysis(data?.Department);
}
