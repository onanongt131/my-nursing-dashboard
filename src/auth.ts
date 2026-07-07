import { NextAuthOptions } from "next-auth"; // เพิ่มบรรทัดนี้หากจำเป็น
import { JWT } from "next-auth/jwt";
import { User } from "next-auth";

// 1. แยกคอนฟิกออกมาเป็นตัวแปร เพื่อให้มั่นใจว่า NextAuth ทำงานได้สมบูรณ์
const authConfig = {
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
    async jwt({ token, user }: { token: JWT; user: User | undefined }) { // <--- ระบุ Type ตรงนี้
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: JWT }) { // <--- ระบุ Type ตรงนี้
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
} satisfies NextAuthOptions; // เพิ่ม satisfies ถ้าโปรเจกต์รองรับ

// 2. Destructure ออกมาให้ชัดเจน
export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);