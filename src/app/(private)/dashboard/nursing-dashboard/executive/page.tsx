'use client';

import React from 'react';
import Link from 'next/link';

export default function ExecutiveDashboardPage() {
  return (
    <div className="space-y-6 pb-12">
      {/* ส่วนหัวข้อ */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/nursing-dashboard" className="text-sm text-emerald-700 hover:underline">
              &larr; กลับหน้า Nursing Dashboard Hub
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">1. Executive Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">ภาพรวมองค์กรตอนนี้เป็นอย่างไร (สรุปตัวชี้วัดสำคัญระดับองค์กร)</p>
        </div>
        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl">
          Real-time Data
        </span>
      </div>

      {/* ส่วนแสดงเนื้อหาแดชบอร์ด */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-emerald-100 text-center py-16">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          📊
        </div>
        <h3 className="text-lg font-bold text-gray-800">กำลังพัฒนาระบบแสดงผล Executive Dashboard</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
          หน้านี้กำลังเชื่อมต่อฐานข้อมูลตัวชี้วัดระดับองค์กร อัตราครองเตียง และสถิติสำคัญ สามารถเพิ่ม Widget กราฟข้อมูลได้ที่นี่
        </p>
      </div>
    </div>
  );
}