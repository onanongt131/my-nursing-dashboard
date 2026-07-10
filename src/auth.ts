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
  
  providers: [
    Credentials({
      async authorize(credentials) {
        // 1. ตรวจสอบผ่าน Supabase Auth โดยตรง (ไม่ต้อง Query ตาราง profiles เพื่อหา password)
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email as string,
          password: credentials.password as string,
        });

        if (error || !data.user) return null;

        // 2. ถ้าผ่านแล้ว ค่อยไปดึงข้อมูล profile (ชื่อ/แผนก) จากตาราง profiles มาประกอบ
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        return { id: data.user.id, email: data.user.email, name: profile?.full_name };
      },
    }),
  ],
});