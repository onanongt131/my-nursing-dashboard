import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  const { pathname } = req.nextUrl;

  // 1. ถ้าพยายามเข้าหน้า Dashboard แต่ไม่มี Token ให้เด้งไปหน้า Login
  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 2. ถ้ามี Token อยู่แล้วแต่พยายามเข้าหน้า Login ให้เด้งไป Dashboard
  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

// ระบุว่าให้ Middleware ทำงานที่ Path ไหนบ้าง
export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};