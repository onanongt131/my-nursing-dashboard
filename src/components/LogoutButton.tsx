'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { LogOut, Loader2 } from 'lucide-react'; // เพิ่มไอคอน Loading

export default function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      // การใช้ redirect: true คือมาตรฐานเพื่อให้ระบบพาไปที่หน้า callbackUrl ทันที
      await signOut({ 
        callbackUrl: '/login',
        redirect: true 
      });
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false); // ปิดสถานะโหลดถ้าเกิด Error
    }
  };

  return (
    <button 
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all
        ${isLoggingOut 
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
          : 'text-red-600 bg-red-50 hover:bg-red-100'
        }`}
    >
      {isLoggingOut ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" /> กำลังออก...
        </>
      ) : (
        <>
          <LogOut className="w-4 h-4" /> ออกจากระบบ
        </>
      )}
    </button>
  );
}