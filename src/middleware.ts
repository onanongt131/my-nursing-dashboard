import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // เปลี่ยนมาเช็คจาก Cookie แทนการเรียก auth()
  // ตรวจสอบชื่อคุกกี้ที่แท้จริงใน Browser ของคุณ (เช่น better-auth.session_token)
  const sessionToken = request.cookies.get("better-auth.session_token"); 

  const { pathname } = request.nextUrl;

  const isPublicPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/update-password') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/auth/callback');

  // ตรวจสอบสถานะการล็อกอิน
  const isAuthenticated = !!sessionToken;

  if (!isPublicPage && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isPublicPage && isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};