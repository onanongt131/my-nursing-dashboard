// Presentation scope for the Re-admit / AMA reports only. No department data is deleted.
export type ReportDepartment={id?:string|number;Department?:string|null;name?:string|null;group?:string|null;group_name?:string|null};
const compact=(value:unknown)=>String(value??'').normalize('NFC').replace(/[\s\u200B-\u200D\uFEFF]+/g,'').replace(/^หอผู้ป่วย/,'');
const excludedNames=new Set([
 'พิเศษอายุรกรรมชั้น4','พิเศษอายุรกรรมชั้น5','พิเศษอายุรกรรม4','พิเศษอายุรกรรม5',
 'ศูนย์ใจรักษ์','ศูนย์ดูแลบาดแผล','อายุรกรรมหญิง','อายุรกรรมชาย1',
]);
const collator=new Intl.Collator('th',{numeric:true,sensitivity:'base'});
export const reportDepartmentName=(d:ReportDepartment)=>String(d.Department||d.name||'').normalize('NFC').trim();
export function includeReadmitAmaDepartment(d:ReportDepartment){
 const name=reportDepartmentName(d),key=compact(name),group=String(d.group||d.group_name||'').normalize('NFC').trim();
 if(/OPD/i.test(name)||key.includes('ผู้ป่วยนอก')||/OPD|ผู้ป่วยนอก/i.test(group))return false;
 if(key.includes('ฝ่ายการพยาบาล')||key==='กลุ่มภารกิจด้านการพยาบาล'||key.includes('เวชศาสตร์ใต้น้ำ')||excludedNames.has(key))return false;
 const groupU=/^(?:กลุ่ม(?:งาน)?\s*|GROUP\s*)?U(?:$|[\s:–—()\-])/iu.test(group);
 const iccu=/(^|[^A-Za-z])ICCU([^A-Za-z]|$)/i.test(name);
 return !groupU||iccu;
}
export function readmitAmaDepartments<T extends ReportDepartment>(departments:T[]):T[]{
 return departments.filter(includeReadmitAmaDepartment).sort((a,b)=>collator.compare(reportDepartmentName(a),reportDepartmentName(b))||String(a.id??'').localeCompare(String(b.id??''),'en',{numeric:true}));
}
