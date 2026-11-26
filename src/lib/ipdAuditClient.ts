export async function ipdAuditRequest(payload:Record<string,unknown>){
 const response=await fetch('/api/ipd-audit-records',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'บันทึกข้อมูลไม่สำเร็จ');return result;
}
