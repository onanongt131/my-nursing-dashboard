// app/(public)/dashboard/layout.tsx
import { auth } from "@/auth";
import DashboardLayoutContent from "@/components/DashboardLayoutContent";
import { createClient } from "@/utils/supabase/server";

export default async function PublicDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const supabase = await createClient();

  let userProfile = null;

  // ถ้ามีการ Login อยู่ เราจะดึงข้อมูลมาโชว์ในเมนู (ถ้าไม่ได้ Login ให้ข้ามส่วนนี้ไป)
  if (session?.user?.email) {
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        role, 
        department_id, 
        full_name,
        departments ( group )
      `)
      .eq('email', session.user.email)
      .single();

    if (profile) {
      userProfile = {
        ...profile,
        group: (profile.departments as any)?.group || null
      };
    }
  }

  // ดึงรายการหน่วยงาน (ให้คนทั่วไปเห็นรายการหน่วยงานได้)
  const { data: departments } = await supabase
    .from('departments')
    .select('*');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <DashboardLayoutContent 
        profile={userProfile} 
        departments={departments || []}
      >
        {children}
      </DashboardLayoutContent>
    </div>
  );
}