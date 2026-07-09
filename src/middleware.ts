// src/middleware.ts
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  // ดึงค่า secret ให้ยืดหยุ่นขึ้น
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  
  const token = await getToken({ req, secret });
  const { pathname } = req.nextUrl;

  // ถ้ายังไม่มี token และไม่ได้อยู่ที่หน้า login ให้ไปหน้า login
  if (!token && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // ถ้ามี token แล้ว แต่พยายามเข้าหน้า login ให้ไป dashboard
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}