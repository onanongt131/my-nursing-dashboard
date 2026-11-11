import {NextResponse} from 'next/server';
import {currentUser,fail,unexpected} from '@/lib/audits/chartServer';
export async function GET(){try{const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบ',401);return NextResponse.json({id:user.id,role:user.role,department_id:user.departmentId},{headers:{'Cache-Control':'no-store'}});}catch(e){return unexpected(e);}}
