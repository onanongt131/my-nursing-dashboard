import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

console.log("Check Service Role Key:", process.env.SUPABASE_SERVICE_ROLE_KEY); // เพิ่มบรรทัด

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // ✂️ ตัดระบบ adapter ออก เพื่อให้ระบบใช้ JWT Session ร่วมกับ Credentials ได้เสถียร 100% บน Vercel
  session: { strategy: "jwt" }, 
  providers: [
    Credentials({
      async authorize(credentials) {
        // 1. ตรวจสอบผ่าน Supabase Auth โดยตรง
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email as string,
          password: credentials.password as string,
        });

        if (error || !data.user) return null;

        // 2. ดึงข้อมูล profile ข้อมูลชื่อ/แผนกมาประกอบ
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        return { 
          id: data.user.id, 
          email: data.user.email, 
          name: profile?.full_name || profile?.name || "พนักงานสาธารณสุข"
        };
      },
    }),
  ],
  callbacks: {
    // 🛡️ ปลั๊กอินควบคุมสิทธิ์สำหรับแอปพลิเคชัน KPI ของคุณ
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      // ถ้าจะเข้าสู่หน้าแดชบอร์ดระบบจัดสิทธิ์ แต่ไม่มี Token ให้เด้งไปหน้า /login
      if (pathname.startsWith("/dashboard")) {
        if (isLoggedIn) return true;
        return false; 
      }

      // ถ้าล็อกอินเสร็จแล้วแต่แอบมากดเข้าหน้า /login ให้ดีดเข้าหน้าหลักของแดชบอร์ด
      if (pathname.startsWith("/login") && isLoggedIn) {
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    }
  }
});
