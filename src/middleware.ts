import { auth } from "@/auth";
import { NextRequest } from "next/server";

export default auth((req: any) => { 
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  
  // ตรวจสอบเส้นทางที่เป็นหน้า Public
  const isPublicPage = [
    "/login", 
    "/register", 
    "/forgot-password", 
    "/update-password"
  ].includes(nextUrl.pathname);

  // 1. ถ้าล็อกอินแล้ว แต่พยายามเข้าหน้า Login หรือ Register ให้ดีดไปหน้า Dashboard (หรือหน้าแรก)
  if (isLoggedIn && isPublicPage) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // 2. ถ้ายังไม่ล็อกอิน และพยายามเข้าหน้าอื่นๆ ที่ไม่ใช่ Public ให้ดีดไปหน้า Login
  if (!isLoggedIn && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // กรณีอื่นๆ ให้ผ่านไปได้ปกติ
  return NextResponse.next();
});

// ปรับปรุง Matcher ให้เลี่ยงเส้นทาง API Auth ของ NextAuth อย่างชัดเจน
export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};