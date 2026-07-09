// src/middleware.ts
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // 1. ถ้าไม่ได้ Login และพยายามเข้าหน้าอื่นที่ไม่ใช่ /login -> ให้ไปที่ /login
  if (!token && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 2. ถ้า Login แล้ว แต่พยายามเข้าหน้า /login -> ให้กลับไปหน้าหลัก
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

// กำหนด Path ที่ต้องการให้ Middleware ทำงาน
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login).*)'],
};