import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. ทางด่วน: ห้ามบล็อกไฟล์ระบบ, public assets หรือ api auth
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/_next/static")
  ) {
    return NextResponse.next();
  }

  // 2. ดึง Token เพื่อเช็ค Session
  const token = await getToken({ 
    req: request, 
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  });

  // 3. ถ้าเข้าหน้า dashboard แต่ไม่มี Token ให้ดีดไปหน้า /login
  if (pathname.startsWith("/dashboard") && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. ถ้าล็อกอินแล้ว แต่ยังอยู่ที่หน้า login ให้ส่งไปที่ dashboard
  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

// กำหนดให้ Middleware ทำงานครอบคลุมเส้นทางหลักของระบบ
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};