'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import LogoutButton from '@/components/LogoutButton';
import AddEntryForm from '@/components/AddEntryForm';
import Link from 'next/link';
import { Home, CheckCircle, XCircle, Target, TrendingUp } from 'lucide-react';
import KpiBarChart from '@/components/KpiBarChart';

export default function KpiDetailClient({ id }: { id: string }) {
  const supabase = createClient();
  const [kpi, setKpi] = useState<any>(null);
  const [categoryKpis, setCategoryKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // 1. ล้างข้อมูลเก่าก่อนเสมอเมื่อ ID เปลี่ยน
      setKpi(null);
      setCategoryKpis([]);

      try {
        // ดึงข้อมูลตัวชี้วัดหลัก
        const { data: kpiData, error: kpiError } = await supabase
          .from('kpis')
          .select('*, kpi_entries(*)')
          .eq('id', id)
          .single();
        
        if (kpiError) throw kpiError;
        setKpi(kpiData);

        // ดึงข้อมูลตัวชี้วัดอื่นๆ ในหมวดเดียวกัน
        if (kpiData?.category) {
          const { data: catKpis, error: catError } = await supabase
            .from('kpis')
            .select('*, kpi_entries(*)')
            .eq('category', kpiData.category)
            .neq('id', id); // ไม่ต้องแสดงตัวที่ดูอยู่ซ้ำ
          
          if (catError) throw catError;
          setCategoryKpis(catKpis || []);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]); // id คือหัวใจสำคัญของการทำงานใน useEffect นี้

  // เพิ่มเงื่อนไข Loading เพื่อให้แน่ใจว่าข้อมูลมาครบก่อนเรนเดอร์
  if (loading) {
    return <main className="min-h-screen bg-gray-50 p-10 text-center">กำลังโหลดข้อมูล...</main>;
  }

  if (!kpi) {
    return <main className="min-h-screen bg-gray-50 p-10 text-center text-red-500">ไม่พบข้อมูลตัวชี้วัด</main>;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 shadow-sm flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 transition-all">
            <Home className="w-4 h-4" />
            <span className="text-sm font-bold">กลับสู่หน้าหลัก</span>
          </Link>
          <div className="h-6 w-[1px] bg-gray-300 mx-1"></div>
          <span className="text-sm font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
            {kpi.category}
          </span>
        </div>
        <LogoutButton />
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* ตารางแสดงตัวชี้วัดอื่นๆ */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-gray-800">ตัวชี้วัดอื่นๆ ใน {kpi.category}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <tbody className="text-sm">
                {categoryKpis.length > 0 ? (
                categoryKpis.map((item) => (
                    <tr key={item.id} className={`border-b hover:bg-gray-50 ${item.id === id ? 'bg-purple-50' : ''}`}>
                    <td className="p-4 text-gray-700 font-medium">
                        {item.name} {item.id === id && <span className="text-[10px] bg-purple-200 text-purple-700 px-2 py-0.5 rounded ml-2">กำลังดู</span>}
                    </td>
                    <td className="p-4 text-center">
                        {item.id !== id && (
                        <Link href={`/kpi/${item.id}`} className="text-xs font-bold text-purple-600 hover:underline">
                            เจาะลึก
                        </Link>
                        )}
                    </td>
                    </tr>
                ))
                ) : (
                <tr><td colSpan={2} className="p-4 text-center text-gray-400">ไม่พบตัวชี้วัดอื่นในหมวดนี้</td></tr>
                )}
            </tbody>
            </table>
          </div>
        </div>

        {/* ข้อมูลหลัก */}
        <div className="space-y-4">
          <h1 className="text-2xl font-black text-gray-800">ผลการดำเนินงานตัวชี้วัด: {kpi.name}</h1>
          <div className="bg-white p-5 rounded-2xl border shadow-sm">
                {kpi.kpi_entries && kpi.kpi_entries.length > 0 ? (
                <KpiBarChart data={kpi.kpi_entries} targetValue={kpi.target_value} />
                ) : (
                <div className="h-40 flex items-center justify-center text-gray-400">ยังไม่มีข้อมูลผลการดำเนินงาน</div>
                )}
            </div>
        </div>
      </div>
    </main>
  );
}