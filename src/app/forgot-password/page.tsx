"use client";

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // ส่งลิงก์รีเซ็ตไปที่อีเมล โดยกำหนดให้ Redirect มาที่หน้า update-password ของคุณ
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setMessage("เกิดข้อผิดพลาด: " + error.message);
    } else {
      setMessage("ส่งลิงก์รีเซ็ตไปที่อีเมลของคุณแล้ว กรุณาตรวจสอบกล่องข้อความ");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <form onSubmit={handleReset} className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-sm border">
        <h1 className="text-xl font-bold mb-2 text-center">ลืมรหัสผ่าน</h1>
        <p className="text-sm text-gray-500 mb-4 text-center">กรอกอีเมลของคุณเพื่อรับลิงก์ตั้งรหัสผ่านใหม่</p>
        
        <input 
          type="email" 
          placeholder="อีเมลของคุณ" 
          required 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded-xl mb-4 text-sm"
        />
        
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition"
        >
          {loading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ต'}
        </button>

        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm text-purple-600 hover:underline">
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>

        {message && <p className="mt-4 text-sm text-center text-gray-700">{message}</p>}
      </form>
    </div>
  );
}