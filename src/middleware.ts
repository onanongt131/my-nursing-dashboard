import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // ถ้าเข้าหน้า login หรือ register ให้ผ่านไปเลยโดยไม่ต้องเช็ค session
  if (pathname === '/login' || pathname === '/register') {
    return NextResponse.next();
  }

  // ถ้าไม่มี session แล้วพยายามเข้าหน้า dashboard หรือ path อื่นๆ ให้ส่งไป login
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
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