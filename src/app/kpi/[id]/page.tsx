import { supabase } from '@/lib/supabaseClient';
import KpiCard from '@/components/KpiCard';
import { processDataForChart } from '@/lib/chartUtils'; // ใช้ฟังก์ชันจาก lib/chartUtils.ts

export default async function KpiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1. ตรวจสอบ Supabase ก่อนเริ่มใช้งาน
  if (!supabase) {
    return <div>ระบบฐานข้อมูลยังไม่พร้อมใช้งาน (Supabase client not initialized)</div>;
  }

  const categoryMap: { [key: string]: string } = {
    '1': 'หมวด 1 ผลลัพธ์ด้านการนำองค์กร',
    '2': 'หมวด 2 ผลลัพธ์ด้านกลยุทธ์',
    '3': 'หมวด 3 ผลลัพธ์ด้านผู้ใช้บริการ',
    '4': 'หมวด 4 ผลลัพธ์ด้านการวัดวิเคราะห์ฯ',
    '5': 'หมวด 5 ผลลัพธ์ด้านบุคลากร',
    '6': 'หมวด 6 ผลลัพธ์ด้านการปฏิบัติการพยาบาล'
  };
  
  const categoryName = categoryMap[id];
  if (!categoryName) return <div>ไม่พบข้อมูลหมวดหมู่</div>;

  // 2. ตอนนี้ TypeScript จะมั่นใจแล้วว่า supabase ไม่เป็น null
  const { data: kpis, error } = await supabase
    .from('kpis')
    .select('*, kpi_entries(*)')
    .eq('category', categoryName);

  if (error || !kpis) return <div>เกิดข้อผิดพลาดในการดึงข้อมูล</div>;


  // เรียงลำดับตามชื่อ KPI (สมมติว่าเป็นเลขหมวด เช่น 1.1, 1.2)
  const sortedKpis = [...kpis].sort((a, b) => {
    const numA = parseFloat(a.name) || 0;
    const numB = parseFloat(b.name) || 0;
    return numA - numB;
  });

  // ใช้ฟังก์ชันประมวลผลข้อมูลที่ปรับปรุงแล้ว
  const processedKpis = sortedKpis.map((kpi: any) => ({
    ...kpi,
    processedChartData: processDataForChart(kpi.kpi_entries || [], kpi.Type)
  }));

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">{categoryName}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {processedKpis.map((kpi: any) => (
          <KpiCard 
            key={kpi.id} 
            kpi={kpi} 
            // ส่งข้อมูลที่ประมวลผลเสร็จแล้วเข้า Component
            chartData={kpi.processedChartData} 
          />
        ))}
      </div>
    </main>
  );
}