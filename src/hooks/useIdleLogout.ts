'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export const useIdleLogout = (timeoutInMinutes: number = 5) => {
  const [showWarning, setShowWarning] = useState(false);
  const timeoutMs = timeoutInMinutes * 60 * 1000;

  useEffect(() => {
    // 👈 สร้าง Supabase client ไว้ด้านในนี้ เพื่อไม่ให้สร้างใหม่ซ้ำๆ ตอน component re-render
    const supabase = createClient();
    
    let idleTimer: NodeJS.Timeout;
    let warningTimer: NodeJS.Timeout;

    const logout = async () => {
      await supabase.auth.signOut();
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
  }, [timeoutMs]); // 👈 ตัด supabase ออกจาก dependency ได้เลย เพราะสร้างข้างในแล้ว

  return { showWarning, setShowWarning };
};