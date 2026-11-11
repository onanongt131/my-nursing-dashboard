export type RecordTable={name:string;key:string};
export async function readDepartmentRecords(table:string,departmentId:string|number,pending=false){
 const items:any[]=[];for(let offset=0;;offset+=1000){const q=new URLSearchParams({table,department_id:String(departmentId),offset:String(offset)});if(pending)q.set('pending','true');const r=await fetch('/api/department-records?'+q,{cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(d.error||'อ่านรายการไม่สำเร็จ');if(!Array.isArray(d.items))throw new Error('รูปแบบข้อมูลรายการไม่ถูกต้อง');items.push(...d.items);if(!d.hasMore)return items;}
}
export async function loadRecordTables(tables:readonly RecordTable[],load:(table:string)=>Promise<any[]>){
 return Promise.all(tables.map(async t=>{try{return{...t,items:await load(t.name),error:''};}catch(e){return{...t,items:null,error:e instanceof Error?e.message:'อ่านรายการไม่สำเร็จ'};}}));
}
