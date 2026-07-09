'use client';

import { signOut } from 'next-auth/react'; // ใช้ signOut ของ next-auth
import { LogOut, Home } from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex justify-between items-center px-6 py-4 bg-white border-b shadow-sm">
        <Link href="/dashboard" className="font-bold text-lg text-gray-700 flex items-center gap-2">
          Dashboard
        </Link>
        <div className="flex gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <Home className="w-4 h-4" />
            หน้าหลัก
          </Link>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}