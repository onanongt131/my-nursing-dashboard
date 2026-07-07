"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  // 1. สร้าง State เป็น null ไว้ก่อน
  const [supabase, setSupabase] = useState<any>(null);

  // 2. ใช้ useEffect สร้าง Client หลังจากที่ Component โหลดใน Browser แล้วเท่านั้น
  useEffect(() => {
    const client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    setSupabase(client);
  }, []);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    
    // 3. เช็คว่า client พร้อมหรือยังก่อนเรียกใช้งาน
    if (!supabase) return;

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setMessage("เกิดข้อผิดพลาด: " + error.message);
    } else {
      setMessage("เปลี่ยนรหัสผ่านสำเร็จ! กำลังนำคุณไปหน้า Dashboard...");
      setTimeout(() => {
        window.location.href = "/"; 
      }, 1500);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <form onSubmit={handleUpdate} className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-sm border">
        <h1 className="text-xl font-bold mb-4">ตั้งรหัสผ่านใหม่</h1>
        <input 
          type="password" 
          placeholder="รหัสผ่านใหม่" 
          required 
          className="w-full p-3 border rounded-xl mb-4"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">
          อัปเดตรหัสผ่าน
        </button>
        {message && <p className="mt-4 text-sm text-center text-gray-700">{message}</p>}
      </form>
    </div>
  );
}