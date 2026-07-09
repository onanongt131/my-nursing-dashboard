/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // ปิดการเช็ค Type ตอน build
    ignoreBuildErrors: true,
  },
  eslint: {
    // ปิดการเช็ค ESLint ตอน build
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;