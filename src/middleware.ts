import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // 1. กำหนดหน้า Public ที่ไม่ต้อง Login (รวมหน้าหลักและหน้าย่อยของมัน)
  const isPublicPage = 
    pathname === "/dashboard" ||
    pathname === "/dashboard/staffing/inspection-report/" || 
    pathname.startsWith("/dashboard/committee") || 
    pathname.startsWith("/dashboard/nursing");

  // ถ้าเป็นหน้า Public ให้ปล่อยผ่านทันที ไม่ต้องเช็ค Login
  if (isPublicPage) {
    return NextResponse.next();
  }

  // 2. ถ้าเข้าหน้าอื่นใน /dashboard ที่ไม่ใช่ Public และยังไม่ได้ Login ให้ดีดไป /login
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};