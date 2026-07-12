// ในไฟล์ src/middleware.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

// 1. เขียนฟังก์ชัน middleware แบบมาตรฐานที่ Next.js บังคับตรวจเช็ค
export default auth((req) => {
  // ระบบจะใช้เงื่อนไขตรวจสอบจาก callbacks.authorized ใน auth.ts อัตโนมัติ
  return NextResponse.next();
});

// 2. ล็อกเป้าหมายตรวจเช็คเฉพาะหน้า Login และหน้าระบบหลังบ้าน
export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
