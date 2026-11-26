import {isRecord,validDate} from '@/lib/audits/chartServer';
import {wpItemsForWard} from '@/lib/wpIpdCriteria';
export class AuditInputError extends Error {}
const bad=(message:string):never=>{throw new AuditInputError(message);};
const clean=(value:unknown,max=2000)=>{if(value==null||value==='')return null;if(typeof value!=='string'||value.length>max)return bad('ข้อความยาวเกินกำหนดหรือรูปแบบผิด');return value.trim()||null;};
export const scoreSections=[['s1_1_1','s1_1_2','s1_1_3','s1_1_4','s1_1_5','s1_1_6','s1_2_1','s1_2_2','s1_2_3','s1_2_4','s1_2_5','s1_3_1','s1_4_1','s1_4_2'],['s2_1_a','s2_1_p','s2_1_i','s2_1_e','s2_1_name','s2_2_a','s2_2_p','s2_2_i','s2_2_e','s2_2_name','s2_3_a','s2_3_p','s2_3_i','s2_3_e','s2_3_name','s2_4_a','s2_4_p','s2_4_i','s2_4_e','s2_4_name'],['s3_a','s3_p','s3_i','s3_e','s3_name'],['s4_1','s4_2','s4_3','s4_4','s4_5','s4_6'],['s5_1']];
export function wpRows(b:Record<string,any>,departmentId:number,departmentName:string){
 const wpQaItems=wpItemsForWard(departmentName);
 if(typeof b.audit_month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(b.audit_month))return bad('เดือนประเมินไม่ถูกต้อง');
 if(!Array.isArray(b.rows)||b.rows.length!==wpQaItems.length)return bad('กรุณากรอกผลประเมินครบทุกหัวข้อ');
 const seen=new Set<string>(),rows=new Map<string,any>();
 for(const row of b.rows){if(!isRecord(row)||typeof row.wp_id!=='string'||seen.has(row.wp_id)||!wpQaItems.some(item=>item.id===row.wp_id))return bad('หัวข้อประเมินซ้ำหรือไม่ถูกต้อง');seen.add(row.wp_id);rows.set(row.wp_id,row);}
 const auditor=clean(b.auditor_name,200);
 return wpQaItems.map(item=>{const row=rows.get(item.id),a=row.total_evaluated,p=row.total_practiced;
 if(!Number.isSafeInteger(a)||a<1||a>1000000||!Number.isSafeInteger(p)||p<0||p>a)return bad('จำนวนปฏิบัติต้องอยู่ระหว่าง 0 ถึงจำนวนประเมิน และจำนวนประเมินต้องมากกว่า 0');
 const note=clean(row.unpracticed_reasons);if(p<a&&!note)return bad('กรุณาระบุเหตุผลของข้อที่ไม่ได้ปฏิบัติครบ');
 return {department_id:departmentId,audit_month:b.audit_month,wp_id:item.id,wp_name:item.name,total_evaluated:a,total_practiced:p,unpracticed_reasons:p<a?note:null,auditor_name:auditor,status:'pending'};});
}
export function chartPayload(value:unknown,departmentId:number){
 if(!isRecord(value))return bad('แบบประเมินไม่ถูกต้อง');const b=value;if(!validDate(b.audit_date))return bad('วันที่ประเมินไม่ถูกต้อง');
 const payload:Record<string,unknown>={department_id:departmentId,audit_date:b.audit_date,audit_month:String(b.audit_date).slice(0,7),patient_hn:clean(b.patient_hn,80),disease:clean(b.disease,2000),auditor_name:clean(b.auditor_name,200),notes:clean(b.notes,10000),status:'pending'};
 scoreSections.forEach((keys,i)=>{const notes:string[]=[];for(const key of keys){const score=b[key]==null||b[key]===''?null:String(b[key]).toUpperCase();if(score!==null&&!['1','2','3','4','NA'].includes(score))return bad('คะแนนต้องเป็น 1–4 หรือ NA');payload[key]=score;const note=clean(b[key+'_note']);if(score&&score!=='NA'&&Number(score)<4&&!note)return bad('กรุณาระบุข้อบกพร่องสำหรับคะแนนน้อยกว่า 4');if(note)notes.push(key+': '+note);}payload['s'+(i+1)+'_notes']=notes.join('\n')||null;});
 return payload;
}
