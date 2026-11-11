import {createHash} from 'node:crypto';
import {reportHtmlResponse} from '@/lib/p4p/reportResponse';
import {claimDate} from '@/lib/p4p/legacy';
import {NextRequest} from 'next/server';
import {loadContext,requirePerson,apiError,P4PError} from '@/lib/p4p/server';
import {filterReport} from '@/lib/p4p/engine';
import {submissionOutput} from '@/lib/p4p/legacy';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function GET(request:NextRequest){try{const q=request.nextUrl.searchParams,group=q.get('group')||'RN',guarantee=q.get('guarantee')??({RN:1200,PN:720,NA_EMP:600}[group]||1200),c=await loadContext(q.get('department_id'),q.get('month'),guarantee),person=q.get('person')||'',kind=q.get('kind')||'all';if(!['RN','PN','NA_EMP'].includes(group)||!['all','daily','personal','summary'].includes(kind))throw new P4PError('ประเภทรายงานไม่ถูกต้อง');if(person){const p=requirePerson(c,person),expected=p.group==='PN'?'PN':['NA','EMP'].includes(p.group)?'NA_EMP':'RN';if(group!==expected)throw new P4PError('กลุ่มแบบฟอร์มไม่ตรงกับตำแหน่งบุคลากร');}else if(!c.manager)throw new P4PError('เลือกดูได้เฉพาะรายงานตนเอง',403);
 const contextTag=createHash('sha256').update(JSON.stringify([c.sourceRevision,c.documents.map(d=>[d.person_name,d.kind,d.version]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))])).digest('hex');
 if(q.get('context')&&q.get('context')!==contextTag)throw new P4PError('ข้อมูลเปลี่ยนระหว่างจัดทำรายงาน กรุณาออกรายงานใหม่',409);
 const report=filterReport(c.report,group,person);report.kind=person&&kind==='summary'?'personal':kind;report.managerReport=q.get('head')==='1'||q.get('omitDaily')==='1';
 report.skipHeadMatrices=q.get('skipHeads')==='1';
 const day=q.get('day');if(day){if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||day.slice(0,7)!==c.month||Number(day.slice(-2))<1||Number(day.slice(-2))>new Date(Number(c.month.slice(0,4)),Number(c.month.slice(5,7)),0).getDate())throw new P4PError('วันที่รายงานไม่ถูกต้อง');const match=(r:any)=>claimDate(r.date,r.shift)===day;report.blocks=report.blocks.filter(match);report.assignments=Object.fromEntries(Object.entries(report.assignments).filter(([,r])=>match(r)));report.statistics=report.statistics.filter(match);report.procedures=report.procedures.filter(match);}
 const output={...submissionOutput(report,c.source.ward),contextTag};
 if(q.get('format')==='xlsx'){const XLSX=await import('xlsx'),wb=XLSX.utils.book_new();output.sheets.forEach((s:any)=>{const ws=XLSX.utils.aoa_to_sheet(s.rows);ws['!cols']=s.widths.map((wch:number)=>({wch}));if(s.merges)ws['!merges']=s.merges;XLSX.utils.book_append_sheet(wb,ws,s.name);});const buffer=XLSX.write(wb,{type:'buffer',bookType:'xlsx',compression:true});return new Response(new Uint8Array(buffer),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename=P4P_${group}_${c.month}.xlsx`,'Cache-Control':'no-store'}});}
 if(q.get('format')==='html')return reportHtmlResponse(output.html,request.headers.get('accept-encoding'));if(Buffer.byteLength(JSON.stringify(output))>3800000)throw new P4PError('รายงานมีขนาดใหญ่ กรุณาแยกรายวันหรือใช้ Excel',413);return Response.json(output,{headers:{'Cache-Control':'no-store'}});
 }catch(e){return apiError(e);}}
