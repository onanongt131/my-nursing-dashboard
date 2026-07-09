'use server';

import { signIn } from "@/auth";

// ฟังก์ชันสำหรับรับข้อมูลไปตรวจความถูกต้อง
export async function authenticate(prevState: any, formData: FormData) {
  try {
    await signIn("credentials", {
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      redirectTo: "/",
    });
  } catch (error) {
    const err = error as any;

    if (err.type === 'CredentialsSignin') {
      return 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง';
    }
    
    // จัดการ Redirect ของ NextAuth
    if (err.type === 'NEXT_REDIRECT' || err.type === 'Redirect') {
      throw error; 
    }

    return 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ';
  } // ปิด catch
} // ปิด authenticate