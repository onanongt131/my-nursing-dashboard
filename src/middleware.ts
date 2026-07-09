// src/middleware.ts
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// เรียกใช้ Auth.js middleware ที่สร้างจาก authConfig ของคุณ
export default NextAuth(authConfig).auth;

export const config = {
  // ระบุว่าให้ Middleware ทำงานที่ไหนบ้าง (ไม่ให้ไปยุ่งกับไฟล์ static ต่างๆ)
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};