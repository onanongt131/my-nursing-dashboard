'use client';
import { useState } from 'react';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList } from 'recharts';
import AddEntryForm from '@/components/AddEntryForm';

export default function ClientDepartmentView({ initialKpis }: { initialKpis: any[] }) {
  const [kpis, setKpis] = useState(initialKpis);

  // สรุปข้อมูลสำหรับกราฟ (Logic เดิมของคุณ)
  const getChartData = (kpi: any) => {
    const years = [2565, 2566, 2567, 2568, 2569];
    return years.map(year => {
      const entries = kpi.kpi_entries?.filter((e: any) => e.year === year) || [];
      const val = entries.reduce((sum: number, e: any) => sum + (e.value || 0), 0);
      return { name: `ปี ${year}`, value: parseFloat(val.toFixed(2)) };
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {kpis.map((kpi: any) => (
        <div key={kpi.id} className="bg-white p-6 rounded-3xl shadow-sm border">
          <h2 className="text-xl font-bold mb-6">{kpi.name}</h2>
          <div className="h-64 w-full mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={getChartData(kpi)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#4a76a8" barSize={40}>
                  <LabelList dataKey="value" position="top" />
                </Bar>
                <ReferenceLine y={kpi.target_value || 40} stroke="red" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <AddEntryForm kpiId={kpi.id} type={kpi.Type} onSuccess={() => window.location.reload()} />
        </div>
      ))}
    </div>
  );
}