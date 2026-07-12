import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. ทางด่วน: ห้ามบล็อกไฟล์ระบบ, public assets หรือ api auth
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/_next/static")
  ) {
    return NextResponse.next();
  }

  // 2. ดึง Token เพื่อเช็ค Session
  const token = await getToken({ 
    req: request, 
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  });

    // 3. ป้องกันหน้า dashboard: ถ้าพยายามเข้าหน้าระบบแต่ไม่มี Token ให้ส่งไปหน้า /login
  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 4. ป้องกันหน้า login: ถ้าเข้าหน้าล็อกอินแต่ระบบพบว่ามี Token อยู่แล้ว ให้ส่งไปที่หน้า dashboard ทันที
  if (pathname.startsWith("/login") && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }


  return NextResponse.next();
}

// กำหนดให้ Middleware ทำงานครอบคลุมเส้นทางหลักของระบบ
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};