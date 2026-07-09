import NextAuth from "next-auth";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { createClient } from "@supabase/supabase-js"; // ใช้ Supabase SDK
import bcrypt from "bcryptjs";

// สร้าง Supabase Client สำหรับตรวจสอบข้อมูล
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;
        // 1. ค้นหา user จาก table 'users' (หรือชื่อตารางที่คุณใช้ใน Supabase)
        const { data: user, error } = await supabase
          .from("profiles") // เปลี่ยนจาก "users" เป็น "profiles"
          .select("*")
          .eq("email", email) // ตรวจสอบว่าในตาราง profiles มีคอลัมน์ email หรือยัง?
          .single();

        if (error || !user) return null;

        // ตรวจสอบรหัสผ่าน (ต้องมั่นใจว่าในตาราง profiles มีคอลัมน์ password ที่เก็บแบบ hash)
        const passwordsMatch = await bcrypt.compare(password, user.password);
        if (!passwordsMatch) return null;

        return { id: user.id, email: user.email };
      },
    }),
  ],
});