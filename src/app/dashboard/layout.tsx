import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardLayoutContent from "@/components/DashboardLayoutContent";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || !session.user) redirect("/login");

  const supabase = await createClient();

  // ดึงข้อมูล profile พร้อมทั้ง join หรือดึงข้อมูล group จากตาราง departments ของผู้ใช้คนนี้
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      role, 
      department_id, 
      full_name,
      departments ( group )
    `)
    .eq('id', session.user.id)
    .single();

  // จัดรูป ให้อยู่ในโครงสร้างที่เรียกใช้ง่าย (เช่น profile.group)
  const userProfile = profile ? {
    ...profile,
    group: (profile.departments as any)?.group || null
  } : null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <DashboardLayoutContent profile={userProfile}>
        {children}
      </DashboardLayoutContent>
    </div>
  );
}