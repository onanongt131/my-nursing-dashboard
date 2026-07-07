import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";

// 1. ดึงค่าตัวแปรโดยไม่มี ! (และไม่ต้องรีบเรียก createClient)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 2. สร้าง Function เพื่อดึง Client (Lazy Initialization) 
// เพื่อให้แน่ใจว่ามันจะทำงานเฉพาะตอนที่แอปทำงานจริง (Runtime) เท่านั้น
const getSupabase = () => {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
};

const getAdminSupabase = () => {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        // ดึง client ออกมาใช้งานภายในฟังก์ชัน (Runtime)
        const supabase = getSupabase();
        const adminSupabase = getAdminSupabase();
        
        if (!supabase || !adminSupabase) {
            console.error("Supabase client not initialized");
            return null;
        }

        if (!credentials?.email || !credentials?.password) {
            return null;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email as string,
            password: credentials.password as string,
        });

        if (error) return null;

        // เรียกใช้ adminSupabase ตรงนี้ได้เลย
        const { data: profile, error: profileError } = await adminSupabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) return null;

        return {
            id: data.user.id,
            email: data.user.email,
            ...profile,
        };
      }
    }),
  ],
  // ... callbacks และ configuration ที่เหลือเหมือนเดิม
  callbacks: {
     // (คงเดิมไว้ได้เลยครับ)
     async jwt({ token, user }) {
        if (user) { token.profile = user; }
        return token;
     },
     async session({ session, token }) {
        session.user = token.profile as any;
        return session;
     },
     authorized({ auth, request: { nextUrl } }) {
        const isLoggedIn = !!auth?.user;
        const isLoginPage = nextUrl.pathname === "/login";
        if (isLoggedIn && isLoginPage) { return Response.redirect(new URL("/", nextUrl)); }
        return isLoggedIn;
     },
  },
});