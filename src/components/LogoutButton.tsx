'use client';

import { useTransition } from 'react';
import { handleSignOut } from '@/app/login/actions';
import { LogOut, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation'; // เพิ่ม useRouter

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter(); // เรียกใช้งาน router

  const handleLogoutClick = () => {
    startTransition(async () => {
      try {
        await handleSignOut();
        
        // บังคับเคลียร์เส้นทางและรีเฟรชพาไปหน้า login หรือหน้าแรก
        router.push('/login'); // หรือ '/' ตามเส้นทางหน้าล็อกอินของคุณ
        router.refresh();      // รีเฟรช Cache ทั้งหมดใน Next.js Router
      } catch (error) {
        console.error("Logout process error:", error);
      }
    });
  };

  return (
    <button 
      onClick={handleLogoutClick}
      disabled={isPending}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <LogOut className="w-4 h-4" />
      )}
      <span>{isPending ? 'กำลังออก...' : 'ออกจากระบบ'}</span>
    </button>
  );
}