// src/app/forgot-password/page.tsx
"use client"; // ต้องใส่ เพราะมีการใช้ React Hook

import { useActionState } from "react";
import { createClient } from '@/utils/supabase/client'; // แนะนำใช้ client-side supabase ในหน้า UI

async function resetPasswordAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const supabase = createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
  });

  if (error) {
    return { success: false, message: "เกิดข้อผิดพลาด: " + error.message };
  }
  
  return { success: true, message: "ระบบส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว" };
}

export default function ForgotPasswordPage() {
  // useActionState จะคอยรับค่าที่ส่งมาจาก Server Action
  const [state, formAction, pending] = useActionState(resetPasswordAction, null);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <form action={formAction} className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-sm border">
        <h1 className="text-xl font-bold mb-4">ลืมรหัสผ่าน</h1>
        <p className="text-sm text-gray-600 mb-4">กรอกอีเมลของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน</p>
        
        <input 
          name="email" 
          type="email" 
          placeholder="อีเมลของคุณ" 
          required 
          className="w-full p-3 border rounded-xl mb-4"
        />

        <button 
          type="submit" 
          disabled={pending}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-400"
        >
          {pending ? "กำลังส่ง..." : "ส่งอีเมลรีเซ็ต"}
        </button>

        {/* แสดงข้อความสถานะ (สำเร็จ หรือ ผิดพลาด) */}
        {state && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${state.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {state.message}
          </div>
        )}
      </form>
    </div>
  );
}