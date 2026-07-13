'use client';

import { useTransition } from 'react';
import { handleSignOut } from '@/app/login/actions'; // 🔥 นำเข้าฟังก์ชันจากไฟล์ actions หลังบ้าน
import { LogOut, Loader2 } from 'lucide-react';

export default function LogoutButton() {
  // ใช้ useTransition เพื่อทำสถานะโหลด (Loading) ตอนส่งข้อมูลข้ามไปยังเซิร์ฟเวอร์
  const [isPending, startTransition] = useTransition();

  const handleLogoutClick = () => {
    startTransition(async () => {
      try {
        await handleSignOut(); // สั่งให้เซิร์ฟเวอร์ล้างระบบ Cookie และ Redirect ไปหน้าล็อกอิน
      } catch (error) {
        console.error("Logout process error:", error);
      }
    });
  };

  return (
    <button 
      type="button"
      onClick={handleLogoutClick}
      disabled={isPending}
      className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all font-semibold
        ${isPending 
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
          : 'text-red-600 bg-red-50 hover:bg-red-100 active:scale-95'
        }`}
    >
      {isPending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> 
          <span>กำลังออกจากระบบ...</span>
        </>
      ) : (
        <>
          <LogOut className="w-4 h-4" /> 
          <span>ออกจากระบบ</span>
        </>
      )}
    </button>
  );
}
