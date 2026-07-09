import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET 
  });

  const { pathname } = req.nextUrl;

  // 1. ถ้าไม่ได้ Login และพยายามเข้าหน้า Dashboard หรือหน้าหลัก (/) 
  // ให้เด้งไปหน้า login
  if (!token && (pathname.startsWith('/dashboard') || pathname === '/')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 2. ถ้า Login แล้ว แต่ยังอยู่ในหน้า login ให้เด้งไปหน้า dashboard
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

// ตัวนี้คือตัวสั่งงานว่าให้เช็คหน้าไหนบ้าง
export const config = {
  matcher: ['/', '/dashboard/:path*', '/login'],
};