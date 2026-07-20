'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { LayoutDashboard, CheckCircle2, XCircle } from 'lucide-react';
import AddEntryForm from '@/components/AddEntryForm';
import KpiCard from "@/components/KpiCard";
import { getButtonStyle } from "@/utils/kpiCalculations";
import { DashboardHeader } from "@/components/DashboardHeader";
import CategoryClient from './category/CategoryClient';
import { CheckCircleIcon as IconCheck, XCircleIcon as XIcon } from '@heroicons/react/24/solid';

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        
        {/* Card 1: KPI ทั้งหมด */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
          <span className="text-gray-500 font-lg mb-2">KPI ทั้งหมด</span>
          <span className="text-6xl font-black text-gray-500 ml-2">{stats.total}</span>
        </div>

        {/* Card 2: ผ่าน/ไม่ผ่าน */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex justify-around items-center">
          {/* ฝั่ง "ผ่าน" */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-green-600 font-bold text-2xl">ผ่าน</div>
            <div className="flex items-center">
              <IconCheck className="w-12 h-12 text-green-700" />
              <span className="text-6xl font-black text-green-700 ml-2">{stats.passed}</span>
            </div>
          </div>

          {/* เส้นคั่นกลาง */}
          <div className="w-px h-12 bg-gray-200"></div>

          {/* ฝั่ง "ไม่ผ่าน" */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-red-600 font-bold text-lg">ไม่ผ่าน</div>
            <div className="flex items-center">
              <XIcon className="w-8 h-8 text-red-500" />
              <span className="text-3xl font-black text-red-700 ml-2">{stats.failed}</span>
            </div>
          </div>
        </div>

        {/* Card 3: สัดส่วนการผ่าน */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
          <span className="text-gray-500 font-medium mb-4">สัดส่วนการผ่าน</span>
          <span className="text-6xl font-black text-green-700 ml-2">{stats.percent}%</span>
        </div>

      </div>
    </main>
  )}