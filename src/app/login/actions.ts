"use server";

import { createClient } from "@/utils/supabase/server"; // ใช้ client ฝั่ง server
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // ส่งค่า error กลับไปแสดงในหน้า UI
    return { error: error.message };
  }

  // Login สำเร็จ
  redirect("/");
}