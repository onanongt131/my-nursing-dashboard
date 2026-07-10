'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { LogOut, Loader2 } from 'lucide-react';

export default function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 1. นำฟังก์ชันล้างคุกกี้มาวางไว้ตรงนี้
  const clearAuthCookies = () => {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      
      // ลบคุกกี้ Auth ทั้งหมด
      if (name.includes("authjs.session-token") || name.includes("next-auth.session-token") || name.startsWith("__Secure-")) {
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;";
      }
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
        // signOut แบบ redirect: true จะแจ้งให้เซิร์ฟเวอร์ลบเซสชันและลบคุกกี้ที่เกี่ยวข้องออกให้
        await signOut({ callbackUrl: '/login', redirect: true });
    } catch (error) {
        console.error("Logout failed:", error);
        setIsLoggingOut(false);
    }
    };

  return (
    <button 
      type="button" // เพิ่ม type เพื่อความปลอดภัย
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
          <Loader2 className="w-4 h-4 animate-spin" /> 
          <span className="hidden sm:inline">กำลังออก...</span>
        </>
      ) : (
        <>
          <LogOut className="w-4 h-4" /> 
          <span className="hidden sm:inline">ออกจากระบบ</span>
        </>
      )}
    </button>
  );
}