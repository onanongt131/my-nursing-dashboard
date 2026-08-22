// components/DashboardLayoutContent.tsx
'use client';
import { usePathname, useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/DashboardHeader';
import { useIdleLogout } from '@/hooks/useIdleLogout';

interface DashboardLayoutContentProps {
  profile?: {
    role?: string;
    department_id?: number | string;
    full_name?: string;
    group?: string;
  } | null;
  departments?: any[]; // เพิ่มรับ prop departments
  children: React.ReactNode;
}

export default function DashboardLayoutContent({ profile, departments = [], children }: DashboardLayoutContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  const { showWarning, setShowWarning } = useIdleLogout(5);

  const getActiveTab = () => {
    if (pathname === '/dashboard') return 'dashboard';
    if (pathname.startsWith('/dashboard/category')) return 'category';
    if (pathname.startsWith('/dashboard/strategy')) return 'strategy';
    if (pathname.startsWith('/dashboard/departments')) return 'unit';
    if (pathname.startsWith('/dashboard/productivity')) return 'productivity';
    if (pathname.startsWith('/dashboard/wp-qa')) return 'wp-qa';
    if (pathname.startsWith('/dashboard/audit-chart')) return 'audit-chart';
    if (pathname.startsWith('/dashboard/iv-care')) return 'iv-care';
    if (pathname.startsWith('/dashboard/rm')) return 'rm';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  const handleTabChange = (tabName: string) => {
    const paths: Record<string, string> = {
      dashboard: '/dashboard',
      unit: '/dashboard/departments',
      category: '/dashboard/category',
      strategy: '/dashboard/strategy',
      productivity: '/dashboard/productivity',
      'wp-qa': '/dashboard/wp-qa',
      'audit-chart': '/dashboard/audit-chart',
      'iv-care': '/dashboard/iv-care',
      rm: '/dashboard/rm'
    };
    
    const targetPath = paths[tabName] || '/dashboard';
    router.push(targetPath);
  };
    

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      

      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100">
        <DashboardHeader 
          title="กลุ่มภารกิจด้านการพยาบาล" 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          departments={departments}
          userName={profile?.full_name}
          userRole={profile?.role}
        />
      </div>
      
      <main className="mt-6">
        {children}
      </main>

      {showWarning && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full text-center space-y-4">
            <h3 className="text-lg font-bold text-gray-800">ไม่มีการเคลื่อนไหว</h3>
            <p className="text-sm text-gray-500">
              ระบบจะทำการออกจากระบบอัตโนมัติในอีก 1 นาที เนื่องจากไม่มีการใช้งาน
            </p>
            <button
              onClick={() => setShowWarning(false)}
              className="w-full py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-sm"
            >
              ใช้งานต่อ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}