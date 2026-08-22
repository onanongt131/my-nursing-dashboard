// src/app/(private)/dashboard/layout.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardLayoutContent from "@/components/DashboardLayoutContent";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardPrivateLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || !session.user) redirect("/login");

  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      role, 
      department_id, 
      full_name,
      departments ( group )
    `)
    .eq('email', session.user.email)
    .single();

  console.log("Profile Query Result:", profile, error);

  const { data: departments } = await supabase
    .from('departments')
    .select('*');

  const userProfile = profile ? {
    ...profile,
    group: (profile.departments as any)?.group || null
  } : null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <DashboardLayoutContent profile={userProfile} departments={departments || []}>
        {children}
      </DashboardLayoutContent>
    </div>
  );
}