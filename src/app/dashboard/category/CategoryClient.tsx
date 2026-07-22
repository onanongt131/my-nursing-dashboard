// app/dashboard/category/CategoryClient.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import AddEntryForm from '@/components/AddEntryForm'; 
import { calculateYearlyAverage, checkStatus, getYearlyTrend, getButtonStyle } from '@/utils/kpiCalculations'; 

export default function CategoryClient({ category }: { category: string }) {
  const supabase = createClient();
  const [kpis, setKpis] = useState<any[]>([]);
  const [selectedKpi, setSelectedKpi] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. ดึงข้อมูล User และ Profile ปัจจุบัน พร้อม join ตาราง departments
      const { data: { user } } = await supabase.auth.getUser();
      let userProfile = null;

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*, departments(group)')
          .eq('id', user.id)
          .maybeSingle();
        userProfile = data;
      }

      // 2. ดึงข้อมูล KPIs ทั้งหมดเฉพาะหมวดนี้
      const { data: allKpis, error: kpiError } = await supabase
        .from('kpis')
        .select('*, kpi_entries(*)')
        .eq('category', category);
      
      if (kpiError) {
        console.error("Error fetching KPIs by category:", kpiError.message);
      }

      if (allKpis) {
        let filtered = allKpis.filter((k: any) => k.departments_id === null);

        if (userProfile && userProfile.role) {
          const role = userProfile.role;
          const userDeptId = userProfile.department_id;
          const userGroup = (userProfile.departments as any)?.group;

          if (role === 'staff') {
            filtered = allKpis.filter((k: any) => k.departments_id === userDeptId);
          } 
          else if (role === 'head_department') {
            filtered = allKpis.filter((k: any) => k.departments_id === userDeptId);
          } 
          else if (role === 'head_group' && userGroup) {
            const { data: deptsInGroup } = await supabase
              .from('departments')
              .select('id')
              .eq('group', userGroup);

            const deptIds = deptsInGroup ? deptsInGroup.map(d => d.id) : [];
            filtered = allKpis.filter((k: any) => deptIds.includes(k.departments_id));
          }
          else if (role === 'admin' || role === 'head_nurse') {
            filtered = allKpis;
          }
        } else {
          filtered = allKpis;
        }

        setKpis(filtered);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  }, [category, supabase]);

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
                    const hasData = avg !== null && avg !== "-" && avg !== ""; 
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
                    <button onClick={() => setSelectedKpi(kpi)} className={getButtonStyle(kpi.kpi_entries || [], 'monthly')}>เพิ่ม</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative">
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