// hooks/useIdleLogout.ts (หรือไฟล์ที่คุณเก็บ Hook นี้ไว้)
'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client'; // 👈 นำเข้า Supabase client

export const useIdleLogout = (timeoutInMinutes: number = 5) => {
  const [showWarning, setShowWarning] = useState(false);
  const timeoutMs = timeoutInMinutes * 60 * 1000;
  const supabase = createClient(); // 👈 สร้าง instance ของ supabase

  useEffect(() => {
    let idleTimer: NodeJS.Timeout;
    let warningTimer: NodeJS.Timeout;

    const logout = async () => {
      // 1. ทำการ Logout จาก Supabase เพื่อเคลียร์ Session และ Token ฝั่งเซิร์ฟเวอร์/คุกกี้
      await supabase.auth.signOut();
      
      // 2. เปลี่ยนเส้นทางไปยังหน้า Login พร้อมรีเฟรชหน้าจอเพื่อล้างค่า State ทั้งหมด
      window.location.href = '/login';
    };

    const resetTimer = () => {
      clearTimeout(idleTimer);
      clearTimeout(warningTimer);
      setShowWarning(false);

      // เตือนก่อน 1 นาที
      const warningTime = Math.max(0, timeoutMs - 60000);
      warningTimer = setTimeout(() => setShowWarning(true), warningTime);
      
      // Logout จริงเมื่อครบเวลา
      idleTimer = setTimeout(logout, timeoutMs);
    };

    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      clearTimeout(idleTimer);
      clearTimeout(warningTimer);
    };
  }, [timeoutMs, supabase]);

  return { showWarning, setShowWarning };
};