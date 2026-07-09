import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  const token = await getToken({ req, secret });
  const { pathname } = req.nextUrl;

  // 1. อนุญาตให้ผ่านสำหรับหน้า Login, Register และ API Auth
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  // 2. ถ้าไม่มี Token ให้ส่งกลับหน้า Login
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 3. ถ้ามี Token ให้ผ่านไปได้
  return NextResponse.next();
}