import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        console.log("DEBUG: authorize function start"); // <--- ตรงนี้สำคัญ
        if (!credentials?.email || !credentials?.password) {
            console.log("DEBUG: Missing email/password");
            return null;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email as string,
            password: credentials.password as string,
        });

        if (error) {
            console.log("DEBUG: Auth error:", error.message);
            return null;
        }

        console.log("DEBUG: User login success, ID:", data.user.id);

        const { data: profile, error: profileError } = await adminSupabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.log("DEBUG: Profile fetch error:", profileError.message);
            return null;
        }

        console.log("DEBUG: Profile found, success!");
        return {
            id: data.user.id,
            email: data.user.email,
            ...profile,
        };
      }
    }),
  ],
  callbacks: {
    // 1. นำข้อมูลจาก authorize มาใส่ใน token
    async jwt({ token, user }) {
      if (user) {
        token.profile = user;
      }
      return token;
    },
    // 2. นำข้อมูลจาก token มาใส่ใน session
    async session({ session, token }) {
      session.user = token.profile as any;
      return session;
    },
    // 3. ตัวนี้คือ Guard (Middleware)
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === "/login";

      if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL("/", nextUrl));
      }
      return isLoggedIn; // คืนค่า boolean ได้เลย
    },
  },
});