'use client';
import { useEffect, useState, use } from 'react';
import Link from 'next/link'; // 1. เพิ่ม Import นี้
import { supabase } from '@/lib/supabaseClient';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList } from 'recharts';
import AddEntryForm from '@/components/AddEntryForm';

export default function CategoryDetail({ params }: { params: Promise<{ category: string }> }) {
  // ... (logic เดิมของคุณ)
  const { category } = use(params);
  const decodedCategory = decodeURIComponent(category);
  const [kpis, setKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. ฟังก์ชันดึงข้อมูล (แยกออกมาเพื่อให้เรียกใช้ซ้ำได้)
  async function fetchData() {
    const { data } = await supabase
      .from('kpis')
      .select('*, kpi_entries(*)')
      .eq('category', decodedCategory);
    
    if (data) setKpis(data);
    setLoading(false);
  }

  // 2. เรียกใช้ fetchData เมื่อ component โหลด
  useEffect(() => {
    fetchData();
  }, [decodedCategory]);

  if (loading) return <div className="p-8">กำลังโหลดข้อมูล...</div>;

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      {/* 2. เพิ่มปุ่มกลับหน้าแรกตรงนี้ */}
      <Link href="/" className="text-gray-500 hover:text-indigo-600 mb-4 inline-block flex items-center gap-1">
        &larr; กลับหน้าหลัก
      </Link>

      <h1 className="text-4xl font-bold mb-8 text-gray-800">{decodedCategory}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {kpis.map((kpi) => {
          const years = [2565, 2566, 2567, 2568, 2569];
          
            const chartData = years.map(year => {
            const entries = kpi.kpi_entries?.filter((e: any) => e.year === year) || [];
            
            // ใช้ค่า value จากฐานข้อมูลโดยตรง เพราะใน DB ของคุณ (สกรีนช็อต 2026-07-01 200943.png) 
            // เก็บค่าที่คำนวณสำเร็จแล้วไว้ในคอลัมน์ value
            const val = entries.reduce((sum: number, e: any) => sum + (e.value || 0), 0);
            
            return { name: `ปี ${year}`, value: parseFloat(val.toFixed(2)) };
            });

          return (
            <div key={kpi.id} className="bg-white p-6 rounded-3xl shadow-sm border mb-6">
              <h2 className="text-2xl font-bold mb-6">{kpi.name}</h2>
              
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

              {/* ส่ง fetchData เข้าไปเป็น onSuccess เพื่อให้กราฟอัปเดตเมื่อบันทึกข้อมูลสำเร็จ */}
              <AddEntryForm kpiId={kpi.id} type={kpi.Type} onSuccess={fetchData} />
            </div>
          );
        })}
      </div>
    </main>
  );
}