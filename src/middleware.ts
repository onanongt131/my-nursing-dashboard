import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;
  
  const isPublicPage = [
    "/login", 
    "/register", 
    "/forgot-password", 
    "/update-password"
  ].includes(nextUrl.pathname);

  // ถ้า Login แล้วและพยายามเข้าหน้า Login ให้เด้งไป Dashboard
  if (isLoggedIn && isPublicPage) {
    return Response.redirect(new URL("/dashboard", nextUrl));
  }

  // ถ้าไม่ได้ Login และเข้าหน้าที่ไม่ใช่หน้า Public ให้เด้งไปหน้า Login
  if (!isLoggedIn && !isPublicPage) {
    return Response.redirect(new URL("/login", nextUrl));
  }

  // อนุญาตให้ผ่าน
  return; 
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};