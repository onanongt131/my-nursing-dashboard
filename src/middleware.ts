import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server"; // 1. Import NextRequest เข้ามา

// 2. ระบุ Type ให้ req เป็น NextRequest
export default auth((req: NextRequest) => { 
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

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
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};