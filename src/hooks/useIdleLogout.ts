'use client';
import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react'; // เปลี่ยนมาใช้ตัวนี้

export const useIdleLogout = (timeoutInMinutes: number = 5) => {
  const [showWarning, setShowWarning] = useState(false);
  const timeoutMs = timeoutInMinutes * 60 * 1000;

  useEffect(() => {
    let idleTimer: NodeJS.Timeout;
    let warningTimer: NodeJS.Timeout;

    const logout = async () => {
      // ใช้ signOut ของ Next-Auth เพื่อเคลียร์คุกกี้ทั้งหมด
      await signOut({ callbackUrl: '/login' });
    };

    const resetTimer = () => {
      clearTimeout(idleTimer);
      clearTimeout(warningTimer);
      setShowWarning(false);

      // เตือนก่อน 1 นาที
      // ใช้ Math.max เพื่อป้องกันกรณีตั้งเวลาสั้นกว่า 1 นาที
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
  }, [timeoutMs]);

  return { showWarning, setShowWarning };
};