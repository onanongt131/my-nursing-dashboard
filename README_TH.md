# ติดตั้ง API Audit Chart

1. คัดลอกโฟลเดอร์ src จากชุดนี้ไปวางรวมกับ src ของโครงการ
   เพิ่มไฟล์:
   - src/app/api/audits/route.ts (GET, POST)
   - src/app/api/audits/[id]/route.ts (GET, PATCH)
   - src/lib/audits/chartServer.ts
   ใช้ lrAuditCriteria.ts เดิม ไม่ต้องทับ src/lib/audits/server.ts หรือ wp-special

2. ตรวจการตั้งค่าใน .env.local ของเครื่องตนเอง:
   NEXT_PUBLIC_SUPABASE_URL=ค่าที่มีอยู่เดิม
   SUPABASE_SERVICE_ROLE_KEY=ค่าฝั่งเซิร์ฟเวอร์ที่มีอยู่เดิม
   ห้ามใส่ service role key ในตัวแปร NEXT_PUBLIC_ หรือส่งให้ผู้อื่น

3. ใช้ auth() จาก @/auth ตามชุดโค้ดเดิม และ profiles.id ต้องตรง session.user.id
   profiles.status ต้องเป็น approved และ role ต้องเป็น staff, head_department,
   head_group, head_nurse หรือ admin ตามระบบเดิม

4. ตรวจ Supabase Table Editor ว่ามี nso_special_audits หรือไม่
   ถ้ายังไม่มี ให้รัน sql/01_create_audits_if_missing.sql ใน SQL Editor
   ถ้ามีอยู่แล้ว ไม่ต้องรัน SQL นี้ หากคอลัมน์ไม่ครบให้ส่งรายละเอียดโครงสร้างตาราง
   SQL นี้ไม่ย้ายหรือแก้ข้อมูลในตารางเดิม และไม่เปิดสิทธิ์อ่านตารางให้ browser

5. หยุดเซิร์ฟเวอร์ด้วย Ctrl+C แล้วรัน npm run dev ใหม่
   สำหรับการใช้งานจริงให้รัน npx tsc --noEmit และ npm run build ก่อน deploy

6. เปิดแบบประเมิน LR บันทึกข้อมูลสมมติ ตรวจ Terminal:
   POST /api/audits 201 = เพิ่มร่างสำเร็จ
   PATCH /api/audits/<id> 200 = แก้ร่างสำเร็จ
   401 = ตรวจ session และสถานะ profiles
   403 = ไม่มีสิทธิ์หน่วยงานหรือแก้รายการของผู้อื่น
   400 = ข้อมูลไม่ถูกต้อง ให้ดูข้อความบนแบบฟอร์ม
   500 = ตรวจ env / ตาราง / คอลัมน์และการเชื่อมต่อฐานข้อมูล

บันทึกเป็น draft และตอบ { item: { id, ... } } ตรงกับ LRAuditChartModal
อ่านรายการ: /api/audits?department_id=รหัสหน่วยงาน
คะแนนรวมทางการยังไม่คำนวณ ชุดนี้ไม่มี API ส่งอนุมัติหรืออนุมัติ

อ้างอิง API และ auth จากชุด LR_Audit_Supabase_Draft_Integration เดิม
ยังไม่ได้ build กับโครงการเต็มหรือทดสอบฐานข้อมูลจริงของผู้ใช้
