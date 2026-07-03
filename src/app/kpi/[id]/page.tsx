import { supabase } from '@/lib/supabaseClient';
import KpiCard from '@/components/KpiCard';
import DashboardHeader from '@/components/DashboardHeader'; // 1. นำเข้าคอมโพเนนต์ที่สร้างไว้

export default async function KpiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // ... (โค้ดดึงข้อมูลของคุณเหมือนเดิม)
  const { id } = await params;
  
  // ... ส่วน mapping category เหมือนเดิม ...
  const categoryMap: { [key: string]: string } = {
    '1': 'หมวด 1 ผลลัพธ์ด้านการนำองค์กร',
    '2': 'หมวด 2 ผลลัพธ์ด้านกลยุทธ์',
    '3': 'หมวด 3 ผลลัพธ์ด้านผู้ใช้บริการ',
    '4': 'หมวด 4 ผลลัพธ์ด้านการวัดวิเคราะห์ฯ',
    '5': 'หมวด 5 ผลลัพธ์ด้านบุคลากร',
    '6': 'หมวด 6 ผลลัพธ์ด้านการปฏิบัติการพยาบาล'
  };

  const categoryName = categoryMap[id];

  // ดึงข้อมูล
  const { data: kpis, error } = await supabase
    .from('kpis')
    .select('*, kpi_entries(*)')
    .eq('category', categoryName)
    .is('departments_id', null);

  if (error || !kpis) return <div>Error...</div>;
  // 2. เรียงลำดับข้อมูล
  const sortedKpis = [...kpis].sort((a, b) => {
    const numA = parseInt(a.name) || 0;
    const numB = parseInt(b.name) || 0;
    return numA - numB;
  });

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">{categoryName}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {/* แก้ตรงนี้จาก kpis.map เป็น sortedKpis.map */}
        {sortedKpis.map((kpi: any) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>
    </main>
  );
}