import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardLayoutContent from "@/components/DashboardLayoutContent";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || !session.user) redirect("/login");

  const supabase = await createClient();

  // ลองเปลี่ยนจาก .eq('id', session.user.id) เป็นค้นหาด้วย email ดูครับ
const { data: profile, error } = await supabase
  .from('profiles')
  .select(`
    role, 
    department_id, 
    full_name,
    departments ( group )
  `)
  .eq('email', session.user.email) // ใช้ email แทน id
  .single();

console.log("Profile Query Result:", profile, error); // ดู Error ใน Terminal ของ Server

  // 2. ดึงรายชื่อหน่วยงานทั้งหมดสำหรับนำไปแสดงในเมนูดรอปดาวน์ของ Header
  const { data: departments } = await supabase
    .from('departments')
    .select('*');

  // จัดรูปแบบ profile ให้เรียกใช้ง่าย
  const userProfile = profile ? {
    ...profile,
    group: (profile.departments as any)?.group || null
  } : null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 3. ส่ง departments เข้าไปที่ DashboardLayoutContent ด้วย */}
      <DashboardLayoutContent profile={userProfile} departments={departments || []}>
        {children}
      </DashboardLayoutContent>
    </div>
  );
}