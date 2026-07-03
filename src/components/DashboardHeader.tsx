'use client';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CheckCircle2, XCircle } from 'lucide-react';

const COLORS = ['#22c55e', '#ef4444']; 

export default function DashboardHeader({ stats }: { stats: { passed: number, total: number, failed: number } }) {
  const pieData = [{ name: 'ผ่าน', value: stats.passed }, { name: 'ไม่ผ่าน', value: stats.failed }];

  return (
    <div className="mb-8">
      {/* ส่วนหัวที่ปรับปรุงให้เหมือน DashboardPage */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">กลุ่มภารกิจด้านการพยาบาล</h1>
        <p className="text-gray-500 mt-2">ผลการติดตามตัวชี้วัดภาพรวม ({stats.total} ตัวชี้วัด)</p>
      </div>

      {/* ส่วน Grid แสดงสถิติ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* กล่อง 1: KPI ทั้งหมด */}
        <div className="border border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-white">
          <p className="text-gray-500 font-medium">KPI ทั้งหมด</p>
          <p className="text-5xl font-bold text-purple-600 mt-2">{stats.total}</p>
        </div>

        {/* กล่อง 2: ผ่าน/ไม่ผ่าน */}
        <div className="border border-gray-300 rounded-lg p-6 flex items-center justify-center gap-12 bg-white">
          <div className="flex items-center gap-3 text-3xl font-bold text-green-600">
            <CheckCircle2 className="w-10 h-10" />
            <span>{stats.passed}</span>
          </div>
          <div className="flex items-center gap-3 text-3xl font-bold text-red-600">
            <XCircle className="w-10 h-10" />
            <span>{stats.failed}</span>
          </div>
        </div>

        {/* กล่อง 3: สัดส่วนการผ่านเกณฑ์ */}
        <div className="border border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-white relative">
          <p className="text-gray-500 font-medium mb-2">สัดส่วนการผ่านเกณฑ์</p>
          <div className="h-24 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.total > 0 ? pieData : [{ value: 1 }]}
                  startAngle={180} endAngle={0} innerRadius={60} outerRadius={80}
                  paddingAngle={5} dataKey="value" cx="50%" cy="100%" stroke="none"
                >
                  {stats.total > 0 ? pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />) : <Cell fill="#e5e7eb" />}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute bottom-0 w-full text-center">
              <span className="text-3xl font-bold text-black">
                {stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}