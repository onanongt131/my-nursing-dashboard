'use client';
import dynamic from 'next/dynamic';

// โหลด components เหมือนเดิม (ดีแล้วครับ)
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ReferenceLine = dynamic(() => import('recharts').then(mod => mod.ReferenceLine), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const LabelList = dynamic(() => import('recharts').then(mod => mod.LabelList), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });

export default function KpiBarChart({ data, targetValue }: { data: any[], targetValue: number }) {
  // เรียงลำดับปีให้ถูกต้องเสมอ (ป้องกันกรณีปีเป็น string)
  const sortedData = [...data].sort((a, b) => parseInt(a.year) - parseInt(b.year));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sortedData} margin={{ top: 30, right: 30, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis dataKey="year" tick={{fontSize: 12, fill: '#9ca3af'}} tickLine={false} axisLine={false} />
          <YAxis tick={{fontSize: 12, fill: '#9ca3af'}} tickLine={false} axisLine={false} />
          
          <Tooltip 
            cursor={{fill: '#f9fafb'}} 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            formatter={(value: any) => [value ?? 'ยังไม่มีข้อมูล', 'ผลงาน']}
          />
          
          <ReferenceLine y={targetValue} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" label={{ value: 'เป้าหมาย', position: 'right', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
          
          <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
            {sortedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                // ใช้สีเทาถ้าไม่มีข้อมูล (null), เขียวถ้าผ่าน, แดงถ้าไม่ผ่าน
                fill={entry.value === null ? '#e5e7eb' : (entry.value >= targetValue ? '#22c55e' : '#ef4444')} 
              />
            ))}
            <LabelList 
              dataKey="value" 
              position="top" 
              style={{fill: '#4b5563', fontSize: 11, fontWeight: 600}} 
              formatter={(value: any) => value ?? ''} // ไม่แสดงเลข 0 ถ้าไม่มีข้อมูล
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}