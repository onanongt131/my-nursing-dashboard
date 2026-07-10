// src/app/login/actions.ts
'use server';
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function authenticate(prevState: any, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard", // นี่คือจุดที่สั่ง Redirect
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง";
    }
    throw error; // สำคัญ: ต้องปล่อยให้ Auth.js จัดการ Redirect เอง
  }
}