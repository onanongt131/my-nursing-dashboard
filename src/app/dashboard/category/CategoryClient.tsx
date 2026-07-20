// app/dashboard/category/CategoryClient.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient'; // ปรับ path ให้ตรงกับที่เก็บไฟล์
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import AddEntryForm from '@/components/AddEntryForm'; // ปรับ path ให้ตรง
import { calculateYearlyAverage, checkStatus, getYearlyTrend, getButtonStyle } from '@/utils/kpiCalculations'; // ปรับ path ให้ตรง

export default function CategoryClient({ category }: { category: string }) {
  const [kpis, setKpis] = useState<any[]>([]);
  const [selectedKpi, setSelectedKpi] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('kpis')
      .select('*, kpi_entries(*)')
      .eq('category', category);
    
    if (data) setKpis(data);
    setLoading(false);
  }, [category]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>;

  return (
  <div className="space-y-6 animate-in fade-in duration-500">
    {!selectedKpi ? (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            ตัวชี้วัด: <span className="text-purple-600">{category}</span>
          </h2>
          <span className="text-sm text-gray-400">แสดงผลข้อมูลย้อนหลัง 5 ปี</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="p-4 text-gray-600 text-sm font-bold min-w-[200px]">ตัวชี้วัด (KPI)</th>
                <th className="p-4 text-center text-gray-600 text-sm font-bold">Goal</th>
                {[2565, 2566, 2567, 2568, 2569].map(y => (
                  <th key={y} className="p-4 text-center text-gray-600 text-sm font-bold">{y}</th>
                ))}
                <th className="p-4 text-center text-gray-600 text-sm font-bold">TREND</th>
                <th className="p-4 text-center text-gray-600 text-sm font-bold">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {kpis.map((kpi: any) => (
                <tr key={kpi.id} className="hover:bg-purple-50/30 transition-all">
                  <td className="p-4 text-gray-700 font-medium">{kpi.name}</td>
                  <td className="p-4 text-center text-sm font-bold text-gray-500">
                    {kpi.operator} {kpi.target_value}
                  </td>
                  {[2565, 2566, 2567, 2568, 2569].map((year) => {
                    const avg = calculateYearlyAverage(kpi.kpi_entries || [], year, kpi.Type);
                    const hasData = avg !== null && avg !== "-" && Number(avg) !== 0;
                    const pass = hasData ? checkStatus(Number(avg), kpi.target_value, kpi.operator) : false;

                    return (
                      <td key={year} className="p-4 text-center">
                        {hasData ? (
                          <span className={`px-2.5 py-1 rounded-md font-bold text-sm ${pass ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                            {avg}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 italic">ไม่มีข้อมูล</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-4 text-center text-lg">{getYearlyTrend(kpi.kpi_entries || [], kpi.Type)}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => setSelectedKpi(kpi)} 
                      className="px-4 py-1.5 bg-white border border-purple-200 text-purple-600 rounded-lg text-xs font-bold hover:bg-purple-50 transition-colors"
                    >
                      เพิ่ม
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ) : (

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <button onClick={() => setSelectedKpi(null)} className="mb-4 text-purple-600 font-bold text-sm">← ย้อนกลับ</button>
            <div className="absolute top-4 right-4 bg-red-50 border border-red-100 p-2 rounded-xl">
                <span className="text-[10px] text-red-600 font-bold uppercase">Goal</span>
                <span className="text-[10px] font-black text-red-700">{selectedKpi.operator} {selectedKpi.target_value}</span>
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-6">{selectedKpi.name}</h3>
            <ResponsiveContainer height={250} width="100%">
              <BarChart data={[2565, 2566, 2567, 2568, 2569].map(y => ({
                year: y,
                value: parseFloat(calculateYearlyAverage(selectedKpi.kpi_entries || [], y, selectedKpi.Type).toString()) || 0
              }))}>
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="value" fill="#818cf8" radius={[6, 6, 0, 0]} barSize={40} />
                <ReferenceLine y={selectedKpi.target_value} stroke="#f87171" strokeDasharray="3 3" label={{ value: 'Target', position: 'insideTopRight', fill: '#f87171', fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-6">บันทึกผลการดำเนินงาน</h3>
            <AddEntryForm kpiId={selectedKpi.id} type={selectedKpi.Type} onSuccess={() => { setSelectedKpi(null); fetchData(); }} />
          </div>
        </div>
    )}
  </div>
);
}