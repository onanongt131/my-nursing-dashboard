import {NextRequest} from 'next/server';
import {db} from '@/lib/audits/chartServer';
import {normalizeName} from '@/lib/p4p/engine';
import {loadContext,requirePerson,apiError} from '@/lib/p4p/server';
import {documentOf,headAuto,headData} from '@/lib/p4p/engine';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){try{const q=request.nextUrl.searchParams,c=await loadContext(q.get('department_id'),q.get('month'),q.get('guarantee')??undefined),name=q.get('person')||'';requirePerson(c,name);const p=c.report.staff.find((p:any)=>p.name===name);const samples:any={},history=await db().from('p4p_documents').select('kind,data').eq('department_id',c.departmentId).eq('person_name',name).in('kind',['staff_signature','supervisor_signature']).order('updated_at',{ascending:false}).limit(20);for(const role of ['staff','supervisor']){const match=(d:any)=>role!=='supervisor'||normalizeName(d?.signerName)===normalizeName(c.source.supervisorName),current=documentOf(c.documents,name,role+'_signature'),prior=history.data?.find((d:any)=>d.kind===role+'_signature'&&match(d.data)),old=c.source.legacySignatureSamples.filter((r:any)=>r.personName===name&&r.role===role&&match(r)).pop();if(current&&match(current.data))samples[role]=current.data;else if(prior)samples[role]=prior.data;else if(old)samples[role]=old;}
 return Response.json({person:p,head:c.manager?headData(c.source,c.documents,name):null,auto:c.manager?headAuto(c.source,name,c.documents):null,samples,versions:Object.fromEntries(['claims','head','staff_signature','supervisor_signature'].map(k=>[k,documentOf(c.documents,name,k)?.version||0]))},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return apiError(e);}}
