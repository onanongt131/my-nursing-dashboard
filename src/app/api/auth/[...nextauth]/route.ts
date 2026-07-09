import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";

export const authOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID as string,
      clientSecret: process.env.AUTH_GITHUB_SECRET as string,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET, // ต้องมีค่านี้ที่ตั้งไว้ใน Vercel ด้วย!
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };