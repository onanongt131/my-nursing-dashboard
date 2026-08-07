'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import AddEntryForm from '@/components/AddEntryForm';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { getButtonStyle } from '@/utils/kpiCalculations';
import { ClipboardDocumentCheckIcon, ExclamationTriangleIcon, CheckCircleIcon, EyeIcon } from '@heroicons/react/24/solid';
import AuditChartModal from '@/components/AuditChartModal'; 
import WpQaModal from '@/components/WpQaModal'; 
import IvCareModal from '@/components/IvCareModal'; 
import FallCareModal from '@/components/FallCareModal'; 
import ReadmitModal from '@/components/ReadmitModal';
import AgainstMedicalAdviceModal from '@/components/AgainstMedicalAdviceModal';
import BatchDetailModal from '@/components/BatchDetailModal';

const YEARS = [2565, 2566, 2567, 2568, 2569] as const;

export default function DepartmentPage() {
  const [data, setData] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [activeKpi, setActiveKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAuditItem, setSelectedAuditItem] = useState<any>(null);
  const [activeModal, setActiveModal] = useState<'wp_qa' | 'iv_care' | 'fall' | 'audit' | 'readmit' | 'ama' | null>(null);
  const [selectedDept, setSelectedDept] = useState<{ id: string | number; name: string } | null>(null);
  const [auditModalMode, setAuditModalMode] = useState<'form' | 'pending'>('form');
  
  // State สำหรับจัดการ Tab ในส่วนการแสดงผลข้อมูลหน่วยงาน ('cases' = ตารางรายเคส, 'summary' = สรุปรายเดือน)
  const [activeTab, setActiveTab] = useState<'cases' | 'summary'>('cases');
  
  // ปรับเปลี่ยน State ของรายการรออนุมัติให้เก็บรวมทุกประเภท
  const [pendingItems, setPendingItems] = useState<{
    wp_qa: any[];
    audit: any[];
    iv_care: any[];
    fall: any[];
    readmit: any[];
    ama: any[];
  }>({ wp_qa: [], audit: [], iv_care: [], fall: [], readmit: [], ama: [] });

  const [pendingLoading, setPendingLoading] = useState(false);
  const [showPendingTable, setShowPendingTable] = useState(false);
  
  const [viewingBatchGroup, setViewingBatchGroup] = useState<{ 
    type: 'wp_qa' | 'audit' | 'iv_care' | 'fall' | 'readmit' | 'ama'; 
    audit_month: string; 
    items: any[];
    auditor_name?: string;
    evaluator?: string;
    status?: string;
  } | null>(null);

  const [userProfile, setUserProfile] = useState<any>({
    role: 'admin',
    department_id: 1
  });

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let profileData = null;
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*, departments(group)')
          .eq('id', user.id)
          .maybeSingle();
        profileData = data;
        setUserProfile(data);
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
      if (profileData?.role) {
        const { role, department_id: userDeptId } = profileData;
        const userGroup = (profileData.departments as any)?.group;
        if (role === 'staff' || role === 'head_department') {
          depts = depts.filter(d => d.id === userDeptId);
        } else if (role === 'head_group' && userGroup) {
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
              entries: entries.filter(e => e.kpi_id === kpiData.id && e.department_id === Number(dept.id))
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
  }, [supabase]);

  // ฟังก์ชันดึงข้อมูลรออนุมัติ
  const fetchPendingApproval = useCallback(async (deptId: string | number) => {
    setPendingLoading(true);
    try {
      const [wpRes, auditRes, ivRes, fallRes, readmitRes, amaRes] = await Promise.all([
        supabase.from('wp_qa_records').select('*').eq('department_id', deptId).eq('status', 'pending'),
        supabase.from('nursing_chart_audits').select('*').eq('department_id', deptId).eq('status', 'pending'),
        supabase.from('iv_care_records').select('*').eq('department_id', deptId).eq('status', 'pending'),
        supabase.from('fall_care_records').select('*').eq('department_id', deptId).eq('status', 'pending'),
        supabase.from('readmit_incident_records').select('*').eq('department_id', deptId).eq('status', 'pending'),
        supabase.from('ama_incident_records').select('*').eq('department_id', deptId).eq('status', 'pending'),
      ]);
      setPendingItems({
        wp_qa: wpRes.data || [],
        audit: auditRes.data || [],
        iv_care: ivRes.data || [],
        fall: fallRes.data || [],
        readmit: readmitRes.data || [],
        ama: amaRes.data || [],
      });
    } catch (err) {
      console.error("Error fetching pending records:", err);
    } finally {
      setPendingLoading(false);
    }
  }, [supabase]);
  
  const canApprove = (targetDeptId: string | number) => {
    if (!userProfile) return false;
    const { role, department_id } = userProfile;
    if (role === 'admin') return true; 
    const allowedRoles = ['head_department', 'head_group', 'head_nurse'];
    if (allowedRoles.includes(role) && Number(department_id) === Number(targetDeptId)) {
      return true;
    }
    return false;
  };

  const handleApproveBatch = async (type: 'wp_qa' | 'audit' | 'iv_care' | 'fall' | 'readmit' | 'ama', auditMonth: string) => {
    if (!selectedDept) return;
    
    const tableMap = {
      wp_qa: 'wp_qa_records',
      audit: 'nursing_chart_audits',
      iv_care: 'iv_care_records',
      fall: 'fall_care_records',
      readmit: 'readmit_incident_records',
      ama: 'ama_incident_records'
    };
    try {
      const { error } = await supabase
        .from(tableMap[type])
        .update({ status: 'approved' })
        .eq('department_id', selectedDept.id)
        .eq('status', 'pending');
        
      if (error) throw error;
      alert(`อนุมัติรายการ ${type.toUpperCase()} ประจำเดือน ${auditMonth} สำเร็จ`);
      setViewingBatchGroup(null); 
      fetchPendingApproval(selectedDept.id);
      fetchData();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการอนุมัติ: ' + err.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedDept) {
      fetchPendingApproval(selectedDept.id);
      setShowPendingTable(false);
    } else {
      setPendingItems({ wp_qa: [], audit: [], iv_care: [], fall: [], readmit: [], ama: [] });
      setShowPendingTable(false);
    }
  }, [selectedDept, fetchPendingApproval]);


  const uniqueGroups = Array.from(new Set(data.map(d => d.group))).filter(Boolean) as string[];
  const filteredDepartments = data.filter(d => d.group === selectedGroup);
  const currentDeptObj = data.find(d => String(d.id) === String(selectedDept?.id));
  
  const totalPendingCount = Object.values(pendingItems).reduce((sum, arr) => sum + arr.length, 0);

  const getGroupedList = (items: any[], typeName: any) => {
    const groupedMap = items.reduce((acc: any, item: any) => {
      let month = item.audit_month || item.month || item.incident_date?.substring(0, 7) || item.admit_date?.substring(0, 7);
      if (!month) month = 'ไม่ระบุเดือน';
      if (!acc[month]) {
        acc[month] = {
          type: typeName,
          audit_month: month,
          auditor_name: item.auditor_name || item.evaluator || item.staff_name || '-',
          items: []
        };
      }
      acc[month].items.push(item);
      return acc;
    }, {});
    return Object.values(groupedMap);
  };

  const allPendingRows = [
    ...getGroupedList(pendingItems.wp_qa, 'wp_qa'),
    ...getGroupedList(pendingItems.audit, 'audit'),
    ...getGroupedList(pendingItems.iv_care, 'iv_care'),
    ...getGroupedList(pendingItems.fall, 'fall'),
    ...getGroupedList(pendingItems.readmit, 'readmit'),
    ...getGroupedList(pendingItems.ama, 'ama'),
  ];

  if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูลหน่วยงาน...</div>;

  return (
    <div className="px-2 py-2 max-w-full mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
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
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
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
        {/* --- Content --- */}
        <div className="lg:col-span-4 space-y-6">
          {selectedDept && !activeKpi && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                
                <div className="border-b pb-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                  <div>
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">หน่วยงานที่กำลังแสดงผล</span>
                    <h2 className="text-xl font-bold text-gray-800">
                      {currentDeptObj?.Department || selectedDept.name}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {totalPendingCount > 0 && (
                      <button
                        onClick={() => setShowPendingTable(!showPendingTable)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all shadow-sm border cursor-pointer ${
                          showPendingTable ? "bg-red-100 border-red-300 ring-2 ring-red-400" : "bg-red-50 hover:bg-red-100 border-red-200"
                        }`}
                      >
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-500 animate-pulse" />
                        <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
                          {totalPendingCount} รออนุมัติ
                        </span>
                      </button>
                    )}
                    <button onClick={() => setActiveModal('audit')} className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all">
                      <ClipboardDocumentCheckIcon className="w-4 h-4 text-amber-300" />
                      <span>Audit Chart</span>
                    </button>
                    <button onClick={() => setActiveModal('wp_qa')} className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all">
                      <ClipboardDocumentCheckIcon className="w-4 h-4 text-emerald-300" />
                      <span>WP/QA</span>
                    </button>

                    <button onClick={() => setActiveModal('iv_care')} className="bg-cyan-700 hover:bg-cyan-800 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all">
                      <CheckCircleIcon className="w-4 h-4 text-cyan-200" />
                      <span>IV Care</span>
                    </button>

                    <button onClick={() => setActiveModal('fall')} className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all">
                      <ExclamationTriangleIcon className="w-4 h-4 text-white" />
                      <span>Fall</span>
                    </button>
                    <button
                        onClick={() => setActiveModal('readmit')}
                        className="bg-teal-700 hover:bg-teal-800 text-white px-3 py-2 rounded-xl text-sm font-bold shadow transition flex items-center gap-1.5"
                      >
                        <span>Re-admit</span>
                    </button>

                    <button
                      onClick={() => setActiveModal('ama')}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow transition flex items-center gap-1.5"
                    >
                      <span>จำหน่ายไม่สมัครอยู่</span>
                    </button>
                  </div>
                </div>
              </div>
                {/* --- Pending Table Section (รวมทุกระบบ) --- */}
                {showPendingTable && totalPendingCount > 0 && (
                  <div className="border rounded-xl p-4 space-y-3 bg-red-50/60 border-red-200 shadow-sm transition-all animate-fadeIn">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-red-900 flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-4 h-4 text-red-600 animate-pulse" />
                        <span>รายการรอการตรวจสอบและอนุมัติทั้งหมด (WP/QA, Audit Chart, IV Care, Fall Care, Re-admit, A.M.A.)</span>
                      </h3>
                      <button onClick={() => setShowPendingTable(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold px-2 py-1 bg-white rounded border shadow-sm">
                        ซ่อนตาราง ✕
                      </button>
                    </div>
                    {pendingLoading ? (
                      <p className="text-xs text-gray-500 py-2">กำลังโหลดรายการรออนุมัติ...</p>
                    ) : (
                      <div className="overflow-x-auto bg-white rounded-lg border border-red-200">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-red-100 text-red-900">
                            <tr>
                              <th className="p-3">ประเภทระบบ</th>
                              <th className="p-3">ประจำเดือน</th>
                              <th className="p-3">จำนวนรายการ</th>
                              <th className="p-3">ผู้บันทึก / ผู้ประเมิน</th>
                              <th className="p-3 text-center">สถานะ</th>
                              <th className="p-3 text-center">จัดการ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {allPendingRows.map((batch: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="p-3 font-bold text-emerald-800 uppercase">{batch.type}</td>
                                <td className="p-3 font-bold text-gray-800">{batch.audit_month}</td>
                                <td className="p-3 text-red-700 font-semibold">{batch.items.length} รายการ</td>
                                <td className="p-3">{batch.auditor_name || '-'}</td>
                                <td className="p-3 text-center">
                                  <span className="px-2.5 py-0.5 bg-red-100 text-red-800 rounded-full font-bold text-[10px] animate-pulse">
                                    Pending (รออนุมัติ)
                                  </span>
                                </td>
                                <td className="p-3 text-center flex items-center justify-center gap-2">
                                  <button 
                                    onClick={() => {
                                      if (batch.type === 'audit') {
                                        setSelectedAuditItem({
                                          audit_month: batch.audit_month,
                                          items: batch.items
                                        });
                                        setAuditModalMode('pending');
                                        setActiveModal('audit');
                                      } else {
                                        setViewingBatchGroup({
                                          type: batch.type,
                                          audit_month: batch.audit_month,
                                          items: batch.items,
                                          auditor_name: batch.auditor_name,
                                          status: batch.items?.[0]?.status || 'pending'
                                        });
                                      }
                                    }} 
                                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold shadow-sm transition flex items-center gap-1"
                                  >
                                    <EyeIcon className="w-4 h-4" />
                                    <span>ดูรายละเอียด</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

{/* KPI Tables */}
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
            {YEARS.map(y => <th key={y} className="w-[8%] px-3 py-3 text-center">{y}</th>)}
            <th className="w-[10%] px-3 py-3 text-center">ACTION</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {kpisInDim.map((kpi: any) => (
            <tr key={kpi.id} className="hover:bg-gray-50">
              <td className="px-3 py-3 text-gray-800">{kpi.name}</td>
              <td className="px-3 py-3 text-center font-bold text-gray-700">{kpi.target_value}</td>
              {YEARS.map(year => {
                const entry = kpi.entries?.find((e: any) => Number(e.year) === year);
                return (
                  <td key={year} className="px-3 py-3 text-center text-gray-500 text-xs">
                    {entry ? <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">{entry.value}</span> : "-"}
                  </td>
                );
              })}
              <td className="px-3 py-3 text-center">
                <button onClick={() => setActiveKpi(kpi)} className={getButtonStyle(kpi.entries || [], kpi.frequency || kpi.Frequency || 'yearly')}>
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
          <BarChart data={YEARS.map(y => {
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

{/* --- เรียกใช้งาน Component Modal ที่ปรับปรุงแล้ว --- */}
<BatchDetailModal
  isOpen={!!viewingBatchGroup}
  onClose={() => setViewingBatchGroup(null)}
  batchGroup={viewingBatchGroup}
  departmentName={currentDeptObj?.Department || selectedDept?.name || ''}
  canApprove={canApprove(selectedDept?.id || '')}
  onApprove={(type, month) => {
  handleApproveBatch(type as any, month);
  setViewingBatchGroup(null);
}}
/>

{activeModal === 'audit' && selectedDept && (
  <AuditChartModal 
    isOpen={true} 
    onClose={() => {
      setActiveModal(null);
      setSelectedAuditItem(null);
    }} 
    departmentName={currentDeptObj?.Department || 'ไม่ระบุหน่วยงาน'} 
    departmentId={String(selectedDept.id)} 
    supabase={supabase} 
    initialMode={auditModalMode}
    initialData={selectedAuditItem}
    onSuccess={() => { 
      setActiveModal(null); 
      setSelectedAuditItem(null);
      fetchPendingApproval(currentDeptObj.id); 
    }} 
  />
)}

{selectedDept && currentDeptObj && (
      <>
        <WpQaModal isOpen={activeModal === 'wp_qa'} onClose={() => setActiveModal(null)} departmentId={currentDeptObj.id} departmentName={currentDeptObj.Department} supabase={supabase} onSuccess={() => { fetchData(); fetchPendingApproval(currentDeptObj.id); }} />
        <IvCareModal isOpen={activeModal === 'iv_care'} onClose={() => setActiveModal(null)} departmentId={currentDeptObj.id} departmentName={currentDeptObj.Department} supabase={supabase} onSuccess={() => { fetchData(); fetchPendingApproval(currentDeptObj.id); }} />
        <FallCareModal isOpen={activeModal === 'fall'} onClose={() => setActiveModal(null)} departmentId={currentDeptObj.id} departmentName={currentDeptObj.Department} supabase={supabase} onSuccess={() => { fetchData(); fetchPendingApproval(currentDeptObj.id); }} />
        <ReadmitModal isOpen={activeModal === 'readmit'} onClose={() => setActiveModal(null)} departmentId={currentDeptObj.id} departmentName={currentDeptObj.Department} supabase={supabase} onSuccess={() => { fetchData(); fetchPendingApproval(currentDeptObj.id); }} /> 
        <AgainstMedicalAdviceModal isOpen={activeModal === 'ama'} onClose={() => setActiveModal(null)} departmentId={currentDeptObj.id} departmentName={currentDeptObj.Department} supabase={supabase} onSuccess={() => { fetchData(); fetchPendingApproval(currentDeptObj.id); }} /> 
      </>
    )}
      </div>
)}
 </div>
 </div>
 </div>
 )}
