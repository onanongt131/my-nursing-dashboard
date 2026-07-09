'use server'; // บังคับใส่บรรทัดแรกสุดของไฟล์นี้

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

// ฟังก์ชันสำหรับรับข้อมูลไปตรวจความถูกต้อง
export async function authenticate(prevState: any, formData: FormData) {
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: "/", // ล็อกอินผ่านให้ไปหน้าแรก
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // ดักจับกรณีใส่รหัสผิด แล้วส่งข้อความเตือนกลับไปที่หน้าจอ
      if (error.type === 'CredentialsSignin') {
        return 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง';
      }
      return 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ';
    }
    throw error;
  }
}