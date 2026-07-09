import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  const token = await getToken({ req, secret });
  const { pathname } = req.nextUrl;

  // 1. ทางด่วน: อนุญาตให้ผ่านสำหรับไฟล์ระบบและกระบวนการ Auth
  // การข้ามการตรวจสอบสำหรับ /api/auth เป็นสิ่งที่ "บังคับต้องมี"
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api/auth') || 
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 2. ถ้ายังไม่มี token และไม่ได้อยู่ที่หน้า login ให้ไป login
  if (!token && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 3. ถ้ามี token แล้ว แต่พยายามเข้าหน้า login ให้ไป dashboard
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}