import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  const token = await getToken({ req, secret });
  const { pathname } = req.nextUrl;

  // ทางด่วน: ห้ามบล็อกส่วนเหล่านี้เด็ดขาด
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api/auth') || 
    pathname === '/login' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // ถ้าไม่มี token ให้เด้งไป login
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // ถ้ามี token ให้ผ่านไปได้
  return NextResponse.next();
}