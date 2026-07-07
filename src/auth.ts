export const { handlers, signIn, signOut, auth } = NextAuth({
  // ... providers ของคุณ
  session: { strategy: "jwt" }, // ต้องมีบรรทัดนี้
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.profile = user;
      return token;
    },
    async session({ session, token }) {
      session.user = token.profile as any;
      return session;
    },
    // ลบ authorized callback ออกถ้าคุณใช้ middleware.ts จัดการแล้ว
  },
});