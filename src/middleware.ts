import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // ป้องกัน Loop ในกรณีที่ session เป็น null/undefined
  const isProtectedRoute = 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/kpi') || 
    pathname.startsWith('/departments');

  const isAuthRoute = pathname === '/login' || pathname === '/register';

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // หัวใจสำคัญ: ใช้การยกเว้นด้วย (?!...) ใน matcher 
  // เพื่อให้มั่นใจว่า Middleware จะไม่ไปยุ่งกับ static files, images หรือ api
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};