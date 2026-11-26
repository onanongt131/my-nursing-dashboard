import 'server-only';
import {auth} from '@/auth';
import {createClient} from '@supabase/supabase-js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function dashboardProfile(record:any){
 if(!record||record.status!=='approved')return null;
 const department=Array.isArray(record.departments)?record.departments[0]:record.departments;
 const ids=[record.department_id,...(Array.isArray(record.extra_department_ids)?record.extra_department_ids:[])].map(Number).filter((n:number)=>Number.isSafeInteger(n)&&n>0);
 return {role:record.role,department_id:record.department_id,department_ids:[...new Set(ids)] as number[],full_name:record.full_name,group:department?.group??null};
}
// This server-only function derives the profile ID from NextAuth, never from a client input.
export async function dashboardContext(){
 const session=await auth();
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error('Missing server Supabase configuration');
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const id=session?.user?.id;
 const readProfile=async()=>{const first=await client.from('profiles').select('role,department_id,extra_department_ids,full_name,status,departments(group)').eq('id',id!).maybeSingle();
  // ยังไม่ได้เพิ่มคอลัมน์ extra_department_ids: อ่านแบบเดิม
  if(first.error&&/extra_department_ids/.test(String(first.error.message||'')))return client.from('profiles').select('role,department_id,full_name,status,departments(group)').eq('id',id!).maybeSingle();
  return first;};
 const profileTask=id&&UUID.test(id)?readProfile():Promise.resolve({data:null,error:null});
 const [profileResult,departmentResult]=await Promise.all([profileTask,client.from('departments').select('*').order('id')]);
 const profile=dashboardProfile(profileResult.data);
 // Return only navigation fields to the browser, even though the server uses a service client.
 const departments=(departmentResult.data||[]).map((d:any)=>({id:d.id,Department:d.Department,department_name:d.department_name,name:d.name,group:d.group,group_name:d.group_name}));
 return {session,profile,departments,profileUnavailable:!!session?.user&&(!profile||!!profileResult.error),departmentUnavailable:!!departmentResult.error};
}
