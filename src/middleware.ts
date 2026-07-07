import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req:any) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // จัดการเฉพาะกรณี Login
  const isPublicPage = ["/login"].includes(nextUrl.pathname);

  if (!isLoggedIn && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // matcher แบบนี้ปลอดภัยที่สุดสำหรับการใช้งานทั่วไป
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};