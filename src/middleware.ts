import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req: any) => { // ใช้ any ตรงนี้เพื่อจบปัญหาเรื่อง type ได้ทันที
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