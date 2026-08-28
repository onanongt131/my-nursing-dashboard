'use client';

import React from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';

export default function WorkforceDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
        
        <div className="mt-6 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
            <h2 className="text-xl font-bold text-emerald-900">วิเคราะห์อัตรากำลังและภาระงาน</h2>
            <p className="text-sm text-gray-500 mt-1">ประเมินความพอเพียงของบุคลากร ค่า Productivity, PCS และสัดส่วน Skill Mix</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-bold text-gray-800 mb-4">ภาพรวมอัตรากำลังรายหอผู้ป่วย</h3>
            <p className="text-sm text-gray-400">กำลังพัฒนากราฟแสดงผล Productivity และ Skill Mix...</p>
          </div>
        </div>
      </div>
  );
}