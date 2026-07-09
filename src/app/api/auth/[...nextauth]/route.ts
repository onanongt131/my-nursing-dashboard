import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";

const handler = NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID as string,
      clientSecret: process.env.AUTH_GITHUB_SECRET as string,
    }),
  ],
  // ใส่บรรทัดนี้ให้ชัดเจน
  secret: process.env.NEXTAUTH_SECRET, 
  pages: {
    signIn: "/login",
  },
});

export { handler as GET, handler as POST };