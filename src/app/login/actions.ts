'use server';

import { signIn } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signOut as serverSignOut } from "@/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 1. ฟังก์ชันสมัครสมาชิก (Register)
export async function registerUser(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Hash รหัสผ่านก่อนบันทึก
  const hashedPassword = await bcrypt.hash(password, 10);

  const { error } = await supabase
    .from("profiles")
    .insert([{ email, password: hashedPassword }]);

  if (error) return "เกิดข้อผิดพลาดในการสมัครสมาชิก";
  return "สมัครสมาชิกสำเร็จ";
}

export async function authenticate(prevState: any, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    // 🔥 เพิ่มการดักจับ Error ที่ส่งมาจาก auth.ts ตรงนี้ก่อนครับ
    if (error instanceof Error) {
      if (error.message === "UNAPPROVED_USER") {
        return "บัญชีของคุณยังไม่ได้รับการอนุมัติจากผู้ดูแลระบบ กรุณารอการอนุมัติ";
      }
      if (error.message === "ไม่พบอีเมลนี้ในระบบ" || error.message === "รหัสผ่านไม่ถูกต้อง") {
        return error.message;
      }
    }

    if (error instanceof AuthError) {
      return "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง";
    }
    
    // เช็คเรื่องการ Redirect ของ Next.js
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error;
    }
    if ((error as any)?.NEXT_REDIRECT) {
      throw error;
    }

    // หากเป็นข้อผิดพลาดอื่นๆ ค่อยส่งข้อความเตือน
    return "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ";
  }
}

export async function handleSignOut() {
  await serverSignOut({ redirectTo: "/login" });
}