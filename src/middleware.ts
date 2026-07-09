import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

export async function middleware(request: NextRequest) {
  const session = await auth(); // ดึงสถานะการ Login
  const { pathname } = request.nextUrl;

  // 1. ถ้ายังไม่มี session และไม่ได้อยู่ในหน้า login หรือ register ให้พาไปที่ login
  if (!session && pathname !== '/login' && pathname !== '/register') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. ถ้ามี session แล้ว แต่พยายามเข้าหน้า login หรือ register ให้พาไปหน้า dashboard
  if (session && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // กรองไฟล์ที่ไม่ต้องการให้ตรวจสอบ
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};