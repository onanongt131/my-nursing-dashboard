'use client';

import React from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';

export default function ActionRiskDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
        <div className="mt-6 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
            <h2 className="text-xl font-bold text-emerald-900">ติดตามประเด็นข้อเสนอแนะและกำหนดเวลาแก้ไข</h2>
            <p className="text-sm text-gray-500 mt-1">รายการที่ต้องปรับปรุง ผู้รับผิดชอบหลัก และกำหนดเวลาแล้วเสร็จ (Due Date)</p>
          </div>
        </div>
      </div>
  );
}