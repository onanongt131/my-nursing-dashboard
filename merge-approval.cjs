const fs=require('fs');
const path=['src/app/(private)/dashboard/departments/[id]/page.tsx','src/app/dashboard/departments/[id]/page.tsx'].find(p=>fs.existsSync(p));
if(!path)throw new Error('ไม่พบ page.tsx หน่วยงาน');
let s=fs.readFileSync(path,'utf8');
if(s.includes('specialAuditCounts')){console.log('รวมรายการไว้แล้ว');process.exit(0);}
function required(a,b){if(!s.includes(a))throw new Error('โครงสร้างหน้าไม่ตรง กรุณาส่ง page.tsx (ยังไม่บันทึกการแก้ไข)');s=s.replace(a,b);}
s=s.replace(/<SpecialAuditApprovalPanel\s+departmentId=\{deptId\}\s*\/>/g,'');
if(!s.includes("import SpecialAuditApprovalPanel")){
 const directive=s.match(/(['"])use client\1;?/);if(!directive)throw new Error('ไม่พบ use client');
 const p=directive.index+directive[0].length;s=s.slice(0,p)+"\nimport SpecialAuditApprovalPanel from '@/components/SpecialAuditApprovalPanel';\n"+s.slice(p);
}
required("const [allPendingRows, setAllPendingRows] = useState<any[]>([]);","const [allPendingRows, setAllPendingRows] = useState<any[]>([]);\n  const [specialAuditCounts, setSpecialAuditCounts] = useState({pending:0,total:0});");
required('const totalPendingCount = allPendingRows.reduce((sum, batch: any) => sum + (batch.items?.length || 0), 0);','const totalPendingCount = allPendingRows.reduce((sum, batch: any) => sum + (batch.items?.length || 0), 0) + specialAuditCounts.pending;');
required('{showPendingTable && totalPendingCount > 0 && (','{(');
required('<div className="border rounded-2xl p-4 space-y-3 bg-red-50/80 border-red-200 shadow-sm print:hidden">','<div hidden={!showPendingTable} className="border rounded-2xl p-4 space-y-3 bg-red-50/80 border-red-200 shadow-sm print:hidden">');
const start=s.indexOf('<span>รายการรอการตรวจสอบและอนุมัติ</span>');
const end=s.indexOf('</tbody>',start);if(start<0||end<0)throw new Error('ไม่พบตารางเดิม');
s=s.slice(0,end)+'<SpecialAuditApprovalPanel departmentId={deptId} onCountsChange={setSpecialAuditCounts} />\n'+s.slice(end);
s=s.replace(/totalPendingCount > 0/g,'(totalPendingCount > 0 || specialAuditCounts.total > 0)');
s=s.replace('disabled={totalPendingCount === 0}','disabled={totalPendingCount === 0 && specialAuditCounts.total === 0}');
fs.copyFileSync(path,path+'.before-approval-merge.bak');fs.writeFileSync(path,s);
console.log('รวม Audit ห้องคลอดไว้ในตารางด้านบนและรวมจำนวนในปุ่มรออนุมัติแล้ว');
