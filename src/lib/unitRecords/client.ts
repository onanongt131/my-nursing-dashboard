export async function saveUnitRecord(action:string,payload:Record<string,unknown>){
 const response=await fetch('/api/unit-records',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,action})});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'บันทึกข้อมูลไม่สำเร็จ');return result;
}

export async function loadUnitMonthly(kind:'fall'|'ama'|'readmit',departmentId:string|number,month:string,signal?:AbortSignal){
 const response=await fetch('/api/unit-records?'+new URLSearchParams({kind,department_id:String(departmentId),month}),{cache:'no-store',signal});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'อ่านสถิติรายเดือนไม่สำเร็จ');return result;
}
