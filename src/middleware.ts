import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { auth } from '@/auth';

// 1. แยก Middleware ออกมาเป็นฟังก์ชันชื่อ middleware ตรงๆ ตามที่ Next.js คาดหวัง
export async function middleware(request: NextRequest) {
  // เรียกใช้ auth() และรับ response
  return await auth((req: any) => {
    // ใส่ Logic ของคุณที่นี่ (ถ้ามี)
    return NextResponse.next();
  })(request);
}

// 2. กำหนด matcher (ห้ามลืม)
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};