'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useIdleLogout } from '@/hooks/useIdleLogout'; 
import { LogOut, AlertTriangle } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // 1. เรียกใช้ Hook พร้อมรับค่าสถานะการแจ้งเตือน
  const { showWarning } = useIdleLogout(15); 

  // 2. ฟังก์ชัน Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.replace('/login');
      else setLoading(false);
    };
    checkSession();

    // ฟังการเปลี่ยนแปลงสถานะ (เช่น กรณี Logout จากที่อื่น)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/login');
    });
    return () => subscription.unsubscribe();
  }, [router]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 bg-white border-b shadow-sm">
        <h1 className="font-bold text-lg text-gray-700">Dashboard</h1>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
          ออกจากระบบ
        </button>
      </header>

      <main className="p-6">{children}</main>

      {/* 3. Modal แจ้งเตือนก่อน Logout */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full border-t-4 border-yellow-500">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">แจ้งเตือนเซสชัน</h2>
            <p className="text-gray-600 mb-6">
              ระบบกำลังจะออกจากระบบอัตโนมัติใน 1 นาที โปรดตรวจสอบว่าคุณได้บันทึกข้อมูลเรียบร้อยแล้ว
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition"
            >
              ใช้งานต่อ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}