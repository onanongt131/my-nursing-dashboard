'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { LayoutDashboard, CheckCircle2, XCircle } from 'lucide-react';
import AddEntryForm from '@/components/AddEntryForm';
import KpiCard from "@/components/KpiCard";
import { getButtonStyle } from "@/utils/kpiCalculations";
import { DashboardHeader } from "@/components/DashboardHeader";
import CategoryClient from './category/CategoryClient';

export const categories = [
  { id: 1, name: "หมวด 1 ผลลัพธ์ด้านการนำองค์กร", icon: "🏛️" },
  { id: 2, name: "หมวด 2 ผลลัพธ์ด้านกลยุทธ์", icon: "🎯" },
  { id: 3, name: "หมวด 3 ผลลัพธ์ด้านผู้ใช้บริการ", icon: "👥" },
  { id: 4, name: "หมวด 4 ผลลัพธ์ด้านการวัด", icon: "📊" },
  { id: 5, name: "หมวด 5 ผลลัพธ์ด้านบุคลากร", icon: "👩‍⚕️" },
  { id: 6, name: "หมวด 6 ผลลัพธ์ด้านการปฏิบัติ", icon: "📝" },
];

export const strategicGoals = [
  { id: '1', name: 'Service Excellence', description: 'กลยุทธ์ : พัฒนาระบบบริการพยาบาลให้เป็นเลิศในการดูแลผู้ป่วยกลุ่มโรคสำคัญ', year_range: '2565-2569' },
  { id: '2', name: 'Medical and Wellness Tourism Model', description: 'กลยุทธ์ : พัฒนาแอปพลิเคชั่นในการดูแลสุขภาพ : ไม่ป่วยเริ่มต้นที่ตัวคุณเอง', year_range: '2565-2569' },
  { id: '3', name: 'PP&P Excellence', description: 'กลยุทธ์ : พัฒนาคุณภาพบริการพยาบาลเฉพาะทางกลุ่มโรค NCD โรคอุบัติใหม่-อุบัติซ้ำ และจิตเวช', year_range: '2565-2569' },
  { id: '4', name: 'Personnel Excellence', description: 'กลยุทธ์ : พัฒนาสถาบันการวิจัย ผลิต และพัฒนาบุคลากรทางการแพทย์ การสาธารณสุข และการบริหารจัดการระดับนานาชาติ', year_range: '2565-2569' },
  { id: '5', name: 'Governance excellence', description: 'กลยุทธ์ : พัฒนาองค์กรสมรรถนะสูงระดับนานาชาติ', year_range: '2565-2569' },
];

export default function DashboardPage() {
  const [groupKpis, setGroupKpis] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedKpi, setSelectedKpi] = useState<any | null>(null);
  const [selectedStrategic, setSelectedStrategic] = useState<string | null>(null);
  const [selectedDisease, setSelectedDisease] = useState("ทั้งหมด");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const uniqueGroups = useMemo(() => Array.from(new Set(departments.map(d => d.group_name))), [departments]);
  const filteredDepartments = useMemo(() => departments.filter(d => d.group_name === selectedGroup), [departments, selectedGroup]);

  // --- Logic & Data Fetching ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: allKpis } = await supabase.from('kpis').select('*, kpi_entries(*)');
    const { data: depts } = await supabase.from('departments').select('*');
    if (allKpis) setGroupKpis(allKpis.filter((k: any) => k.departments_id === null));
    if (depts) setDepartments(depts);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = useMemo(() => {
    const passed = groupKpis.filter(kpi => {
      const entries = kpi.kpi_entries || [];
      const latest = [...entries].sort((a: any, b: any) => b.year - a.year)[0];
      return latest && latest.value >= (kpi.target_value || 0);
    }).length;
    return { total: groupKpis.length, passed, failed: groupKpis.length - passed, percent: groupKpis.length > 0 ? Math.round((passed / groupKpis.length) * 100) : 0 };
  }, [groupKpis]);

  if (loading) return <main className="p-8 text-center">กำลังโหลดข้อมูล...</main>;

  return (
    <main className="p-6 space-y-6">
      {/* 1. Header & Stats Section */}
{/* ปรับจาก grid-cols-1 md:grid-cols-3 ให้เป็น gap ที่กว้างขึ้น */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10"> 
  
  {/* เพิ่ม padding (p-8) เพื่อให้กล่องสูงขึ้น และเพิ่มขนาดตัวเลขให้เด่นขึ้น */}
  <div className="bg-white p-8 rounded-2xl border text-center shadow-sm">
    <p className="text-gray-500 text-lg">KPI ทั้งหมด</p>
    <p className="text-6xl font-black text-purple-600 mt-2">{stats.total}</p>
  </div>

  <div className="bg-white p-8 rounded-2xl border flex items-center justify-around shadow-sm">
    <div className="text-center">
      <p className="text-green-600 font-bold text-lg">ผ่าน</p>
      <p className="text-4xl font-bold mt-2">✅ {stats.passed}</p>
    </div>
    <div className="text-center">
      <p className="text-red-600 font-bold text-lg">ไม่ผ่าน</p>
      <p className="text-4xl font-bold mt-2">❌ {stats.failed}</p>
    </div>
  </div>

  <div className="bg-white p-8 rounded-2xl border text-center shadow-sm">
    <p className="text-gray-500 text-lg">สัดส่วนการผ่าน</p>
    <p className="text-6xl font-black mt-2">{stats.percent}%</p>
  </div>
  
</div>
    </main>
  );
}