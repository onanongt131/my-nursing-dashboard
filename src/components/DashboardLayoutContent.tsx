// components/DashboardLayoutContent.tsx
'use client';
import { usePathname, useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/DashboardHeader';
import { useIdleLogout } from '@/hooks/useIdleLogout'; // 👈 นำเข้า Hook จับเวลาไม่มีการเคลื่อนไหว

interface DashboardLayoutContentProps {
  profile?: {
    role?: string;
    department_id?: number | string;
    full_name?: string;
    group?: string;
  } | null;
  children: React.ReactNode;
}

export default function DashboardLayoutContent({ profile, children }: DashboardLayoutContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  // เรียกใช้งาน Idle Logout ตั้งเวลา 5 นาที (สามารถปรับเปลี่ยนเวลาได้ตามต้องการ)
  const { showWarning, setShowWarning } = useIdleLogout(5);

  const getActiveTab = () => {
    if (pathname === '/dashboard') return 'dashboard';
    if (pathname.startsWith('/dashboard/category')) return 'category';
    if (pathname.startsWith('/dashboard/strategy')) return 'strategy';
    if (pathname.startsWith('/dashboard/departments')) return 'unit';
    if (pathname.startsWith('/dashboard/productivity')) return 'productivity';
    if (pathname.startsWith('/dashboard/wp-qa')) return 'wp-qa';
    if (pathname.startsWith('/dashboard/audit-chart')) return 'Audit chart';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  const handleTabChange = (tabName: string) => {
    const paths: Record<string, string> = {
      dashboard: '/dashboard',
      category: '/dashboard/category',
      strategy: '/dashboard/strategy',
      unit: '/dashboard/departments',
      productivity: '/dashboard/productivity',
      'wp-qa': '/dashboard/wp-qa',
      'audit-chart': '/dashboard/audit-chart' // ปรับให้เป็นตัวพิมพ์เล็กให้ตรงกับชื่อแท็บ
    };
    
    const targetPath = paths[tabName] || '/dashboard';
    router.push(targetPath);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* แสดงข้อมูลผู้ใช้และ Role */}
      {profile && (
        <div className="mb-4 text-xs text-gray-500 flex justify-between items-center">
          <span>ผู้ใช้งาน: <strong className="text-gray-700">{profile.full_name}</strong></span>
          <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-medium uppercase">
            สิทธิ์: {profile.role} {profile.group ? `(${profile.group})` : ''}
          </span>
        </div>
      )}

      <DashboardHeader 
        title="กลุ่มภารกิจด้านการพยาบาล" 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        stats={{ total: 12 }} 
      />
      
      <main className="mt-6">
        {children}
      </main>

      {/* Modal แจ้งเตือนก่อน Logout อัตโนมัติ เมื่อไม่มีการเคลื่อนไหวครบกำหนด */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-in fade-in duration-300">
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