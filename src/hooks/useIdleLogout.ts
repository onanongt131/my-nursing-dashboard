'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export const useIdleLogout = (timeoutInMinutes: number = 15) => {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const timeoutMs = timeoutInMinutes * 60 * 1000;

  useEffect(() => {
    let idleTimer: NodeJS.Timeout;
    let warningTimer: NodeJS.Timeout;

    const logout = async () => {
      await supabase.auth.signOut();
      router.replace('/login');
    };

    const resetTimer = () => {
      clearTimeout(idleTimer);
      clearTimeout(warningTimer);
      setShowWarning(false); // ซ่อนเตือนถ้ามีการขยับเมาส์

      // เตือนก่อน 1 นาที (ลบ 1 นาทีจากเวลาจริง)
      warningTimer = setTimeout(() => setShowWarning(true), timeoutMs - 60000);
      
      // Logout จริงเมื่อครบเวลา
      idleTimer = setTimeout(logout, timeoutMs);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      clearTimeout(idleTimer);
      clearTimeout(warningTimer);
    };
  }, [timeoutMs, router]);

  return { showWarning, setShowWarning };
};