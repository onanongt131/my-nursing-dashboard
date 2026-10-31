# WP/QA เฉพาะหน่วยงาน พร้อมบันทึกจริง

ติดตั้งจาก ZIP โดยคัดลอกไฟล์ `src/` ทั้งหมดเข้าตำแหน่งเดียวกันในโปรเจกต์ `nursing-dashboard-recovered` (สำรองของเดิมก่อน)

- `src/components/WpSpecialAuditModal.tsx` ฟอร์ม OR/OPD/ER/วิสัญญี/ห้องคลอด จำนวนประเมิน > 0, จำนวนปฏิบัติ 0..จำนวนประเมิน, หมายเหตุบังคับเมื่อทำไม่ครบ, ปุ่มบันทึกจริง
- `src/components/UnitWpQaModal.tsx` เลือกฟอร์มตามหน่วยงาน และส่ง departmentId/onSuccess
- `src/lib/wpSpecialCriteria.ts` เกณฑ์ทั้ง 5 หน่วยงานจากเอกสาร
- `src/app/api/wp-special/route.ts` API ตรวจสอบ NextAuth, สิทธิ์, เกณฑ์และบันทึกข้อมูลแบบ pending ใน `nso_special_wp_records`

**สำคัญ** ต้องมี `src/lib/audits/server.ts` จากชุดเชื่อม NSO Special Audit API ก่อนหน้านี้ และมี `src/auth.ts` ทำงานด้วย NextAuth, ENV `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server only). ตาราง `nso_special_wp_records` ต้องรัน SQL ก่อน

IPD `WpQaModal.tsx` ไม่เปลี่ยน ใช้ `wp_qa_records` เดิม

ปุ่ม WP QA ใน page.tsx จะทำงานกับ UnitWpQaModal เดิมทันที ไม่ต้องแก้ page.tsx ซ้ำ

**ยังไม่ได้รวมหน้ารายการ/หน้าสำหรับอนุมัติ WP เฉพาะ**: บันทึกสถานะ pending สำเร็จ แต่ badge รออนุมัติเดิมอ่านจาก wp_qa_records เท่านั้น ยังไม่รวม nso_special_wp_records; ห้ามนำ rows ของตารางใหม่ไปใช้ BatchDetailModal เดิมโดยไม่มีตัวแสดงรายละเอียดเฉพาะ

ตรวจ `npx tsc --noEmit`, `npm run build` กับโปรเจกต์จริงก่อนเปิดใช้
