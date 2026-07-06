'use client';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList } from 'recharts';
import AddEntryForm from '@/components/AddEntryForm';
import { processDataForChart } from '@/lib/chartUtils'; // นำเข้าฟังก์ชันที่ปรับปรุงแล้ว

export default function CategoryDetail({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const decodedCategory = decodeURIComponent(category);
  const [kpis, setKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    // 1. ดึง KPI ที่อยู่ในหมวดนี้
    const { data: kpisData } = await supabase
      .from('kpis')
      .select('*, kpi_entries(*)')
      .eq('category', decodedCategory);

    if (kpisData) {
      setKpis(kpisData);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [decodedCategory]);

  if (loading) return <div className="p-8">กำลังโหลดข้อมูล...</div>;

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <Link href="/" className="text-gray-500 hover:text-indigo-600 mb-4 inline-block flex items-center gap-1">
        &larr; กลับหน้าหลัก
      </Link>
      <h1 className="text-4xl font-bold mb-8 text-gray-800">{decodedCategory}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {kpis
          .filter((kpi) => kpi.departments_id == null) // กรองเฉพาะ KPI ระดับกลุ่มภารกิจ
          .map((kpi) => {
            // ใช้ฟังก์ชันกลางจัดการข้อมูล
            const chartData = processDataForChart(kpi.kpi_entries || [], kpi.Type);

            return (
              <div key={kpi.id} className="bg-white p-6 rounded-3xl shadow-sm border mb-6">
                <h2 className="text-2xl font-bold mb-6">{kpi.name}</h2>
                
                <div className="h-64 w-full mb-4">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#4a76a8" barSize={40}>
                          <LabelList dataKey="value" position="top" />
                        </Bar>
                        <ReferenceLine y={kpi.target_value || 0} stroke="red" strokeWidth={2} strokeDasharray="3 3" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">ยังไม่มีข้อมูล</div>
                  )}
                </div>
                <AddEntryForm kpiId={kpi.id} type={kpi.Type} onSuccess={fetchData} />
              </div>
            );
          })
        }
      </div>
    </main>
  );
}