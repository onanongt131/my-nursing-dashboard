import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;
  
  const isPublicPage = [
    "/login", "/register", "/forgot-password", "/update-password"
  ].includes(nextUrl.pathname);

  // ถ้าเข้าหน้า Dashboard แต่ยังไม่ได้ Login
  if (!isLoggedIn && nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // ถ้า Login แล้วและพยายามเข้าหน้า Login
  if (isLoggedIn && isPublicPage) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};