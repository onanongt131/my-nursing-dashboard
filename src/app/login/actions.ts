'use server';

import { signIn } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";

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

// 2. ฟังก์ชันเข้าสู่ระบบ (Login)
export async function authenticate(prevState: any, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง";
    }
    throw error;
  }
}