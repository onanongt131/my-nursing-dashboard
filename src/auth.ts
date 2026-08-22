import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        // 1. ตรวจสอบรหัสผ่านและตัวตนผ่าน Supabase Auth โดยตรง (เช็คใน auth.users ให้อัตโนมัติ)
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error || !data.user) {
          throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        }

        // 2. ดึงข้อมูล profile มาเช็คสถานะการอนุมัติ (status)
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        if (profileError || !profile) {
          throw new Error("ไม่พบข้อมูลโปรไฟล์ในระบบ");
        }

        // 3. 🔥 ตรวจสอบสถานะการอนุมัติ
        if (profile.status !== 'approved') {
          throw new Error("UNAPPROVED_USER");
        }

        // 4. คืนค่าข้อมูลผู้ใช้เมื่อผ่านทุกเงื่อนไข
        return { 
          id: data.user.id, 
          email: data.user.email, 
          name: profile.full_name || "พนักงานสาธารณสุข",
          role: profile.role 
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
    // src/auth.ts (ใน callback authorized)
async authorized({ auth, request: { nextUrl } }) {
  const isLoggedIn = !!auth?.user;
  const { pathname } = nextUrl;

  // 1. กำหนดหน้า PUBLIC ที่ใครก็เข้าได้ (ไม่ต้อง Login)
  const publicPaths = ["/dashboard", "/dashboard/committee", "/dashboard/nursing"];
  const isPublicPage = publicPaths.some(path => pathname === path || pathname.startsWith(path + "/"));

  if (isPublicPage) {
    return true; // อนุญาตให้เข้าได้เลย
  }

  // 2. ถ้าไม่ใช่หน้า Public (เช่น category, productivity, departments) ต้อง Login เท่านั้น
  if (isLoggedIn) return true;
  
  return false; // ดีดไปหน้า Login
}
  }
});