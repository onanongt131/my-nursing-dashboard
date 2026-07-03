'use client';
import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList } from 'recharts';
import AddEntryForm from '@/components/AddEntryForm';
import { notFound } from 'next/navigation';

export default function DepartmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [department, setDepartment] = useState<any>(null);
  const [kpis, setKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. ฟังก์ชันดึงข้อมูล KPI และข้อมูลหน่วยงาน
  async function fetchData() {
    setLoading(true);
    
    // ดึงชื่อหน่วยงาน
    const { data: deptData } = await supabase.from('departments').select('*').eq('id', id).single();
    setDepartment(deptData);

    // ดึงเฉพาะ KPI ที่ผูกกับหน่วยงานนี้ (ที่มีค่า departments_id ตรงกับ ID หน่วยงาน)
    // การใช้ 'eq' จะคัดกรองเฉพาะตัวชี้วัดที่เป็นของหน่วยงานนี้เท่านั้น
    const { data: kpiData, error } = await supabase
      .from('kpis')
      .select('*, kpi_entries(*)')
      .eq('departments_id', id);

    if (error) {
      console.error("Error fetching KPIs:", error);
    } else {
      setKpis(kpiData || []);
    }
    
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) return <div className="p-8">กำลังโหลดข้อมูลหน่วยงาน...</div>;
  if (!department) return notFound();

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">{department.Department}</h1>
        {/* เพิ่มบรรทัดนี้ เพื่อแสดงจำนวนตัวชี้วัด */}
        <p className="text-blue-600 font-medium">มีทั้งหมด {kpis.length} ตัวชี้วัด</p> 
        <p className="text-gray-500">รหัสหน่วยงาน: {department.id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {kpis.map((kpi: any) => {
          const years = [2565, 2566, 2567, 2568, 2569];
          const chartData = years.map(year => {
            const entries = kpi.kpi_entries?.filter((e: any) => e.year === year) || [];
            const val = entries.reduce((sum: number, e: any) => sum + (e.value || 0), 0);
            return { name: `ปี ${year}`, value: parseFloat(val.toFixed(2)) };
          });

          return (
            <div key={kpi.id} className="bg-white p-6 rounded-3xl shadow-sm border">
              <h2 className="text-xl font-bold mb-6">{kpi.name}</h2>
              
              <div className="h-64 w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
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

              <AddEntryForm kpiId={kpi.id} type={kpi.Type} onSuccess={fetchData} />
            </div>
          );
        })}
      </div>
    </main>
  );
}