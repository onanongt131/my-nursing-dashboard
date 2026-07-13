'use client';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CheckCircle2, XCircle, LayoutDashboard } from 'lucide-react';

const COLORS = ['#22c55e', '#ef4444']; 

export default function DashboardHeader({ stats }: { stats: { passed: number, total: number, failed: number } }) {
  // ตรวจสอบค่าก่อนคำนวณป้องกัน division by zero
  const total = Math.max(0, stats.total);
  const passed = Math.max(0, stats.passed);
  const failed = Math.max(0, stats.failed);
  const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;

  const pieData = [
    { name: 'ผ่าน', value: passed }, 
    { name: 'ไม่ผ่าน', value: failed }
  ];

  return (
    <div className="mb-8 p-6 bg-white rounded-2xl border shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-purple-100 rounded-xl">
          <LayoutDashboard className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">กลุ่มภารกิจด้านการพยาบาล</h1>
          <p className="text-sm text-gray-500">ผลการติดตามตัวชี้วัดภาพรวม ({total} รายการ)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI ทั้งหมด */}
        <div className="bg-gray-50 border rounded-xl p-6 flex flex-col items-center justify-center">
          <p className="text-gray-500 font-medium text-sm">ตัวชี้วัดทั้งหมด</p>
          <p className="text-4xl font-black text-gray-800 mt-2">{total}</p>
        </div>

        {/* ผ่าน/ไม่ผ่าน */}
        <div className="bg-gray-50 border rounded-xl p-6 flex items-center justify-around">
          <div className="flex flex-col items-center gap-1 text-green-600">
            <span className="text-sm font-semibold">ผ่านเกณฑ์</span>
            <div className="flex items-center gap-2 text-2xl font-bold">
              <CheckCircle2 className="w-6 h-6" /> {passed}
            </div>
          </div>
          <div className="w-px h-8 bg-gray-300" />
          <div className="flex flex-col items-center gap-1 text-red-600">
            <span className="text-sm font-semibold">ไม่ผ่านเกณฑ์</span>
            <div className="flex items-center gap-2 text-2xl font-bold">
              <XCircle className="w-6 h-6" /> {failed}
            </div>
          </div>
        </div>

        {/* สัดส่วน (Gauge Chart) */}
        <div className="bg-gray-50 border rounded-xl p-4 flex items-center justify-center relative overflow-hidden">
          <div className="h-32 w-full relative">
            <ResponsiveContainer width="100%" height="150%">
              <PieChart>
                <Pie
                  data={total > 0 ? pieData : [{ value: 1 }]}
                  startAngle={180} endAngle={0} 
                  innerRadius={50} outerRadius={70}
                  paddingAngle={5} dataKey="value" cx="50%" cy="85%"
                >
                  {total > 0 
                    ? pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />) 
                    : <Cell fill="#e5e7eb" />
                  }
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-0 w-full text-center mt-[-10px]">
              <span className="text-2xl font-black text-gray-800">{percentage}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}