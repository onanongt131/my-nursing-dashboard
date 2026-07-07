"use client"; // ถูกต้องแล้วครับ

import Link from "next/link"; // แก้ไขจุดนี้ครับ (ต้องนำเข้า Link)

export default function BackButton() {
  return (
    <Link 
      href="/" 
      className="inline-flex items-center text-gray-500 hover:text-indigo-400 transition duration-200 mb-6 font-medium"
    >
      <span className="text-4xl mr-3 inline-block transform scale-x-50">←</span> 
      กลับหน้าหลัก
    </Link>
  );
}