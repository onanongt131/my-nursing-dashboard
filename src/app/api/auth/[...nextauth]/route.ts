import NextAuth from "next-auth";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import GitHub from "next-auth/providers/github";

const handler = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  secret: process.env.AUTH_SECRET, // สำคัญมาก
  session: { strategy: "jwt" },
  callbacks: {
    // เพิ่มส่วนนี้เพื่อช่วยให้ Session ทำงานเสถียรขึ้น
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };