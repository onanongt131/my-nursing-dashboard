// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

export async function middleware(request: NextRequest) {
  const session = await auth();
  const user = session?.user;
  const { pathname } = request.nextUrl;

  // รายการหน้าที่ไม่ต้องล็อกอิน (Public Pages)
  const isPublicPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/update-password') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/auth/callback');

  // 1. ถ้าไม่ได้ล็อกอิน และไม่ใช่หน้า Public ให้ดีดไป login
  if (!isPublicPage && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. ถ้าล็อกอินแล้ว และอยู่ที่หน้า login ให้ดีดไปหน้าแรก
  if (isPublicPage && user && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 3. ถ้าผ่านเงื่อนไขทั้งหมด ให้ทำหน้าที่ต่อไป
  return NextResponse.next();
}

// จุดปรับปรุงสำคัญ: เพิ่ม config matcher
export const config = {
  matcher: [
    /*
     * Matcher จะบอกให้ Middleware ทำงานเฉพาะเส้นทางที่กำหนด
     * และ "ข้าม" (ignore) เส้นทางที่ไม่จำเป็น เช่น static files, images, favicon
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};