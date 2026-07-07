import { auth } from "@/auth";
import type { NextRequest } from "next/server"; // Import เพิ่ม

export default auth((req: NextRequest & { auth: any }) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // 1. ระบุหน้า Public ที่ไม่ต้อง Login
  const isPublicPage = ["/login", "/register"].includes(nextUrl.pathname);

  // 2. ถ้าไม่ได้ Login และเข้าหน้าที่ไม่ใช่ Public -> ไปที่ Login
  if (!isLoggedIn && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // 3. ถ้า Login แล้ว และเข้าหน้า Login -> ไปที่หน้าแรก/Dashboard
  if (isLoggedIn && isPublicPage) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};