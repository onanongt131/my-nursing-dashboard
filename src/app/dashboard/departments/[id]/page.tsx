'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import AddEntryForm from '@/components/AddEntryForm';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { getButtonStyle } from '@/utils/kpiCalculations';
import { ClipboardDocumentCheckIcon, ExclamationTriangleIcon, CheckCircleIcon, EyeIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';
import { useParams, useRouter } from 'next/navigation';
import AuditChartModal from '@/components/AuditChartModal';
import WpQaModal from '@/components/WpQaModal'; 
import IvCareModal from '@/components/IvCareModal';
import FallCareModal from '@/components/FallCareModal';
import ReadmitModal from '@/components/ReadmitModal';
import AgainstMedicalAdviceModal from '@/components/AgainstMedicalAdviceModal';
import BatchDetailModal from '@/components/BatchDetailModal';

const YEARS = [2565, 2566, 2567, 2568, 2569] as const;

export default function SingleDepartmentPage() {
  const params = useParams();
  const router = useRouter();
  const deptId = params?.id as string;

  const [departmentData, setDepartmentData] = useState<any>(null);
  const [activeKpi, setActiveKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<'wp_qa' | 'iv_care' | 'fall' | 'audit' | 'readmit' | 'ama' | null>(null);
  
  // กำหนด State สำหรับจัดการสิทธิ์ (Admin เข้าได้ทุกหน้า และดูแลหน่วยงานหลัก ID: 1)
  const [userRole, setUserRole] = useState<string>('admin');
  const [canApprove, setCanApprove] = useState<boolean>(true);
  const [userDepartmentId, setUserDepartmentId] = useState<number | string>(1);

  const [allPendingRows, setAllPendingRows] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [showPendingTable, setShowPendingTable] = useState(false);
  
  const [monthlyRecords, setMonthlyRecords] = useState<{
    audit: any[];
    wp_qa: any[];
    iv_care: any[];
    fall: any[];
    readmit: any[];
    ama: any[];
  }>({
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

  const supabase = createClient();

  // ฟังก์ชันดึงข้อมูลผู้ใช้และสิทธิ์ โดยให้สิทธิ์ Admin สามารถเข้าถึงได้ทั้งหมด
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
        // กำหนด department_id ตามโปรไฟล์ หรือ fallback เป็น 1
        setUserDepartmentId(profile.department_id || 1);
        
        // ถ้าเป็น admin ให้มีสิทธิ์อนุมัติและเข้าถึงได้ทุกหน้าทันที
        if (role === 'admin') {
          setCanApprove(true);
        } else {
          const privilegedRoles = ['approver', 'supervisor', 'head_nurse'];
          setCanApprove(privilegedRoles.includes(role));
        }
      } else {
        // Fallback กรณีไม่พบข้อมูลโปรไฟล์ ให้ตั้งค่าเป็น Admin (ดูได้ทุกหน้า, dept_id: 1)
        setUserRole('admin');
        setUserDepartmentId(1);
        setCanApprove(true);
      }
    } catch (err) {
      console.error("Error fetching user permissions:", err);
      // Fallback กรณีเกิดข้อผิดพลาด
      setUserRole('admin');
      setUserDepartmentId(1);
      setCanApprove(true);
    }
  }, [supabase]);

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
      const tables = [
        { name: 'audit_records', key: 'audit' },
        { name: 'wp_qa_records', key: 'wp_qa' },
        { name: 'iv_care_records', key: 'iv_care' },
        { name: 'fall_records', key: 'fall' },
        { name: 'readmit_records', key: 'readmit' },
        { name: 'ama_records', key: 'ama' }
      ];

      const results: any = {};
      for (const t of tables) {
        const { data } = await supabase
          .from(t.name)
          .select('*')
          .eq('department_id', targetDeptId);
        results[t.key] = data || [];
      }
      setMonthlyRecords(results);
    } catch (err) {
      console.error("Error fetching monthly records:", err);
    }
  }, [supabase]);

  const fetchPendingApproval = useCallback(async (targetDeptId: string | number) => {
    setPendingLoading(true);
    try {
      let allPending: any[] = [];
      const tables = [
        { name: 'audit_records', type: 'audit' },
        { name: 'wp_qa_records', type: 'wp_qa' },
        { name: 'iv_care_records', type: 'iv_care' },
        { name: 'fall_records', type: 'fall' },
        { name: 'readmit_records', type: 'readmit' },
        { name: 'ama_records', type: 'ama' }
      ];

      for (const t of tables) {
        const { data, error } = await supabase
          .from(t.name)
          .select('*')
          .eq('department_id', targetDeptId)
          .eq('status', 'pending');

        if (!error && data && data.length > 0) {
          const groupedMap = data.reduce((acc: any, item: any) => {
            let month = item.audit_month || item.month || item.incident_date?.substring(0, 7) || item.admit_date?.substring(0, 7) || 'ไม่ระบุเดือน';
            if (!acc[month]) {
              acc[month] = {
                type: t.type,
                audit_month: month,
                auditor_name: item.auditor_name || item.evaluator || item.staff_name || '-',
                items: []
              };
            }
            acc[month].items.push(item);
            return acc;
          }, {});

          allPending = [...allPending, ...Object.values(groupedMap)];
        }
      }

      setAllPendingRows(allPending);
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
      const itemMonth = item.audit_month || item.month || item.incident_date?.substring(0, 7) || item.admit_date?.substring(0, 7) || '';
      return itemMonth.includes(prevMonthStr) || itemMonth.includes(thaiYearStr) || itemMonth === prevMonthStr;
    });
  };

  const totalPendingCount = allPendingRows.reduce((sum, batch: any) => sum + (batch.items?.length || 0), 0);

  if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูลหน่วยงาน...</div>;
  if (!departmentData) return <div className="p-8 text-center text-red-500">ไม่พบข้อมูลหน่วยงานนี้</div>;

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        <div className="border-b pb-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">หน่วยงานที่กำลังแสดงผล</span>
              {/* ป้ายแสดงสิทธิ์ Admin และบอกหน่วยงานที่ดูแล */}
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[10px] font-extrabold flex items-center gap-1">
                <ShieldCheckIcon className="w-3 h-3" /> สิทธิ์: {userRole.toUpperCase()}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              {departmentData.Department}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => {
                if (totalPendingCount > 0) {
                  setShowPendingTable(!showPendingTable);
                }
              }} 
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all ${
                totalPendingCount > 0 
                  ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 cursor-pointer' 
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-70'
              }`}
              disabled={totalPendingCount === 0}
            >
              {totalPendingCount > 0 && <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />}
              <span className={`${totalPendingCount > 0 ? 'bg-red-600 text-white' : 'bg-gray-300 text-gray-600'} px-2 py-0.5 rounded-full text-xs font-extrabold`}>
                {totalPendingCount}
              </span>
              <span>รออนุมัติ</span>
            </button>

            {/* Audit Chart */}
            {(() => {
              const needWarning = !hasSubmittedPreviousMonth(monthlyRecords.audit);
              return (
                <button 
                  onClick={() => setActiveModal('audit')} 
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                    needWarning ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse border-2 border-red-300' : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  }`}
                >
                  {needWarning ? <ExclamationTriangleIcon className="w-4 h-4 text-white" /> : <ClipboardDocumentCheckIcon className="w-4 h-4 text-amber-300" />}
                  <span>Audit Chart</span>
                  {needWarning && <span className="w-2 h-2 rounded-full bg-red-200 animate-ping ml-0.5" />}
                </button>
              );
            })()}

            {/* WP/QA */}
            {(() => {
              const needWarning = !hasSubmittedPreviousMonth(monthlyRecords.wp_qa);
              return (
                <button 
                  onClick={() => setActiveModal('wp_qa')} 
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                    needWarning ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse border-2 border-red-300' : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  }`}
                >
                  {needWarning ? <ExclamationTriangleIcon className="w-4 h-4 text-white" /> : <ClipboardDocumentCheckIcon className="w-4 h-4 text-emerald-300" />}
                  <span>WP/QA</span>
                  {needWarning && <span className="w-2 h-2 rounded-full bg-red-200 animate-ping ml-0.5" />}
                </button>
              );
            })()}

            {/* IV Care */}
            {(() => {
              const needWarning = !hasSubmittedPreviousMonth(monthlyRecords.iv_care);
              return (
                <button 
                  onClick={() => setActiveModal('iv_care')} 
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                    needWarning ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse border-2 border-red-300' : 'bg-cyan-700 hover:bg-cyan-800 text-white'
                  }`}
                >
                  {needWarning ? <ExclamationTriangleIcon className="w-4 h-4 text-white" /> : <CheckCircleIcon className="w-4 h-4 text-cyan-200" />}
                  <span>IV Care</span>
                  {needWarning && <span className="w-2 h-2 rounded-full bg-red-200 animate-ping ml-0.5" />}
                </button>
              );
            })()}

            {/* Fall */}
            {(() => {
              const needWarning = !hasSubmittedPreviousMonth(monthlyRecords.fall);
              return (
                <button 
                  onClick={() => setActiveModal('fall')} 
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                    needWarning ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse border-2 border-amber-300' : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  <ExclamationTriangleIcon className="w-4 h-4 text-white" />
                  <span>Fall</span>
                  {needWarning && <span className="w-2 h-2 rounded-full bg-amber-200 animate-ping ml-0.5" />}
                </button>
              );
            })()}

            {/* Re-admit */}
            {(() => {
              const needWarning = !hasSubmittedPreviousMonth(monthlyRecords.readmit);
              return (
                <button 
                  onClick={() => setActiveModal('readmit')} 
                  className={`px-3 py-2 rounded-xl text-sm font-bold shadow transition flex items-center gap-1.5 cursor-pointer ${
                    needWarning ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse border-2 border-red-300' : 'bg-teal-700 hover:bg-teal-800 text-white'
                  }`}
                >
                  {needWarning && <ExclamationTriangleIcon className="w-4 h-4 text-white" />}
                  <span>Re-admit</span>
                </button>
              );
            })()}

            {/* จำหน่ายไม่สมัครอยู่ */}
            {(() => {
              const needWarning = !hasSubmittedPreviousMonth(monthlyRecords.ama);
              return (
                <button 
                  onClick={() => setActiveModal('ama')} 
                  className={`px-4 py-2 rounded-xl text-sm font-bold shadow transition flex items-center gap-1.5 cursor-pointer ${
                    needWarning ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse border-2 border-red-300' : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  {needWarning && <ExclamationTriangleIcon className="w-4 h-4 text-white" />}
                  <span>จำหน่ายไม่สมัครอยู่</span>
                </button>
              );
            })()}

          </div>
        </div>
      </div>

      {/* --- Pending Table Section --- */}
      {showPendingTable && totalPendingCount > 0 && (
        <div className="border rounded-xl p-4 space-y-3 bg-red-50/60 border-red-200 shadow-sm transition-all">
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
                      <td className="p-3 text-center flex items-center justify-center gap-2">
                        <button 
                          onClick={() => {
                            setViewingBatchGroup({
                              type: batch.type,
                              audit_month: batch.audit_month,
                              items: batch.items,
                              auditor_name: batch.auditor_name,
                              status: batch.items?.[0]?.status || 'pending'
                            });
                          }} 
                          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold shadow-sm transition flex items-center gap-1 cursor-pointer"
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

      {/* KPI Tables / Active KPI Detail */}
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

      {/* --- Modals --- */}
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
          onSuccess={() => { 
            setActiveModal(null); 
            fetchPendingApproval(deptId); 
            fetchMonthlyRecords(deptId);
          }} 
        />
      )}

      <WpQaModal 
        isOpen={activeModal === 'wp_qa'} 
        onClose={() => setActiveModal(null)} 
        departmentId={deptId} 
        departmentName={departmentData?.Department} 
        supabase={supabase} 
        onSuccess={() => { fetchDepartmentData(); fetchPendingApproval(deptId); fetchMonthlyRecords(deptId); }} 
      />

      <IvCareModal 
        isOpen={activeModal === 'iv_care'} 
        onClose={() => setActiveModal(null)} 
        departmentId={deptId} 
        departmentName={departmentData?.Department} 
        supabase={supabase} 
        onSuccess={() => { fetchDepartmentData(); fetchPendingApproval(deptId); fetchMonthlyRecords(deptId); }} 
      />

      <FallCareModal 
        isOpen={activeModal === 'fall'} 
        onClose={() => setActiveModal(null)} 
        departmentId={deptId} 
        departmentName={departmentData?.Department} 
        supabase={supabase} 
        onSuccess={() => { fetchDepartmentData(); fetchPendingApproval(deptId); fetchMonthlyRecords(deptId); }} 
      />

      <ReadmitModal 
        isOpen={activeModal === 'readmit'} 
        onClose={() => setActiveModal(null)} 
        departmentId={deptId} 
        departmentName={departmentData?.Department} 
        supabase={supabase} 
        onSuccess={() => { fetchDepartmentData(); fetchPendingApproval(deptId); fetchMonthlyRecords(deptId); }} 
      /> 

      <AgainstMedicalAdviceModal 
        isOpen={activeModal === 'ama'} 
        onClose={() => setActiveModal(null)} 
        departmentId={deptId} 
        departmentName={departmentData?.Department} 
        supabase={supabase} 
        onSuccess={() => { fetchDepartmentData(); fetchPendingApproval(deptId); fetchMonthlyRecords(deptId); }} 
      /> 

    </div>
  );
}