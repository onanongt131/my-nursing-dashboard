import type { NextConfig } from "next";

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true, // ข้ามการตรวจสอบ TS
  },
  eslint: {
    ignoreDuringBuilds: true, // ข้ามการตรวจสอบ ESLint
  },
  // ป้องกันไม่ให้ Next.js พยายามเชื่อมต่อ DB ตอน Build
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
};

export default nextConfig;