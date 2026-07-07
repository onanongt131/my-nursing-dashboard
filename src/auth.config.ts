// src/auth.config.ts
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [], // ใส่ providers ตรงนี้ได้ แต่ห้ามใส่ adapter
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublicPage = ["/login", "/register"].includes(nextUrl.pathname);
      if (!isLoggedIn && !isPublicPage) return false; // Redirect ไป login
      return true;
    },
  },
} satisfies NextAuthConfig;