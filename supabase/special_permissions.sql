-- สิทธิ์พิเศษเฉพาะงานของผู้ใช้ เช่น 'pressure_sore_all' = บันทึก Pressure sore ได้ทุกหน่วยงาน (ไม่เข้าส่วนอื่น ไม่มีสิทธิ์อนุมัติ)
-- รันครั้งเดียวใน Supabase > SQL Editor (รันซ้ำได้ ไม่ลบข้อมูลเดิม)
alter table public.profiles add column if not exists permissions text[] not null default '{}';
notify pgrst, 'reload schema';

-- กำหนดสิทธิ์: ใช้หน้า "อนุมัติสมาชิกใหม่" > ค้นหาสมาชิก > ติ๊ก "บันทึก Pressure sore ทุกหน่วยงาน" > บันทึก
-- หรือด้วย SQL:
-- update public.profiles set permissions = array['pressure_sore_all'] where email in ('person1@example.com','person2@example.com');
