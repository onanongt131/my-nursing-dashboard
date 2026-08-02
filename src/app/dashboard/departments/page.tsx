'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import AddEntryForm from '@/components/AddEntryForm';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { getButtonStyle } from '@/utils/kpiCalculations';
import { ClipboardDocumentCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import AuditChartModal from '@/components/AuditChartModal'; 
import WpQaModal from '@/components/WpQaModal'; 
import IvCareModal from '@/components/IvCareModal'; 
import FallCareModal from '@/components/FallCareModal'; 

export default function DepartmentPage() {
  const [data, setData] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [activeKpi, setActiveKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // State สำหรับควบคุม Modal และข้อมูลหน่วยงาน (เพิ่ม 'audit' และ 'fall')
  const [activeModal, setActiveModal] = useState<'wp_qa' | 'iv_care' | 'fall' | 'audit' | null>(null);
  const [selectedDept, setSelectedDept] = useState<{ id: string | number; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // ฟังก์ชันสำหรับเปิด Modal พร้อมกำหนดหน่วยงานที่เลือก
  const handleOpenModal = (dept: { id: number | string; name: string }, modalType: 'wp_qa' | 'iv_care' | 'fall' | 'audit') => {
    setSelectedDept(dept);
    setActiveModal(modalType);
  };

  // Form State: Fall Incident
  const [fallData, setFallData] = useState({ record_date: '', total_admissions: 0, fall_cases: 0, severity_level: 'ระดับ E ขึ้นไป', patient_hn: '', notes: '' });

  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    try {
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
      }

      const formattedData = depts.map(dept => ({
        ...dept,
        kpis: maps
          .filter(m => m.department_id === Number(dept.id))
          .map(m => {
            const kpiData = kpis.find(k => k.id === m.kpi_id);
            return kpiData ? {
              ...kpiData,
              entries: entries.filter(e => 
                e.kpi_id === kpiData.id && e.department_id === Number(dept.id)
              )
            } : null;
          })
          .filter(Boolean)
      }));
      
      setData(formattedData);
    } catch (err) {
      console.error("Unexpected Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const uniqueGroups = Array.from(new Set(data.map(d => d.group))).filter(Boolean) as string[];
  const filteredDepartments = data.filter(d => d.group === selectedGroup);
  const currentDeptObj = data.find(d => String(d.id) === String(selectedDept?.id));


  if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูลหน่วยงาน...</div>;

  return (
    <div className="px-2 py-2 max-w-full mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* --- ฝั่งซ้าย: Sidebar --- */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-6 sticky top-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">เลือกกลุ่มงาน</label>
            <select
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                setSelectedDept(null);
                setActiveKpi(null);
              }}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="" disabled>-- กรุณาเลือกกลุ่มงาน --</option>
              {uniqueGroups.map((groupName) => (
                <option key={groupName} value={groupName}>{groupName}</option>
              ))}
            </select>
          </div>

          <hr className="border-gray-100" />

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">เลือกหอผู้ป่วย / หน่วยงาน</label>
            {selectedGroup ? (
              <div className="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
                {filteredDepartments.length > 0 ? (
                  filteredDepartments.map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() => {
                        setSelectedDept({ id: dept.id, name: dept.Department });
                        setActiveKpi(null);
                        setActiveModal(null);
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        selectedDept?.id === dept.id
                          ? "bg-emerald-100 text-emerald-800 font-semibold shadow-sm border border-emerald-200"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      {dept.Department}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 py-2">ไม่มีหน่วยงานในกลุ่มนี้</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-2 italic">กรุณาเลือกกลุ่มงานก่อน</p>
            )}
          </div>
        </div>

        {/* --- ฝั่งขวา: Content --- */}
        <div className="lg:col-span-3 space-y-6">
          
          {selectedDept && !activeKpi && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
              
              {/* ส่วนหัวข้อหน่วยงาน และปุ่มทางลัดฟอร์มบันทึกพิเศษ */}
              <div className="border-b pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">หน่วยงานที่กำลังแสดงผล</span>
                  <h2 className="text-xl font-bold text-gray-800">
                    {currentDeptObj?.Department || selectedDept.name}
                  </h2>
                </div>

                {/* แถบปุ่มทางลัดฟอร์มบันทึก */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      if (currentDeptObj) {
                        handleOpenModal({ id: currentDeptObj.id, name: currentDeptObj.Department }, 'audit');
                      }
                    }}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <ClipboardDocumentCheckIcon className="w-4 h-4 text-amber-300" />
                    <span>บันทึก Audit Chart</span>
                  </button>

                  {/* ปุ่มบันทึก WP/QA */}
                <button
                  onClick={() => setActiveModal('wp_qa')}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-xl shadow transition"
                >
                  <svg className="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  บันทึก WP/QA
                </button>

                {/* ปุ่มบันทึก IV Care */}
                <button
                  onClick={() => setActiveModal('iv_care')}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white text-sm font-medium rounded-xl shadow transition"
                >
                  <svg className="w-4 h-4 text-cyan-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  บันทึก IV Care
                </button>

                  <button
                    onClick={() => {
                      if (currentDeptObj) {
                        handleOpenModal({ id: currentDeptObj.id, name: currentDeptObj.Department }, 'fall');
                      }
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <ExclamationTriangleIcon className="w-4 h-4 text-white" />
                    <span>บันทึก Fall</span>
                  </button>
                </div>
              </div>

              {/* ตารางแสดงตัวชี้วัด 4 มิติ */}
              {Object.entries(
                (currentDeptObj?.kpis || []).reduce((acc: any, kpi: any) => {
                  const dim = kpi.dimension || 'มิติอื่นๆ';
                  if (!acc[dim]) acc[dim] = [];
                  acc[dim].push(kpi);
                  return acc;
                }, {})
              )
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([dimName, kpisInDim]: [string, any]) => (
                <div key={dimName} className="mb-8">
                  <h3 className="text-md font-bold text-emerald-900 mb-3 bg-emerald-50 px-3 py-2 rounded-lg">{dimName}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse border border-gray-200 table-fixed">
                      <thead className="bg-gray-50 text-gray-600 uppercase border-b border-gray-200 text-xs">
                        <tr>
                          <th className="w-[38%] px-3 py-3">ตัวชี้วัด (KPI)</th>
                          <th className="w-[8%] px-3 py-3 text-center">Goal</th>
                          {[2565, 2566, 2567, 2568, 2569].map(y => <th key={y} className="w-[8%] px-3 py-3 text-center">{y}</th>)}
                          <th className="w-[10%] px-3 py-3 text-center">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {kpisInDim.map((kpi: any) => (
                          <tr key={kpi.id} className="hover:bg-gray-50">
                            <td className="px-3 py-3 text-gray-800">{kpi.name}</td>
                            <td className="px-3 py-3 text-center font-bold text-gray-700">{kpi.target_value}</td>
                            {[2565, 2566, 2567, 2568, 2569].map(year => {
                              const entry = kpi.entries?.find((e: any) => Number(e.year) === year);
                              return (
                                <td key={year} className="px-3 py-3 text-center text-gray-500 text-xs">
                                  {entry ? <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">{entry.value}</span> : "-"}
                                </td>
                              );
                            })}
                            <td className="px-3 py-3 text-center">
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
                </div>
              ))}
            </div>
          )}

          {!selectedDept && !loading && (
            <div className="bg-white p-12 rounded-2xl border border-gray-200 shadow-sm text-center text-gray-400">
              <p className="text-base font-medium">กรุณาเลือกกลุ่มงาน และเลือกหอผู้ป่วย / หน่วยงานจากเมนูด้านซ้ายเพื่อดูข้อมูล</p>
            </div>
          )}

          {activeKpi && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
              <button onClick={() => setActiveKpi(null)} className="text-emerald-700 font-bold hover:underline text-sm">← ย้อนกลับไปตารางข้อมูล</button>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800">{activeKpi.name}</h3>
                  <ResponsiveContainer height={250} width="100%">
                    <BarChart data={[2565, 2566, 2567, 2568, 2569].map(y => {
                      const entry = activeKpi.entries?.find((e: any) => Number(e.year) === y);
                      return { year: y, value: entry ? parseFloat(entry.value) || 0 : 0 };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="year" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: '#f8fafc'}} />
                      <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
                      <ReferenceLine y={activeKpi.target_value} stroke="#f87171" strokeDasharray="3 3" label={{ value: 'Target', position: 'insideTopRight', fill: '#f87171', fontSize: 10 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border">
                  <h4 className="text-md font-bold mb-4 text-gray-700">บันทึกข้อมูลผลงาน</h4>
                  <AddEntryForm 
                    kpiId={activeKpi.id} 
                    type={activeKpi.type?.toLowerCase() || activeKpi.Type?.toLowerCase() || 'count'} 
                    deptId={selectedDept ? String(selectedDept.id) : ''}
                    onSuccess={() => { setActiveKpi(null); fetchData(); }} 
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {activeModal === 'audit' && selectedDept !== null && (
        <AuditChartModal
        isOpen={activeModal === 'audit'}
        onClose={() => setActiveModal(null)}
        departmentName={currentDeptObj?.Department || 'ไม่ระบุหน่วยงาน'}
        departmentId={selectedDept ? String(selectedDept.id) : ''}
        supabase={supabase}
        onSuccess={() => {
          setActiveModal(null);
        }}
      />
    )}

      {/* Modal: WP/QA */}
      {selectedDept && currentDeptObj && (
        <WpQaModal
          isOpen={activeModal === 'wp_qa'}
          onClose={() => setActiveModal(null)}
          departmentId={currentDeptObj.id}
          departmentName={currentDeptObj.Department}
          supabase={supabase}
          onSuccess={() => { fetchData(); }}
        />
      )}

      {/* Modal: IV Care */}
      {selectedDept && currentDeptObj && (
        <IvCareModal
          isOpen={activeModal === 'iv_care'}
          onClose={() => setActiveModal(null)}
          departmentId={currentDeptObj.id}
          departmentName={currentDeptObj.Department}
          supabase={supabase}
          onSuccess={() => { fetchData(); }}
        />
      )}

      {/* Modal: IV Care */}
      {selectedDept && currentDeptObj && (
        <FallCareModal
          isOpen={activeModal === 'fall'}
          onClose={() => setActiveModal(null)}
          departmentId={currentDeptObj.id}
          departmentName={currentDeptObj.Department}
          supabase={supabase}
          onSuccess={() => { fetchData(); }}
        />
      )}
    </div>
  );
}