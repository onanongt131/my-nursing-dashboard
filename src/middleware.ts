import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server"; // นำเข้าแบบ type

// ใช้ AuthRequest เพื่อให้ TypeScript เข้าใจว่ามี property 'auth' อยู่
export default auth((req: any) => { 
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth; // ตอนนี้ TS จะเลิกบ่นเรื่อง req.auth แล้วครับ

  const isPublicPage = [
    "/login", 
    "/register", 
    "/forgot-password", 
    "/update-password"
  ].includes(nextUrl.pathname);

  if (isLoggedIn && isPublicPage) {
     return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (!isLoggedIn && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};