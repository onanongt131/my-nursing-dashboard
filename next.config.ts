import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // หากต้องการข้าม Type Error ให้เก็บไว้แค่บรรทัดนี้
  typescript: {
    ignoreBuildErrors: true,
  },
  // ลบส่วน eslint ออกไปเลยครับ
};

export default nextConfig;