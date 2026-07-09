"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function loginAction(prevState: any, formData: FormData) {
  // 1. ดึง email และ password จากฟอร์ม
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // 2. สร้าง supabase client
  const supabase = await createClient();

  // 3. ทำการ Login
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // 4. จัดการกรณีเกิด Error
  if (error) {
    // ส่งข้อความ error กลับไปที่หน้า UI เพื่อแสดงผล
    return { error: error.message };
  }

  // 5. Login สำเร็จ ทำการ Redirect
  redirect("/");
}