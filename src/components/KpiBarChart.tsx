'use client';

import dynamic from 'next/dynamic';

// Import ทุก component ที่ใช้งานในไฟล์นี้แบบ dynamic
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ReferenceLine = dynamic(() => import('recharts').then(mod => mod.ReferenceLine), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const LabelList = dynamic(() => import('recharts').then(mod => mod.LabelList), { ssr: false });

export default function KpiBarChart({ data, targetValue }: { data: any[], targetValue: number }) {
  const sortedData = [...data].sort((a, b) => a.year - b.year);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sortedData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="year" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
          <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} />
          <Tooltip cursor={{fill: '#f3f4f6'}} />
          
          <ReferenceLine y={targetValue} stroke="#ef4444" strokeWidth={2} strokeDasharray="3 3" />
          
          <Bar dataKey="value" fill="#5D8AA8" radius={[4, 4, 0, 0]} barSize={40}>
            <LabelList dataKey="value" position="top" style={{fill: '#4b5563', fontSize: 12}} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}