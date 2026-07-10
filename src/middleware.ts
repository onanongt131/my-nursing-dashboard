// src/middleware.ts
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request, 
    secret: process.env.AUTH_SECRET // ตรวจสอบว่าใน .env.local มีค่านี้
  });

  const { pathname } = request.nextUrl;

  // ป้องกันหน้า Dashboard สำหรับคนที่ไม่มี Token
  if (pathname.startsWith("/dashboard") && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ถ้ามี Token แล้วห้ามเข้าหน้า Login/Register
  if ((pathname === "/login" || pathname === "/register") && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};