import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // 1. ตรวจสอบการเข้าถึงหน้า Dashboard (Protected Routes)
  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/kpi') || pathname.startsWith('/departments');
  const isAuthRoute = pathname === '/login' || pathname === '/register';

  // ถ้าไม่มี session แล้วพยายามเข้าหน้า protected ให้ไป login
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ถ้ามี session แล้ว แต่พยายามเข้าหน้า login ให้กลับไป dashboard
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // กรองให้ทำงานเฉพาะ Path ที่สำคัญ
  // ยกเว้น: api, _next/static, _next/image, favicon.ico และไฟล์อื่นๆ ใน public
  matcher: [
    '/dashboard/:path*',
    '/kpi/:path*',
    '/departments/:path*',
    '/login',
    '/register'
  ],
}