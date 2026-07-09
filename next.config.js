/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // ปิดการเช็ค Type ตอน build
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;