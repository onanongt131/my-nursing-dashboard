import type { NextConfig } from "next";

const nextConfig = {
  typescript: {
    // ระวัง: วิธีนี้จะทำให้การ Build ผ่านแม้จะมี Type Error
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
