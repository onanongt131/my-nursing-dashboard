'use client';

import { signOut } from 'next-auth/react'; // ใช้ signOut ของ next-auth โดยตรง
import { LogOut, Home } from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  
  // ใช้ redirect: true เพื่อให้มันเปลี่ยนหน้าหลังจากเคลียร์คุกกี้แล้ว
  const handleLogout = async () => {
  // 1. ล้างคุกกี้ที่เบราว์เซอร์เก็บไว้ทั้งหมด
        document.cookie.split(";").forEach(c => { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        
        // 2. เรียก signOut ของ Next-Auth เพื่อเคลียร์ Memory
        try {
            await signOut({ redirect: false });
        } catch (e) {
            console.error("Signout failed, forcing redirect");
        }
        
        // 3. บังคับย้ายหน้าไปยัง /login
        window.location.href = '/login';
        };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex justify-between items-center px-6 py-4 bg-white border-b shadow-sm">
        <Link href="/dashboard" className="font-bold text-lg text-gray-700">Dashboard</Link>
        <div className="flex gap-2">
          {/* ปุ่มกลับหน้าหลัก */}
          <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            <Home className="w-4 h-4" /> หน้าหลัก
          </Link>
          {/* ปุ่มออกจากระบบ */}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
          >
            <LogOut className="w-4 h-4" /> ออกจากระบบ
          </button>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}