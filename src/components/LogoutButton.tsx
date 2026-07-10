'use client';
import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  const handleLogout = async () => {
    // วิธีนี้ Auth.js จะส่ง Request ไปลบ Session ที่ Server และล้างคุกกี้ให้เอง
    await signOut({ 
      callbackUrl: '/login',
      redirect: true 
    });
  };

  return (
    <button onClick={handleLogout}>ออกจากระบบ</button>
  );
}