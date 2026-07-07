import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: any) => {
  const isLoggedIn = !!req.auth;
  console.log("DEBUG: Is Logged In?", isLoggedIn); // เช็ค Log ใน Vercel

  const { nextUrl } = req;
  const isPublicPage = ["/login", "/register"].includes(nextUrl.pathname);

  if (!isLoggedIn && !isPublicPage) {
    console.log("DEBUG: Redirecting to login...");
    return NextResponse.redirect(new URL("/login", nextUrl));
  }
  
  return NextResponse.next();
});

export const config = {
  // ลองเปลี่ยนเป็นแบบนี้ดูครับ ให้ครอบคลุมทุกอย่าง ยกเว้น static files
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};