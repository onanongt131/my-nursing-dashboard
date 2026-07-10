import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // 1. ใช้ getToken แทน auth() เพื่อให้ทำงานใน Edge Runtime ได้รวดเร็ว
  const token = await getToken({ 
    req: request, 
    secret: process.env.AUTH_SECRET // ตรวจสอบว่าใน .env หรือ Vercel มีตัวนี้
  });

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === '/login' || pathname === '/register';

  // 2. ถ้าเข้าหน้า Login/Register แต่มี Token อยู่แล้ว ให้เด้งไป Dashboard
  if (isAuthPage) {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 3. ถ้าไม่มี Token และพยายามเข้าหน้า Dashboard ให้เด้งไป Login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // matcher ที่ดีและครอบคลุม
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};