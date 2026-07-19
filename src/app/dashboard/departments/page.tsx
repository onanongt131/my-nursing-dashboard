'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import AddEntryForm from '@/components/AddEntryForm';

export default function DepartmentPage() {
  const [data, setData] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [activeKpi, setActiveKpi] = useState<any>(null);
  const supabase = createClient();

  const fetchData = async () => {
  try {
    // ดึงข้อมูลทั้งหมดแยกตามตาราง
    const [deptRes, kpiRes, entryRes, mapRes] = await Promise.all([
      supabase.from('departments').select('*'),
      supabase.from('kpis').select('*'),
      supabase.from('kpi_entries').select('*'),
      supabase.from('kpi_department_map').select('department_id, kpi_id')
    ]);

    if (deptRes.error || kpiRes.error || entryRes.error || mapRes.error) {
      console.error("Supabase Error:", deptRes.error || kpiRes.error || entryRes.error || mapRes.error);
      return;
    }

    // ประกอบข้อมูลด้วย Logic ของเราเอง
    const depts = deptRes.data || [];
    const kpis = kpiRes.data || [];
    const entries = entryRes.data || [];
    const maps = mapRes.data || [];

    const formattedData = depts.map(dept => ({
  ...dept,
  kpis: maps
    .filter(m => m.department_id === dept.id)
    .map(m => {
      const kpiData = kpis.find(k => k.id === m.kpi_id);
      return kpiData ? {
        ...kpiData,
        // สำคัญ: กรอง entries ให้ตรงกับทั้ง kpi_id และ department_id
        entries: entries.filter(e => 
          e.kpi_id === kpiData.id && e.department_id === dept.id
        )
      } : null;
    })
    .filter(Boolean)
}));
    
    setData(formattedData);
  } catch (err) {
    console.error("Unexpected Error:", err);
  }
};


  // 2. เรียกใช้ fetchData ใน useEffect
  useEffect(() => {
    fetchData();
  }, []);

  const uniqueGroups = Array.from(new Set(data.map(d => d.group))).filter(Boolean);
  const filteredDepartments = data.filter(d => d.group === selectedGroup);
  const selectedDeptData = filteredDepartments.find(d => d.id === selectedDept);

  return (
    <div className="space-y-6 mt-6 p-6">
      {!activeKpi && (
        <>
          <h1 className="text-2xl font-bold">เลือกกลุ่มงาน</h1>
          <div className="flex gap-2">
            {uniqueGroups.map((groupName) => (
              <button key={groupName} onClick={() => { setSelectedGroup(groupName as string); setSelectedDept(null); }} 
                className={`px-6 py-2 rounded-full border ${selectedGroup === groupName ? "bg-purple-600 text-white" : "bg-white"}`}>
                {groupName}
              </button>
            ))}
          </div>

          {selectedGroup && (
            <div className="grid grid-cols-6 gap-3">
              {filteredDepartments.map((dept) => (
                <button key={dept.id} onClick={() => setSelectedDept(dept.id)} className={`p-4 border rounded-xl ${selectedDept === dept.id ? "bg-purple-100 border-purple-500" : "bg-white hover:border-purple-300"}`}>
                  {dept.Department}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {selectedDept && (
  <div className="mt-8">
    {/* จัดกลุ่มข้อมูลที่ดึงมาได้ตาม dimension */}
    {Object.entries(
      // กรองเฉพาะ maps ของหน่วยงานที่เลือก แล้วหา kpi ที่เกี่ยวข้อง
      (data.find(d => d.id === selectedDept)?.kpis || []).reduce((acc: any, kpi: any) => {
        const dim = kpi.dimension || 'มิติอื่นๆ';
        if (!acc[dim]) acc[dim] = [];
        acc[dim].push(kpi);
        return acc;
      }, {})
    )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dimName, kpisInDim]: [string, any]) => (
      <div key={dimName} className="mb-10">
        <h2 className="text-xl font-bold text-purple-800 mb-4 bg-purple-50 p-2 rounded">{dimName}</h2>
        <table className="w-full text-sm text-left border-collapse border border-gray-200 table-fixed">
          <thead className="bg-gray-50 text-gray-600 uppercase border-b border-gray-200">
            <tr>
              <th className="w-[40%] px-4 py-3">ตัวชี้วัด (KPI)</th>
              <th className="w-[10%] px-4 py-3">Goal</th>
              <th className="w-[8%] px-4 py-3 text-center">2565</th>
              <th className="w-[8%] px-4 py-3 text-center">2566</th>
              <th className="w-[8%] px-4 py-3 text-center">2567</th>
              <th className="w-[8%] px-4 py-3 text-center">2568</th>
              <th className="w-[8%] px-4 py-3 text-center">2569</th>
              <th className="w-[10%] px-4 py-3 text-center">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {kpisInDim.map((kpi: any) => (
              <tr key={kpi.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-4">{kpi.name}</td>
                <td className="px-4 py-4 font-bold">{kpi.target_value}</td>
                {[2565, 2566, 2567, 2568, 2569].map(year => {
                  const entry = kpi.entries?.find((e: any) => Number(e.year) === year);
                  return (
                    <td key={year} className="px-4 py-4 text-center text-gray-500">
                      {entry ? <span className="bg-green-100 text-green-700 px-2 py-1 rounded font-bold">{entry.value}</span> : "ไม่มีข้อมูล"}
                    </td>
                  )
                })}
                <td className="px-4 py-4 text-center">
                  <button onClick={() => setActiveKpi(kpi)} className="border px-3 py-1 rounded text-purple-600 hover:bg-purple-50">เพิ่ม</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ))}
  </div>
)}
 
      {activeKpi && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in zoom-in duration-300">
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <button onClick={() => setActiveKpi(null)} className="text-purple-600 font-bold mb-4">← ย้อนกลับ</button>
            <h2 className="text-xl font-bold">{activeKpi.name}</h2>
            <div className="bg-red-50 p-3 rounded-lg w-32 mt-2">
              <p className="text-xs font-bold text-red-600">เป้าหมาย (GOAL)</p>
              <p className="text-xl font-bold text-red-600">{`>= ${activeKpi.target_value}`}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <h3 className="text-lg font-bold mb-6">บันทึกข้อมูลผลงาน</h3>
            <AddEntryForm 
              kpiId={activeKpi.id} 
              type={activeKpi.type?.toLowerCase() || activeKpi.Type?.toLowerCase() || 'count'} 
              deptId={selectedDept || ''}
              onSuccess={() => { setActiveKpi(null); fetchData(); }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}