'use client';

import { signOut } from 'next-auth/react'; // เปลี่ยนมานำเข้าจาก next-auth
import { LogOut } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {

  // ฟังก์ชัน Logout สำหรับ Next-Auth v5
  const handleLogout = async () => {
    // คำสั่งนี้จะเคลียร์คุกกี้ตระกูล authjs ทั้งหมดออกไปโดยอัตโนมัติ
    await signOut({ callbackUrl: '/login' }); 
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header พร้อมปุ่ม Logout */}
      <header className="flex justify-between items-center px-6 py-4 bg-white border-b shadow-sm">
        <h1 className="font-bold text-lg text-gray-700">Dashboard</h1>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition border border-red-200 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          ออกจากระบบ
        </button>
      </header>

      <main className="p-6">{children}</main>
    </div>
  );
}