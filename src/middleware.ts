import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // ดึง Session จาก Cookie โดยตรง (ชื่อคุกกี้อาจเป็น 'better-auth.session_token' หรือตามที่คุณตั้ง)
  const sessionToken = request.cookies.get("better-auth.session_token")?.value;
  const { pathname } = request.nextUrl;

  const isPublicPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/update-password');

  // ถ้าไม่มี Session Token และไม่ใช่หน้า Public ให้ดีดไป login
  if (!isPublicPage && !sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};