import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // 1. ระบุหน้า Public ที่ไม่ต้อง Login
  const isPublicPage = ["/login", "/register"].includes(nextUrl.pathname);

  // 2. ถ้าไม่ได้ Login และเข้าหน้าที่ไม่ใช่หน้า Public -> ให้ไปหน้า Login
  if (!isLoggedIn && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // 3. ถ้า Login แล้ว และพยายามเข้าหน้า Login -> ให้ไปหน้า Dashboard
  if (isLoggedIn && isPublicPage) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

// กำหนดขอบเขตให้ครอบคลุมทุกหน้า รวมถึงหน้าแรก (/)
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};