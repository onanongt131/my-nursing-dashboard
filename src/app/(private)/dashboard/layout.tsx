import DashboardLayoutContent from '@/components/DashboardLayoutContent';
import {dashboardContext} from '@/lib/auth/dashboardContext';
import {redirect} from 'next/navigation';
export default async function DashboardLayout({children}:{children:React.ReactNode}) {
 const {session,profile,departments,profileUnavailable}=await dashboardContext();
 if(!session?.user)redirect("/login");
 return <div className="min-h-screen bg-gray-50 p-6">
  {profileUnavailable&&<p role="alert" className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">เข้าสู่ระบบแล้ว แต่ยังอ่านข้อมูลหน่วยงานไม่ได้ กรุณาตรวจโปรไฟล์และสถานะอนุมัติกับผู้ดูแลระบบ</p>}
  <DashboardLayoutContent profile={profile} departments={departments}>{children}</DashboardLayoutContent>
 </div>;
}
