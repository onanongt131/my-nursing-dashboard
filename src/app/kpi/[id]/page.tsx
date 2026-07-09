// src/app/dashboard/kpi/[id]/page.tsx
import { supabase } from '@/lib/supabaseClient';
import KpiCard from '@/components/KpiCard';
import { processDataForChart } from '@/lib/chartUtils';
import { notFound } from 'next/navigation';

interface KpiPageProps {
  params: Promise<{ id: string }>;
}

export default async function KpiDetailPage({ params }: KpiPageProps) {
  const { id } = await params;

  const categoryMap: { [key: string]: string } = {
    '1': 'หมวด 1 ผลลัพธ์ด้านการนำองค์กร',
    '2': 'หมวด 2 ผลลัพธ์ด้านกลยุทธ์',
    '3': 'หมวด 3 ผลลัพธ์ด้านผู้ใช้บริการ',
    '4': 'หมวด 4 ผลลัพธ์ด้านการวัดวิเคราะห์ฯ',
    '5': 'หมวด 5 ผลลัพธ์ด้านบุคลากร',
    '6': 'หมวด 6 ผลลัพธ์ด้านการปฏิบัติการพยาบาล'
  };
  
  const categoryName = categoryMap[id];
  if (!categoryName) notFound(); // ใช้ notFound() ของ Next.js แทนการคืนค่า <div> จะดูเป็นมืออาชีพกว่า

  // 1. ดึงข้อมูล
  const { data: kpis, error } = await supabase
    .from('kpis')
    .select('*, kpi_entries(*)')
    .eq('category', categoryName);

  // 2. จัดการ Error และกรณีไม่มีข้อมูล
  if (error) {
    console.error("Supabase Error:", error);
    return <div className="p-8 text-red-600">เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง</div>;
  }

  if (!kpis || kpis.length === 0) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">{categoryName}</h1>
        <div className="text-gray-500">ยังไม่มีข้อมูลตัวชี้วัดในหมวดนี้</div>
      </main>
    );
  }

  // 3. ประมวลผลข้อมูล (ใช้โครงสร้างเดิมของคุณได้เลย)
  const sortedKpis = [...kpis].sort((a, b) => {
    return (parseFloat(a.name) || 0) - (parseFloat(b.name) || 0);
  });

  const processedKpis = sortedKpis.map((kpi) => ({
    ...kpi,
    processedChartData: processDataForChart(kpi.kpi_entries || [], kpi.Type)
  }));

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-8 text-gray-800">{categoryName}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {processedKpis.map((kpi) => (
          <KpiCard 
            key={kpi.id} 
            kpi={kpi} 
            chartData={kpi.processedChartData} 
          />
        ))}
      </div>
    </main>
  );
}