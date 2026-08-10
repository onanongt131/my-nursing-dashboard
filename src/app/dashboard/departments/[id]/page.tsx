'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import AddEntryForm from '@/components/AddEntryForm';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { getButtonStyle } from '@/utils/kpiCalculations';
import { ClipboardDocumentCheckIcon, ExclamationTriangleIcon, CheckCircleIcon, EyeIcon, ShieldCheckIcon, Cog6ToothIcon } from '@heroicons/react/24/solid';
import { useParams } from 'next/navigation';
import AuditChartModal from '@/components/AuditChartModal';
import WpQaModal from '@/components/WpQaModal'; 
import IvCareModal from '@/components/IvCareModal';
import FallCareModal from '@/components/FallCareModal';
import ReadmitModal from '@/components/ReadmitModal';
import AgainstMedicalAdviceModal from '@/components/AgainstMedicalAdviceModal';
import BatchDetailModal from '@/components/BatchDetailModal';
import DepartmentEditor from '@/components/DepartmentEditor';

const YEARS = [2565, 2566, 2567, 2568, 2569] as const;

const RECORD_TABLES = [
  { name: 'nursing_chart_audits', key: 'audit' },
  { name: 'wp_qa_records', key: 'wp_qa' },
  { name: 'iv_care_data', key: 'iv_care' },
  { name: 'iv_care_complications', key: 'iv_care_comp' },
  { name: 'iv_care_monthly_summaries', key: 'iv_care_summary' },
  { name: 'fall_incident_records', key: 'fall' },
  { name: 'fall_monthly_summary', key: 'fall_summary' },
  { name: 'readmit_incident_records', key: 'readmit' },
  { name: 'readmit_monthly_summary', key: 'readmit_summary' },
  { name: 'ama_incident_records', key: 'ama' },
  { name: 'ama_monthly_summary', key: 'ama_summary' },
] as const;

export default function SingleDepartmentPage() {
  const params = useParams();
  const deptId = params?.id as string;

  const [departmentData, setDepartmentData] = useState<any>(null);
  const [activeKpi, setActiveKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<'wp_qa' | 'iv_care' | 'fall' | 'audit' | 'readmit' | 'ama' | null>(null);
  
  const [userRole, setUserRole] = useState<string>('admin');
  const [canApprove, setCanApprove] = useState<boolean>(true);
  const [userDepartmentId, setUserDepartmentId] = useState<number | string>(1);

  const [allPendingRows, setAllPendingRows] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [showPendingTable, setShowPendingTable] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  
  const [monthlyRecords, setMonthlyRecords] = useState<Record<string, any[]>>({
    audit: [],
    wp_qa: [],
    iv_care: [],
    fall: [],
    readmit: [],
    ama: []
  });
  
  const [viewingBatchGroup, setViewingBatchGroup] = useState<{ 
    type: string; 
    audit_month: string; 
    items: any[];
    auditor_name?: string;
    status?: string;
  } | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // 1. ดึงสิทธิ์ผู้ใช้
  const fetchUserPermissions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, department_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        const role = profile.role || 'admin';
        setUserRole(role);
        setUserDepartmentId(profile.department_id || 1);
        
        const privilegedRoles = ['approver', 'supervisor', 'head_nurse'];
        setCanApprove(role === 'admin' || privilegedRoles.includes(role));
      }
    } catch (err) {
      console.error("Error fetching user permissions:", err);
    }
  }, [supabase]);

  // 2. ดึงข้อมูลหน่วยงานและ KPI
  const fetchDepartmentData = useCallback(async () => {
    if (!deptId) return;
    setLoading(true);
    try {
      const [deptRes, kpiRes, entryRes, mapRes] = await Promise.all([
        supabase.from('departments').select('*').eq('id', deptId).single(),
        supabase.from('kpis').select('*'),
        supabase.from('kpi_entries').select('*').eq('department_id', deptId),
        supabase.from('kpi_department_map').select('department_id, kpi_id').eq('department_id', deptId)
      ]);

      if (deptRes.error || kpiRes.error || entryRes.error || mapRes.error) {
        console.error("Supabase Error:", deptRes.error || kpiRes.error || entryRes.error || mapRes.error);
        return;
      }

      const dept = deptRes.data;
      const kpis = kpiRes.data || [];
      const entries = entryRes.data || [];
      const maps = mapRes.data || [];

      const formattedDept = {
        ...dept,
        kpis: maps
          .map(m => {
            const kpiData = kpis.find(k => k.id === m.kpi_id);
            return kpiData ? {
              ...kpiData,
              entries: entries.filter(e => e.kpi_id === kpiData.id)
            } : null;
          })
          .filter(Boolean)
      };
      
      setDepartmentData(formattedDept);
    } catch (err) {
      console.error("Unexpected Error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, deptId]);

  const fetchMonthlyRecords = useCallback(async (targetDeptId: string | number) => {
    try {
      const results = await Promise.all(
        RECORD_TABLES.map(async t => {
          const { data } = await supabase.from(t.name).select('*').eq('department_id', targetDeptId);
          return { key: t.key, data: data || [] };
        })
      );

      const recordsMap = results.reduce((acc, curr) => {
        // หากมีหลายตารางที่ใช้ key เดียวกัน (เช่นหมวดหมู่ย่อย) สามารถรวมกันหรือแยกเก็บได้ตามต้องการ
        if (!acc[curr.key]) {
          acc[curr.key] = curr.data;
        } else {
          acc[curr.key] = [...acc[curr.key], ...curr.data];
        }
        return acc;
      }, {} as Record<string, any[]>);

      setMonthlyRecords(recordsMap);
    } catch (err) {
      console.error("Error fetching monthly records:", err);
    }
  }, [supabase]);

  const fetchPendingApproval = useCallback(async (targetDeptId: string | number) => {
  setPendingLoading(true);
  try {
    const results = await Promise.all(
      RECORD_TABLES.map(async t => {
        const { data, error } = await supabase
          .from(t.name)
          .select('*')
          .eq('department_id', targetDeptId)
          .eq('status', 'pending');

        if (!error && data && data.length > 0) {
          const groupedMap = data.reduce((acc: any, item: any) => {
            // เพิ่ม item.record_date เข้ามาตรวจสอบเป็นอันดับต้นๆ สำหรับตารางที่มีการบันทึกวันที่นี้
            const rawMonth = item.audit_month || item.month || item.record_date || item.incident_date || item.admit_date || item.created_at || '';
            const monthStr = typeof rawMonth === 'string' ? rawMonth : String(rawMonth || '');
            const month = monthStr.substring(0, 7) || 'ไม่ระบุเดือน';
            
            const groupKey = `${t.key}_${month}`;
            
            if (!acc[groupKey]) {
              acc[groupKey] = {
                type: t.key,
                audit_month: month,
                auditor_name: item.auditor_name || item.evaluator || item.staff_name || item.recorded_by || '-',
                items: []
              };
            }
            acc[groupKey].items.push({ ...item, source_table: t.name });
            return acc;
          }, {});
          return Object.values(groupedMap);
        }
        return [];
      })
    );

    setAllPendingRows(results.flat());
  } catch (err) {
    console.error("Error fetching pending:", err);
  } finally {
    setPendingLoading(false);
  }
}, [supabase]);

  useEffect(() => {
    fetchUserPermissions();
    fetchDepartmentData();
  }, [fetchUserPermissions, fetchDepartmentData]);

  useEffect(() => {
    if (deptId) {
      fetchPendingApproval(deptId);
      fetchMonthlyRecords(deptId);
    }
  }, [deptId, fetchPendingApproval, fetchMonthlyRecords]);
  
  const hasSubmittedPreviousMonth = (records: any[]) => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    
    const prevYear = now.getFullYear();
    const prevMonth = String(now.getMonth() + 1).padStart(2, '0');
    
    const prevMonthStr = `${prevYear}-${prevMonth}`;
    const thaiYearStr = `${prevYear + 543}-${prevMonth}`;

    return records.some(item => {
      const rawMonth = item.audit_month || item.month || item.incident_date?.substring(0, 7) || item.admit_date?.substring(0, 7) || '';
      const itemMonth = typeof rawMonth === 'string' ? rawMonth : String(rawMonth || '');
      return itemMonth.includes(prevMonthStr) || itemMonth.includes(thaiYearStr);
    });
  };

  const totalPendingCount = allPendingRows.reduce((sum, batch: any) => sum + (batch.items?.length || 0), 0);

  const canAccessDepartment = () => {
    if (userRole === 'admin') return true;
    return String(userDepartmentId) === String(deptId);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูลหน่วยงาน...</div>;

  if (!canAccessDepartment()) {
    return (
      <div className="p-12 text-center space-y-4 bg-white rounded-2xl border border-gray-200 max-w-xl mx-auto mt-10 shadow-sm">
        <div className="text-red-600 font-bold text-xl flex items-center justify-center gap-2">
          <ExclamationTriangleIcon className="w-6 h-6" />
          <span>คุณไม่มีสิทธิ์เข้าถึงข้อมูลของหน่วยงานนี้</span>
        </div>
      </div>
    );
  }

  if (!departmentData) return <div className="p-8 text-center text-red-500">ไม่พบข้อมูลหน่วยงานนี้</div>;

  const hasInfographicOrDetails = 
    departmentData.infographic_url || 
    departmentData.video_url || 
    departmentData.announcement || 
    departmentData.image_url;

  return (
    <div className="space-y-6">
      {/* 1. ส่วนหัว (Header) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b pb-4">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              หน่วยงานที่กำลังแสดงผล
            </span>
            <div className="flex items-center gap-3 mt-1">
              <h2 className="text-2xl font-bold text-gray-800">
                {departmentData.Department}
              </h2>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[10px] font-extrabold flex items-center gap-1">
                <ShieldCheckIcon className="w-3 h-3" /> สิทธิ์: {userRole.toUpperCase()}
              </span>
            </div>
          </div>

          {/* ปุ่มเมนูด้านขวา (Shortcut Modals & Pending) */}
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => totalPendingCount > 0 && setShowPendingTable(!showPendingTable)} 
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                totalPendingCount > 0 
                  ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 cursor-pointer' 
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-70'
              }`}
              disabled={totalPendingCount === 0}
            >
              {totalPendingCount > 0 && <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />}
              <span className={`${totalPendingCount > 0 ? 'bg-red-600 text-white' : 'bg-gray-300 text-gray-600'} px-1.5 py-0.5 rounded-full text-[10px] font-extrabold`}>
                {totalPendingCount}
              </span>
              <span>รออนุมัติ</span>
            </button>

            {/* ปุ่มเปิด Modal ระบบต่างๆ พร้อมเช็คสถานะการส่งข้อมูล */}
            {[
              { id: 'audit', label: 'Audit Chart', data: monthlyRecords.audit, color: 'bg-emerald-700 hover:bg-emerald-800' },
              { id: 'wp_qa', label: 'WP/QA', data: monthlyRecords.wp_qa, color: 'bg-emerald-700 hover:bg-emerald-800' },
              { id: 'iv_care', label: 'IV Care', data: monthlyRecords.iv_care, color: 'bg-cyan-700 hover:bg-cyan-800' },
              { id: 'fall', label: 'Fall', data: monthlyRecords.fall, color: 'bg-amber-600 hover:bg-amber-700' },
              { id: 'readmit', label: 'Re-admit', data: monthlyRecords.readmit, color: 'bg-teal-700 hover:bg-teal-800' },
              { id: 'ama', label: 'จำหน่ายไม่สมัครอยู่', data: monthlyRecords.ama, color: 'bg-amber-600 hover:bg-amber-700' },
            ].map(mod => {
              const needWarning = !hasSubmittedPreviousMonth(mod.data);
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModal(mod.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer text-white ${mod.color} ${
                    needWarning ? 'animate-pulse border-2 border-red-300' : ''
                  }`}
                >
                  {needWarning ? <ExclamationTriangleIcon className="w-3.5 h-3.5" /> : <CheckCircleIcon className="w-3.5 h-3.5" />}
                  <span>{mod.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. ส่วนเนื้อหาหลักแบ่ง 2 คอลัมน์ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* คอลัมน์ซ้าย: ข้อมูลแนะนำหน่วยงาน */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-4">
            <DepartmentEditor departmentId={deptId}/>
          </div>
        </div>

        {/* คอลัมน์ขวา: ตารางรออนุมัติ และ KPI / กราฟ */}
        <div className="lg:col-span-9 space-y-6">
          {/* ตารางรายการรออนุมัติ */}
          {showPendingTable && totalPendingCount > 0 && (
            <div className="border rounded-xl p-4 space-y-3 bg-red-50/60 border-red-200 shadow-sm">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-red-900 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-600 animate-pulse" />
                  <span>รายการรอการตรวจสอบและอนุมัติทั้งหมด</span>
                </h3>
                <button onClick={() => setShowPendingTable(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold px-2 py-1 bg-white rounded border shadow-sm cursor-pointer">
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
                          <td className="p-3 text-center">
                            <button 
                              onClick={() => setViewingBatchGroup({
                                type: batch.type,
                                audit_month: batch.audit_month,
                                items: batch.items,
                                auditor_name: batch.auditor_name,
                                status: batch.items?.[0]?.status || 'pending'
                              })} 
                              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold shadow-sm transition inline-flex items-center gap-1 cursor-pointer"
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

          {/* ตาราง KPI / กราฟ */}
          {!activeKpi ? (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
              {Object.entries(
                (departmentData?.kpis || []).reduce((acc: any, kpi: any) => {
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
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
              <button onClick={() => setActiveKpi(null)} className="text-emerald-700 font-bold hover:underline text-sm cursor-pointer">← ย้อนกลับไปตารางข้อมูล</button>
              
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
                    deptId={String(departmentData.id)}
                    onSuccess={() => { setActiveKpi(null); fetchDepartmentData(); }} 
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {showEditorModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-800">จัดการข้อมูลแนะนำหน่วยงาน</h3>
              <button onClick={() => setShowEditorModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">✕</button>
            </div>
            <DepartmentEditor departmentId={deptId} onClose={() => setShowEditorModal(false)} />
          </div>
        </div>
      )}

      {/* Modals สำหรับระบบงานต่างๆ */}
      {viewingBatchGroup && (
        <BatchDetailModal
          isOpen={!!viewingBatchGroup}
          onClose={() => setViewingBatchGroup(null)}
          batchGroup={viewingBatchGroup}
          departmentName={departmentData?.Department || ''}
          canApprove={canApprove}
          onApprove={() => {
            setViewingBatchGroup(null);
            fetchPendingApproval(deptId);
            fetchMonthlyRecords(deptId);
          }}
        />
      )}

      {activeModal === 'audit' && (
        <AuditChartModal 
          isOpen={true} 
          onClose={() => setActiveModal(null)} 
          departmentName={departmentData?.Department || 'ไม่ระบุหน่วยงาน'} 
          departmentId={String(deptId)} 
          supabase={supabase} 
          onSuccess={() => { setActiveModal(null); fetchPendingApproval(deptId); fetchMonthlyRecords(deptId); }} 
        />
      )}

      <WpQaModal isOpen={activeModal === 'wp_qa'} onClose={() => setActiveModal(null)} departmentId={deptId} departmentName={departmentData?.Department} supabase={supabase} onSuccess={() => { fetchDepartmentData(); fetchPendingApproval(deptId); fetchMonthlyRecords(deptId); }} />
      <IvCareModal isOpen={activeModal === 'iv_care'} onClose={() => setActiveModal(null)} departmentId={deptId} departmentName={departmentData?.Department} supabase={supabase} onSuccess={() => { fetchDepartmentData(); fetchPendingApproval(deptId); fetchMonthlyRecords(deptId); }} />
      <FallCareModal isOpen={activeModal === 'fall'} onClose={() => setActiveModal(null)} departmentId={deptId} departmentName={departmentData?.Department} supabase={supabase} onSuccess={() => { fetchDepartmentData(); fetchPendingApproval(deptId); fetchMonthlyRecords(deptId); }} />
      <ReadmitModal isOpen={activeModal === 'readmit'} onClose={() => setActiveModal(null)} departmentId={deptId} departmentName={departmentData?.Department} supabase={supabase} onSuccess={() => { fetchDepartmentData(); fetchPendingApproval(deptId); fetchMonthlyRecords(deptId); }} /> 
      <AgainstMedicalAdviceModal isOpen={activeModal === 'ama'} onClose={() => setActiveModal(null)} departmentId={deptId} departmentName={departmentData?.Department} supabase={supabase} onSuccess={() => { fetchDepartmentData(); fetchPendingApproval(deptId); fetchMonthlyRecords(deptId); }} /> 
    </div>
  );
}