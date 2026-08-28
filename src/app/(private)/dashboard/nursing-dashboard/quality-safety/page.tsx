'use client';

import React from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';

export default function QualitySafetyDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
        <div className="mt-6 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
            <h2 className="text-xl font-bold text-emerald-900">วิเคราะห์จุดเสี่ยงและอุบัติการณ์ความปลอดภัย</h2>
            <p className="text-sm text-gray-500 mt-1">ติดตามอุบัติการณ์สำคัญ ความคลาดเคลื่อนทางยา และจุดเสี่ยงในกระบวนการพยาบาล</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-sm font-medium text-gray-500">อุบัติการณ์รวมเดือนนี้</span>
              <p className="text-3xl font-extrabold text-amber-600 mt-2">12 <span className="text-sm font-normal text-gray-400">ครั้ง</span></p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-sm font-medium text-gray-500">ระดับความรุนแรง A-B</span>
              <p className="text-3xl font-extrabold text-emerald-600 mt-2">10 <span className="text-sm font-normal text-gray-400">ครั้ง</span></p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-sm font-medium text-gray-500">ระดับความรุนแรง C ขึ้นไป</span>
              <p className="text-3xl font-extrabold text-rose-600 mt-2">2 <span className="text-sm font-normal text-gray-400">ครั้ง</span></p>
            </div>
          </div>
        </div>
      </div>
  );
}