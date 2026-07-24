// app/dashboard/department/page.tsx (หรือชื่อไฟล์หน้า Department ของคุณ)
'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import AddEntryForm from '@/components/AddEntryForm';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { calculateYearlySummary, checkStatus, getYearlyTrend, getButtonStyle } from '@/utils/kpiCalculations';

export default function DepartmentPage() {
  const [data, setData] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [activeKpi, setActiveKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. ดึงข้อมูล User และ Profile ปัจจุบัน พร้อม join ตาราง departments เพื่อดูสิทธิ์
      const { data: { user } } = await supabase.auth.getUser();
      let userProfile = null;

      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*, departments(group)')
          .eq('id', user.id)
          .maybeSingle();
        userProfile = profileData;
      }

      // 2. ดึงข้อมูลพื้นฐานทั้งหมด
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

      let depts = deptRes.data || [];
      const kpis = kpiRes.data || [];
      const entries = entryRes.data || [];
      const maps = mapRes.data || [];

      // 3. กรองสิทธิ์การมองเห็นหน่วยงาน (Departments) ตาม Role ของผู้ใช้
      if (userProfile && userProfile.role) {
        const role = userProfile.role;
        const userDeptId = userProfile.department_id;
        const userGroup = (userProfile.departments as any)?.group;

        if (role === 'staff' || role === 'head_department') {
          depts = depts.filter(d => d.id === userDeptId);
        } 
        else if (role === 'head_group' && userGroup) {
          depts = depts.filter(d => d.group === userGroup);
        }
        // admin หรือ head_nurse สามารถเห็นทั้งหมดได้ตามเดิม
      }

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

      // ถ้าระบบจำกัดสิทธิ์เหลือหอผู้ป่วยเดียว (เช่น staff/head_department) ให้เลือกให้อัตโนมัติ
      const uniqueGrps = Array.from(new Set(formattedData.map(d => d.group))).filter(Boolean);
      if (uniqueGrps.length === 1 && !selectedGroup) {
        setSelectedGroup(uniqueGrps[0] as string);
      }
      const filteredDepts = formattedData.filter(d => d.group === (selectedGroup || uniqueGrps[0]));
      if (filteredDepts.length === 1 && !selectedDept) {
        setSelectedDept(filteredDepts[0].id);
      }

    } catch (err) {
      console.error("Unexpected Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const uniqueGroups = Array.from(new Set(data.map(d => d.group))).filter(Boolean);
  const filteredDepartments = data.filter(d => d.group === selectedGroup);

  if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูลหน่วยงาน...</div>;

  return (
  <div className="space-y-2 mt-2 p-2">
    {/* ส่วนเลือกกลุ่มงานและหอผู้ป่วย */}
    <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">เลือกกลุ่มงาน</h2>
        <div className="flex flex-wrap gap-2">
          {uniqueGroups.map((groupName) => (
            <button 
              key={groupName as string} 
              onClick={() => { setSelectedGroup(groupName as string); setSelectedDept(null); }} 
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                selectedGroup === groupName 
                  ? "bg-purple-500 text-white border-purple-800 shadow-md shadow-purple-200" 
                  : "bg-white text-gray-400 border-gray-200 hover:border-purple-800 hover:text-purple-600"
              }`}
            >
              {groupName}
            </button>
          ))}
        </div>
      </div>

      {selectedGroup && (
        <>
          <hr className="border-gray-200" />
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">เลือกหอผู้ป่วย / หน่วยงาน</h2>
            <div className="flex flex-wrap gap-2">
              {filteredDepartments.map((dept) => (
                <button 
                  key={dept.id} 
                  onClick={() => { 
                    setSelectedDept(dept.id); 
                    setActiveKpi(null); // 👈 เพิ่มบรรทัดนี้เพื่อเคลียร์หน้ากราฟที่ค้างอยู่
                  }} 
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                    selectedDept === dept.id 
                      ? "bg-purple-100 text-purple-700 border-purple-300 shadow-sm" 
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  {dept.Department}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>

    {/* ส่วนแสดงผลข้อมูลตัวชี้วัด (เมื่อเลือกหน่วยงานแล้ว) */}
    {selectedDept && !activeKpi && (
      <div className="mt-8 space-y-6">
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
                  {[2565, 2566, 2567, 2568, 2569].map(y => <th key={y} className="w-[8%] px-4 py-3 text-center">{y}</th>)}
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
                      );
                    })}
                    <td className="px-4 py-4 text-center">
                      <button 
                        onClick={() => setActiveKpi(kpi)} 
                        className={getButtonStyle(kpi.entries || [], kpi.frequency || kpi.Frequency || 'yearly')}
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

    {/* ส่วนบันทึกผลงาน (เมื่อกดเพิ่ม KPI) */}
    {activeKpi && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
          <button onClick={() => setActiveKpi(null)} className="text-purple-600 font-bold hover:underline">← ย้อนกลับ</button>
          <h2 className="text-xl font-bold text-gray-800">{activeKpi.name}</h2>
          <ResponsiveContainer height={250} width="100%">
            <BarChart data={[2565, 2566, 2567, 2568, 2569].map(y => {
              const entry = activeKpi.entries?.find((e: any) => Number(e.year) === y);
              return { year: y, value: entry ? parseFloat(entry.value) || 0 : 0 };
            })}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f8fafc'}} />
              <Bar dataKey="value" fill="#818cf8" radius={[6, 6, 0, 0]} barSize={40} />
              <ReferenceLine y={activeKpi.target_value} stroke="#f87171" strokeDasharray="3 3" label={{ value: 'Target', position: 'insideTopRight', fill: '#f87171', fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
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