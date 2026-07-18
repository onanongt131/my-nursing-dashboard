'use client';
import { usePathname, useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/DashboardHeader';

export default function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // ประกาศฟังก์ชันไว้ที่นี่ หรือก่อนหน้าบรรทัดที่เรียกใช้
  const getActiveTab = () => {
    if (pathname === '/dashboard') return 'dashboard';
    if (pathname.startsWith('/dashboard/category')) return 'category';
    if (pathname.startsWith('/dashboard/strategy')) return 'strategy';
    if (pathname.startsWith('/dashboard/departments')) return 'unit';
    if (pathname.startsWith('/dashboard/productivity')) return 'productivity';
    return 'dashboard';
  };

  const activeTab = getActiveTab(); // ตอนนี้จะไม่มี Error แล้ว

  // 2. ปรับ handleTabChange ให้เรียบร้อย (คุณเขียนไว้แล้ว ดีมากครับ)
  const handleTabChange = (tabName: string) => {
    const paths: any = {
      dashboard: '/dashboard',
      category: '/dashboard/category',
      strategy: '/dashboard/strategy',
      unit: '/dashboard/departments',
      productivity: '/dashboard/productivity' // เพิ่มตรงนี้
    };
    router.push(paths[tabName]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <DashboardHeader 
        title="กลุ่มภารกิจด้านการพยาบาล" 
        activeTab={activeTab} // ใช้ค่าที่ดึงมาจาก Pathname
        onTabChange={handleTabChange} // ใช้ฟังก์ชันเปลี่ยน Path
        stats={{ total: 12 }} 
      />
      
      <main>
        {/* ในเมื่อคุณใช้ router.push แล้ว เนื้อหาจะถูก render ผ่านระบบ Routing ของ Next.js 
            คุณไม่จำเป็นต้องมี if ... && <Page /> ตรงนี้ครับ 
            ให้ใช้ {children} เพื่อแสดงผลเนื้อหาที่เปลี่ยนไปตาม Route ได้เลย */}
        {children}
      </main>
    </div>
  );
}