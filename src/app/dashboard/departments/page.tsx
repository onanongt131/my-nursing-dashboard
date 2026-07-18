'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function DepartmentPage() {
  const [data, setData] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const supabase = createClient();

  // 1. เพิ่ม useEffect เพื่อเรียก fetchData ตอน Component โหลด
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: deptData, error } = await supabase.from('departments').select('*, kpis(*)');
        
        if (error) {
          console.error("Supabase Error Details:", error);
        } else {
          setData(deptData || []);
          // ตั้งค่าเริ่มต้นของ Group ถ้ามีข้อมูล
          if (deptData && deptData.length > 0) {
            setSelectedGroup(deptData[0].group); 
          }
        }
      } catch (err) {
        console.error("Unexpected Error:", err);
      }
    };
    fetchData();
  }, []); // [] สำคัญมากเพื่อให้รันครั้งเดียวตอนเริ่ม

  // กรองข้อมูลหลังจากได้ data แล้ว
  const uniqueGroups = Array.from(new Set(data.map(d => d.group))).filter(Boolean); // .filter(Boolean) ป้องกันค่าว่าง
  const filteredDepartments = data.filter(d => d.group === selectedGroup);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* 1. ส่วนเลือกกลุ่มงาน */}
      <h1 className="text-2xl font-bold text-gray-800">เลือกกลุ่มงาน</h1>
      <div className="flex flex-wrap gap-2 pb-6 border-b border-gray-100">
            {uniqueGroups.map((groupName) => (
                <button
                key={groupName}
                onClick={() => { setSelectedGroup(groupName as string); setSelectedDept(null); }}
                className={`px-6 py-2 rounded-full font-medium border transition-all ${
                    selectedGroup === groupName 
                    ? "bg-purple-600 text-white border-purple-600 shadow-md" 
                    : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"
                }`}
                >
                {groupName}
                </button>
        ))}
      </div>

      {/* 2. ส่วนเลือกหน่วยงาน */}
      {selectedGroup && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase">เลือกหน่วยงานใน {selectedGroup}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredDepartments.map((dept) => (
              <button 
                key={dept.id} 
                onClick={() => setSelectedDept(dept.id)} 
                className={`p-4 rounded-xl border transition-all text-sm ${
                  selectedDept === dept.id 
                    ? "bg-purple-50 border-purple-500 text-purple-700 shadow-sm" 
                    : "bg-white border-gray-200 hover:border-purple-300"
                }`}
              >
                {dept.Department}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. ส่วนแสดงผล KPI */}
      {selectedDept && (
        <div className="mt-8">
            <h3 className="text-lg font-bold mb-4 text-gray-700">ผลการดำเนินงาน</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDepartments.find(d => d.id === selectedDept)?.kpis?.map((kpi: any) => (
                    <div key={kpi.id} className="p-6 bg-white rounded-2xl border shadow-sm">
                        <p className="font-semibold text-gray-800">{kpi.kpi_name}</p>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
}