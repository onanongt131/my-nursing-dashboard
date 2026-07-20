'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import AddEntryForm from '@/components/AddEntryForm';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

export default function DepartmentPage() {
  const [data, setData] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [activeKpi, setActiveKpi] = useState<any>(null);
  const supabase = createClient();

  const fetchData = async () => {
    try {
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

  useEffect(() => {
    fetchData();
  }, []);

  const uniqueGroups = Array.from(new Set(data.map(d => d.group))).filter(Boolean);
  const filteredDepartments = data.filter(d => d.group === selectedGroup);

  return (
  <div className="space-y-6 mt-6 p-6">
    {/* 1. ถ้ายังไม่ได้เลือก KPI ให้แสดงรายการกลุ่มงาน, หน่วยงาน และตารางปกติ */}
    {!activeKpi ? (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">เลือกกลุ่มงาน</h1>
        <div className="flex gap-2 flex-wrap">
          {uniqueGroups.map((groupName) => (
            <button 
              key={groupName as string} 
              onClick={() => { setSelectedGroup(groupName as string); setSelectedDept(null); }} 
              className={`px-6 py-2 rounded-full border ${selectedGroup === groupName ? "bg-purple-600 text-white" : "bg-white"}`}
            >
              {groupName}
            </button>
          ))}
        </div>

        {selectedGroup && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {filteredDepartments.map((dept) => (
              <button 
                key={dept.id} 
                onClick={() => setSelectedDept(dept.id)} 
                className={`p-4 border rounded-xl text-left ${selectedDept === dept.id ? "bg-purple-100 border-purple-500 font-bold" : "bg-white hover:border-purple-300"}`}
              >
                {dept.Department}
              </button>
            ))}
          </div>
        )}

        {selectedDept && (
          <div className="mt-8 space-y-8">
            {Object.entries(
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
                          <button 
                            onClick={() => setActiveKpi(kpi)} 
                            className="border px-3 py-1 rounded text-purple-600 hover:bg-purple-50"
                          >
                            เพิ่ม
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    ) : (
      /* 2. ถ้ามีการเลือก KPI (activeKpi มีค่า) ให้แสดงผลแบบ 2 คอลัมน์ (ฝั่งซ้าย: กราฟ/ข้อมูล, ฝั่งขวา: ฟอร์มบันทึก) */
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* ฝั่งซ้าย: แสดงชื่อ KPI, ปุ่มย้อนกลับ, ป้าย Goal แถวเดียว และกราฟ */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
          
          {/* แถวที่ 1: ปุ่มย้อนกลับ (ซ้าย) และ ป้าย Goal แถวเดียว (ขวา) */}
          <div className="flex justify-between items-center">
            <button onClick={() => setActiveKpi(null)} className="text-purple-600 font-bold hover:underline">
              ← ย้อนกลับ
            </button>
            
            <div className="bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="text-xs font-bold text-red-600 uppercase">GOAL</span>
              <span className="text-sm font-bold text-red-700">{`${activeKpi.operator || '>='} ${activeKpi.target_value}`}</span>
            </div>
          </div>

          {/* แถวที่ 2: ชื่อ KPI */}
          <div>
            <h2 className="text-xl font-bold text-gray-800">{activeKpi.name}</h2>
          </div>

          {/* แถวที่ 3: ส่วนแสดงกราฟด้วย Recharts */}
          <div className="h-72 w-full pt-4">
            <div className="w-full h-60">
              {activeKpi.entries && activeKpi.entries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[2565, 2566, 2567, 2568, 2569].map(year => {
                      const found = activeKpi.entries.find((e: any) => Number(e.year) === year);
                      return {
                        year: year.toString(),
                        value: found ? Number(found.value) : 0,
                      };
                    })}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                    <ReferenceLine 
                      y={Number(activeKpi.target_value) || 0} 
                      stroke="#ef4444" 
                      strokeDasharray="4 4" 
                      label={{ value: 'Goal', fill: '#ef4444', position: 'top', fontSize: 12 }} 
                    />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                  ยังไม่มีข้อมูลสำหรับแสดงกราฟ
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ฝั่งขวา: ฟอร์มบันทึกผลงาน (AddEntryForm) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold mb-4">บันทึกข้อมูลผลงาน</h3>
          <AddEntryForm 
            kpiId={activeKpi.id} 
            type={activeKpi.type?.toLowerCase() || activeKpi.Type?.toLowerCase() || 'count'} 
            deptId={selectedDept || ''}
            onSuccess={() => { 
              setActiveKpi(null); 
              fetchData(); 
            }} 
          />
        </div>

      </div>
    )}
  </div>
);
}