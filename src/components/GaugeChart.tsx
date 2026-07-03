'use client';

import dynamic from 'next/dynamic';

// Import คอมโพเนนต์ที่ใช้งานทั้งหมดจาก recharts แบบ dynamic
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });

const COLORS = ['#22c55e', '#ef4444'];

export default function GaugeChart({ stats }: { stats: { passed: number, total: number } }) {
  const pieData = [
    { name: 'ผ่าน', value: stats.passed },
    { name: 'ไม่ผ่าน', value: stats.total - stats.passed },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
      <h3 className="text-center font-medium text-gray-600 mb-4">สัดส่วนการผ่านเกณฑ์</h3>
      <div className="h-40 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={stats.total > 0 ? pieData : [{ value: 1 }]}
              startAngle={180}
              endAngle={0}
              innerRadius={65}
              outerRadius={85}
              paddingAngle={5}
              dataKey="value"
              cx="50%"
              cy="100%"
              stroke="none"
            >
              {stats.total > 0 ? (
                pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index]} />)
              ) : (
                <Cell fill="#e5e7eb" />
              )}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-8">
          <p className="text-sm text-gray-500 font-medium">ผ่านเกณฑ์</p>
          <span className="text-3xl font-bold">
            {stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0}%
          </span>
        </div>
      </div>
    </div>
  );
}