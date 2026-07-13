// app/kpi/[id]/page.tsx
import KpiDetailClient from '@/components/KpiDetailClient';

export default async function KpiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // การใส่ key={id} จะบังคับให้ React สร้าง Component ใหม่เมื่อ id เปลี่ยน
  return <KpiDetailClient key={id} id={id} />;
}