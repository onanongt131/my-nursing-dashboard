'use client';

import React from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';

export default function PeopleExcellenceDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
        <div className="mt-6 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
            <h2 className="text-xl font-bold text-emerald-900">พัฒนาการสมรรถนะและความผูกพันบุคลากร</h2>
            <p className="text-sm text-gray-500 mt-1">ติดตามผล Competency, แผนพัฒนาบุคลากรรายบุคคล (IDP) และคะแนน Engagement</p>
          </div>
        </div>
      </div>
  );
}