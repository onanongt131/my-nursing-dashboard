// src/app/update-password/page.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setMessage("เกิดข้อผิดพลาด: " + error.message);
    } else {
      setMessage("เปลี่ยนรหัสผ่านสำเร็จ! กำลังนำคุณไปหน้า Dashboard...");
      
      // ใช้ window.location.href เพื่อบังคับ Reload และ Redirect ใหม่
      // วิธีนี้จะทำให้ Middleware ทำงานใหม่และเช็คสถานะการล็อกอินอีกครั้งครับ
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
        {message && <p className="mt-4 text-sm text-center">{message}</p>}
      </form>
    </div>
  );
}