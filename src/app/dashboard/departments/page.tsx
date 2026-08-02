'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import AddEntryForm from '@/components/AddEntryForm';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { getButtonStyle } from '@/utils/kpiCalculations';
import { ClipboardDocumentCheckIcon, ShieldExclamationIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import AuditChartModal from '@/components/AuditChartModal'; // ปรับตาม path จริง

export default function DepartmentPage() {
  const [data, setData] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [activeKpi, setActiveKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // State สำหรับควบคุม Modal ฟอร์มย่อยของหน่วยงาน
  const [activeModal, setActiveModal] = useState<string | null>(null); // 'audit' | 'iv' | 'fall'
  const [saving, setSaving] = useState(false);

  // Form State: IV Care
  const [ivData, setIvData] = useState({ record_date: '', total_iv_patients: 0, phlebitis_cases: 0, extravasation_cases: 0, infiltration_cases: 0, notes: '' });

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
  const currentDeptObj = data.find(d => String(d.id) === String(selectedDept));

  // ฟังก์ชันบันทึกข้อมูล IV Care
  const handleSaveIv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) return;
    setSaving(true);
    const { error } = await supabase.from('iv_care_records').insert([{
      ...ivData,
      department_id: Number(selectedDept)
    }]);
    setSaving(false);
    if (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } else {
      alert('บันทึกข้อมูล IV Care สำเร็จ');
      setActiveModal(null);
      setIvData({ record_date: '', total_iv_patients: 0, phlebitis_cases: 0, extravasation_cases: 0, infiltration_cases: 0, notes: '' });
    }
  };

  // ฟังก์ชันบันทึกข้อมูล Fall
  const handleSaveFall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) return;
    setSaving(true);
    const { error } = await supabase.from('fall_incident_records').insert([{
      ...fallData,
      department_id: Number(selectedDept)
    }]);
    setSaving(false);
    if (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } else {
      alert('บันทึกข้อมูล Fall สำเร็จ');
      setActiveModal(null);
      setFallData({ record_date: '', total_admissions: 0, fall_cases: 0, severity_level: 'ระดับ E ขึ้นไป', patient_hn: '', notes: '' });
    }
  };

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
                        setSelectedDept(String(dept.id));
                        setActiveKpi(null);
                        setActiveModal(null); // <-- เพิ่มบรรทัดนี้เพื่อเคลียร์ Modal ไม่ให้ค้างเปิดขึ้นมา
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        selectedDept === String(dept.id)
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
                    {currentDeptObj?.Department || 'ไม่ระบุหน่วยงาน'}
                  </h2>
                </div>

                {/* แถบปุ่มทางลัดฟอร์มบันทึก */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setActiveModal('audit')}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <ClipboardDocumentCheckIcon className="w-4 h-4 text-amber-300" />
                    <span>บันทึก Audit Chart</span>
                  </button>

                  <button
                    onClick={() => setActiveModal('iv')}
                    className="bg-teal-700 hover:bg-teal-800 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <ShieldExclamationIcon className="w-4 h-4 text-amber-300" />
                    <span>บันทึก IV Care</span>
                  </button>

                  <button
                    onClick={() => setActiveModal('fall')}
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
                    deptId={selectedDept || ''}
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
        departmentId={selectedDept}
        supabase={supabase}
        onSuccess={() => {
          setActiveModal(null);
        }}
      />
    )}
  

      {/* --- MODAL: บันทึก IV Care --- */}
      {activeModal === 'iv' && selectedDept !== null && (
        <div className="fixed inset-0 bg-emerald-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-emerald-100 space-y-4">
            <h3 className="text-lg font-extrabold text-emerald-950 flex items-center gap-2">
              <ShieldExclamationIcon className="w-6 h-6 text-teal-700" />
              บันทึกภาวะแทรกซ้อน IV Care ({currentDeptObj?.Department})
            </h3>
            <form onSubmit={handleSaveIv} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">วันที่บันทึก</label>
                <input type="date" required value={ivData.record_date} onChange={e => setIvData({...ivData, record_date: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">ผู้ป่วยใส่ IV ทั้งหมด</label>
                  <input type="number" required value={ivData.total_iv_patients} onChange={e => setIvData({...ivData, total_iv_patients: Number(e.target.value)})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phlebitis (เคส)</label>
                  <input type="number" value={ivData.phlebitis_cases} onChange={e => setIvData({...ivData, phlebitis_cases: Number(e.target.value)})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl text-sm font-bold">ยกเลิก</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-teal-700 text-white rounded-xl text-sm font-bold">{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: บันทึก Fall --- */}
      {activeModal === 'fall' && selectedDept !== null && (
        <div className="fixed inset-0 bg-emerald-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-emerald-100 space-y-4">
            <h3 className="text-lg font-extrabold text-emerald-950 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
              บันทึกอุบัติการณ์พลัดตกหกล้ม ({currentDeptObj?.Department})
            </h3>
            <form onSubmit={handleSaveFall} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">วันที่เกิดเหตุ</label>
                <input type="date" required value={fallData.record_date} onChange={e => setFallData({...fallData, record_date: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">จำนวน Admit ทั้งหมด</label>
                  <input type="number" required value={fallData.total_admissions} onChange={e => setFallData({...fallData, total_admissions: Number(e.target.value)})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">จำนวนเคส Fall</label>
                  <input type="number" required value={fallData.fall_cases} onChange={e => setFallData({...fallData, fall_cases: Number(e.target.value)})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ระดับความรุนแรง</label>
                <select 
                  value={fallData.severity_level} 
                  onChange={e => setFallData({...fallData, severity_level: e.target.value})} 
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white"
                >
                  <option value="ระดับ E ขึ้นไป">ระดับ E ขึ้นไป</option>
                  <option value="ระดับต่ำกว่า E">ระดับต่ำกว่า E</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">HN ผู้ป่วย (ถ้ามี)</label>
                <input 
                  type="text" 
                  value={fallData.patient_hn} 
                  onChange={e => setFallData({...fallData, patient_hn: e.target.value})} 
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" 
                  placeholder="ระบุ HN"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">หมายเหตุเพิ่มเติม</label>
                <textarea 
                  rows={2} 
                  value={fallData.notes} 
                  onChange={e => setFallData({...fallData, notes: e.target.value})} 
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                  placeholder="รายละเอียดเหตุการณ์..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl text-sm font-bold hover:bg-gray-300">ยกเลิก</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700">{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}