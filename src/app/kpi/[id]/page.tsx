import { supabase } from '@/lib/supabaseClient';
import KpiCard from '@/components/KpiCard';
import { processDataForChart } from '@/lib/chartUtils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Home } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';

interface KpiPageProps {
  params: Promise<{ id: string }>;
}

export default async function KpiDetailPage({ params }: KpiPageProps) {
  const { id } = await params;

  const categoryMap: { [key: string]: string } = {
    '1': 'หมวด 1 ผลลัพธ์ด้านการนำองค์กร', '2': 'หมวด 2 ผลลัพธ์ด้านกลยุทธ์',
    '3': 'หมวด 3 ผลลัพธ์ด้านผู้ใช้บริการ', '4': 'หมวด 4 ผลลัพธ์ด้านการวัดวิเคราะห์ฯ',
    '5': 'หมวด 5 ผลลัพธ์ด้านบุคลากร', '6': 'หมวด 6 ผลลัพธ์ด้านการปฏิบัติการพยาบาล'
  };
  
  const categoryName = categoryMap[id];
  if (!categoryName) notFound();

  const { data: kpis, error } = await supabase
    .from('kpis')
    .select('*, kpi_entries(*)')
    .eq('category', categoryName);

  if (error) return <div className="p-8 text-red-600">เกิดข้อผิดพลาดในการดึงข้อมูล</div>;

  const processedKpis = (kpis || []).map((kpi) => ({
    ...kpi,
    processedChartData: processDataForChart(kpi.kpi_entries || [], kpi.Type)
  }));

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header เลียนแบบ Dashboard */}
      <header className="flex justify-between items-center px-6 py-4 bg-white border-b shadow-sm">
        <h2 className="font-bold text-lg text-gray-700">KPI Detail</h2>
        <div className="flex gap-2">
          <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            <Home className="w-4 h-4" /> หน้าหลัก
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div className="p-8">
        <h1 className="text-2xl font-bold mb-8 text-gray-800">{categoryName}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {processedKpis.map((kpi) => (
            <KpiCard key={kpi.id} kpi={kpi} chartData={kpi.processedChartData} />
          ))}
        </div>
      </div>
    </main>
  );
}