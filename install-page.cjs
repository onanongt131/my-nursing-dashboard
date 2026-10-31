// Run once at the project root: node install-page.cjs
const fs=require('fs');
const candidates=['src/app/(private)/dashboard/departments/[id]/page.tsx','src/app/dashboard/departments/[id]/page.tsx'];
const path=candidates.find(p=>fs.existsSync(p));if(!path)throw new Error('ไม่พบ page.tsx หน่วยงาน กรุณาอ่าน README_TH.md');
let s=fs.readFileSync(path,'utf8');
if(!s.includes('SpecialAuditApprovalPanel')){
 const marker='{activeModal === \'audit\' && (';
 if(!s.includes(marker)||!s.includes('const deptId'))throw new Error('โครงสร้างหน้าไม่ตรง ไม่ได้แก้ไฟล์ กรุณาแนบ page.tsx');
 fs.copyFileSync(path,path+'.before-audit-approval.bak');
 const directive=s.match(/(['"])use client\1;?/);if(!directive)throw new Error('ไม่พบ use client');
 const pos=directive.index+directive[0].length;
 s=s.slice(0,pos)+"\nimport SpecialAuditApprovalPanel from '@/components/SpecialAuditApprovalPanel';\n"+s.slice(pos);
 s=s.replace(marker,"<SpecialAuditApprovalPanel departmentId={deptId} />\n"+marker);
 fs.writeFileSync(path,s);
 console.log('เพิ่มรายการรออนุมัติแล้ว สำรอง page.tsx เดิมไว้แล้ว');
}else console.log('มี SpecialAuditApprovalPanel แล้ว ไม่ติดตั้งซ้ำ');
