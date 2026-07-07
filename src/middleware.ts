import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server"; // นำเข้า NextRequest มาช่วย

// ระบุ Type ให้ req เป็นประเภทที่รวม auth เข้าไปด้วย
export default auth((req: NextRequest & { auth: any }) => { 
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth; // ตอนนี้ TypeScript จะไม่บ่นแล้วครับ

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