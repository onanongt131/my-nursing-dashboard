import NextAuth from "next-auth";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import GitHub from "next-auth/providers/github";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  }),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID ?? "",
      clientSecret: process.env.AUTH_GITHUB_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // 3. ใช้การเช็คแบบปลอดภัยขึ้น
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
      }
      return session;
    },
  },
  // 4. การใช้ AUTH_SECRET ใน NextAuth v5+ จะถูกดึงจาก .env โดยตรงอยู่แล้ว
  // แต่การระบุไว้ที่นี่ก็ช่วยให้มั่นใจได้ครับ
  secret: process.env.AUTH_SECRET,
});