export const PRESSURE_LEVELS=['1','2','3','4','DTI','Unstage'] as const;
export type PressureSoreValues={hn:string;an:string;diagnosis:string;sex:string;age:string;admitted_date:string;admission_bs:string;admission_pressure_sore:string;wound_found_date:string;found_bs:string;wound_site:string;wound_level:string;discharge_status:string;transfer_department_id:string;wound_outcome:string};
export const emptyPressureSore:PressureSoreValues={hn:'',an:'',diagnosis:'',sex:'',age:'',admitted_date:'',admission_bs:'',admission_pressure_sore:'',wound_found_date:'',found_bs:'',wound_site:'',wound_level:'',discharge_status:'',transfer_department_id:'',wound_outcome:''};
export const pressureFields:[keyof PressureSoreValues,string][]=[['hn','HN'],['an','AN'],['diagnosis','โรค'],['sex','เพศ'],['age','อายุ (ปี)'],['admitted_date','วันที่รับไว้ดูแล'],['admission_bs','คะแนน BS แรกรับ'],['admission_pressure_sore','แผลกดทับแรกรับ'],['wound_found_date','วันที่พบแผลกดทับใหม่/แผลเดิมแย่ลง'],['found_bs','คะแนน BS วันที่พบแผล'],['wound_site','ตำแหน่งแผล'],['wound_level','ระดับแผล'],['discharge_status','สถานะการจำหน่าย'],['transfer_department_id','หน่วยงานที่รับย้าย'],['wound_outcome','แผลกดทับ']];
const dateOK=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
export function validatePressureSore(v:PressureSoreValues):{field:keyof PressureSoreValues;message:string}|null{
 for(const [field,label] of pressureFields){if(field==='discharge_status'||(field==='transfer_department_id'&&v.discharge_status!=='ย้าย'))continue;if(!String(v[field]??'').trim())return {field,message:`กรุณาระบุ${label}`};}
 for(const field of ['age','admission_bs','found_bs'] as const){if(!/^\d+$/.test(v[field])||!Number.isSafeInteger(Number(v[field])))return {field,message:'กรุณาระบุจำนวนเต็มตั้งแต่ 0 ขึ้นไป'};}
 for(const field of ['admitted_date','wound_found_date'] as const)if(!dateOK(v[field]))return {field,message:'กรุณาระบุวันที่ให้ถูกต้อง'};
 if(v.wound_found_date<v.admitted_date)return {field:'wound_found_date',message:'วันที่พบแผลต้องไม่ก่อนวันที่รับไว้ดูแล'};
 if(!['ชาย','หญิง','อื่นๆ/ไม่ระบุ'].includes(v.sex))return {field:'sex',message:'กรุณาเลือกเพศ'};
 if(!['มี','ไม่มี'].includes(v.admission_pressure_sore))return {field:'admission_pressure_sore',message:'กรุณาเลือกแผลกดทับแรกรับ'};
 if(!(PRESSURE_LEVELS as readonly string[]).includes(v.wound_level))return {field:'wound_level',message:'กรุณาเลือกระดับแผล'};
 if(!['','จำหน่าย','ย้าย'].includes(v.discharge_status))return {field:'discharge_status',message:'สถานะการจำหน่ายไม่ถูกต้อง'};
 if(v.discharge_status==='ย้าย'&&(!/^\d+$/.test(v.transfer_department_id)||Number(v.transfer_department_id)<1))return {field:'transfer_department_id',message:'กรุณาเลือกหน่วยงานรับย้าย'};
 if(!['หาย','ไม่หาย'].includes(v.wound_outcome))return {field:'wound_outcome',message:'กรุณาเลือกผลของแผลกดทับ'};
 for(const field of ['hn','an','diagnosis','wound_site'] as const)if(v[field].length>500)return {field,message:'ข้อความยาวเกิน 500 ตัวอักษร'};
 return null;
}
