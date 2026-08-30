'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import AddEntryForm from '@/components/AddEntryForm';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { getButtonStyle } from '@/utils/kpiCalculations';
import { ClipboardDocumentCheckIcon, ExclamationTriangleIcon, CheckCircleIcon, EyeIcon, ShieldCheckIcon, PrinterIcon, PlusCircleIcon, DocumentCheckIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/solid';
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

  // State สำหรับ Modal แสดงรายละเอียด ตัวตั้ง/ตัวหาร รายเดือน
  const [detailModalData, setDetailModalData] = useState<{
    kpi: any;
    year: number;
    entries: any[];
  } | null>(null);
  
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
          .map((m: any) => {
      const kpiData = kpis.find((k: any) => k.id === m.kpi_id);
          return kpiData ? {
            ...kpiData,
            entries: entries.filter((e: any) => e.kpi_id === kpiData.id)
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
    if (!targetDeptId) return;
    try {
      const results = await Promise.all(
        RECORD_TABLES.map(async t => {
          const { data, error } = await supabase.from(t.name).select('*').eq('department_id', targetDeptId);
          if (error) {
            return { key: t.key, data: [] };
          }
          return { key: t.key, data: data || [] };
        })
      );

      const recordsMap = results.reduce((acc, curr) => {
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
    if (!Array.isArray(records)) return false;
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const prevYear = now.getFullYear();
    const prevMonth = String(now.getMonth() + 1).padStart(2, '0');
    const prevMonthStr = `${prevYear}-${prevMonth}`;
    const thaiYearStr = `${prevYear + 543}-${prevMonth}`;

    return records.some(item => {
      if (!item) return false;
      const rawMonth = item.audit_month || item.month || item.incident_date?.substring(0, 7) || item.admit_date?.substring(0, 7) || '';
      const itemMonth = typeof rawMonth === 'string' ? rawMonth : String(rawMonth || '');
      return itemMonth.includes(prevMonthStr) || itemMonth.includes(thaiYearStr);
    });
  };

  const calculateTrend = (entries: any[]) => {
    if (!entries || entries.length < 2) return null;
    const sorted = [...entries].sort((a, b) => Number(a.year) - Number(b.year));
    const last = parseFloat(sorted[sorted.length - 1]?.value);
    const prev = parseFloat(sorted[sorted.length - 2]?.value);
    if (isNaN(last) || isNaN(prev)) return null;
    if (last > prev) return 'up';
    if (last < prev) return 'down';
    return 'stable';
  };

  const totalPendingCount = allPendingRows.reduce((sum, batch: any) => sum + (batch.items?.length || 0), 0);

  const canAccessDepartment = () => {
    if (userRole === 'admin') return true;
    return String(userDepartmentId) === String(deptId);
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">กำลังโหลดข้อมูลหน่วยงาน...</div>;

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

  if (!departmentData) return <div className="p-8 text-center text-red-500 font-medium">ไม่พบข้อมูลหน่วยงานนี้</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          header, 
          nav, 
          aside, 
          footer,
          .print\\:hidden,
          button,
          .department-sidebar-card {
            display: none !important;
          }
          body, html {
            background: white !important;
            color: #000 !important;
            font-size: 10pt;
            margin: 0 !important;
            padding: 0 !important;
          }
          table th:last-child,
          table td:last-child {
            display: none !important;
          }
          .print-report-container {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print-header-title {
            display: block !important;
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 6px 8px !important;
          }
        }
      `}</style>

      {/* 1. ส่วนหัวเว็บ ยุบรวม 3 ส่วนให้อยู่ในแถวเดียวกัน */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-md space-y-4 print:hidden">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-center lg:text-left">
            <span className="text-emerald-400 text-xs font-bold tracking-widest uppercase flex items-center gap-1">
              <span>🏥</span> กลุ่มภารกิจด้านการพยาบาล
            </span>
            <span className="text-slate-400 text-sm">/</span>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white">
              {departmentData.Department}
            </h1>
            <span className="text-slate-400 text-sm hidden md:inline">|</span>
            <span className="text-sm text-slate-300">
              ระบบรายงานตัวชี้วัดและผลการดำเนินงานคุณภาพทางการพยาบาล ประจำปีงบประมาณ 2569
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
            >
              <PrinterIcon className="w-4 h-4" /> พิมพ์รายงาน
            </button>

            <button 
              onClick={() => totalPendingCount > 0 && setShowPendingTable(!showPendingTable)} 
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                totalPendingCount > 0 
                  ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer animate-bounce' 
                  : 'bg-slate-800 text-slate-400 cursor-not-allowed opacity-60'
              }`}
              disabled={totalPendingCount === 0}
            >
              <span>รออนุมัติ ({totalPendingCount})</span>
            </button>
          </div>
        </div>

        {/* แถบปุ่มลงข้อมูลระบบงานต่างๆ */}
        <div className="pt-3 border-t border-emerald-800/60 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-emerald-300 mr-2 uppercase tracking-wide">ลงข้อมูลระบบ:</span>
          
          <button 
            onClick={() => setActiveModal('audit')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
              hasSubmittedPreviousMonth(monthlyRecords.audit) ? 'bg-emerald-700/80 text-white hover:bg-emerald-700' : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
            }`}
          >
            <DocumentCheckIcon className="w-4 h-4" />
            <span>Audit เวชระเบียน</span>
          </button>

          <button 
            onClick={() => setActiveModal('wp_qa')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
              hasSubmittedPreviousMonth(monthlyRecords.wp_qa) ? 'bg-emerald-700/80 text-white hover:bg-emerald-700' : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
            }`}
          >
            <PlusCircleIcon className="w-4 h-4" />
            <span>แนวปฏิบัติ (WP QA)</span>
          </button>

          <button 
            onClick={() => setActiveModal('iv_care')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
              hasSubmittedPreviousMonth(monthlyRecords.iv_care) ? 'bg-emerald-700/80 text-white hover:bg-emerald-700' : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
            }`}
          >
            <PlusCircleIcon className="w-4 h-4" />
            <span>ภาวะแทรกซ้อน IV</span>
          </button>

          <button 
            onClick={() => setActiveModal('fall')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
              hasSubmittedPreviousMonth(monthlyRecords.fall) ? 'bg-emerald-700/80 text-white hover:bg-emerald-700' : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
            }`}
          >
            <PlusCircleIcon className="w-4 h-4" />
            <span>พลัดตกหกล้ม</span>
          </button>

          <button 
            onClick={() => setActiveModal('readmit')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
              hasSubmittedPreviousMonth(monthlyRecords.readmit) ? 'bg-emerald-700/80 text-white hover:bg-emerald-700' : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
            }`}
          >
            <PlusCircleIcon className="w-4 h-4" />
            <span>Readmit</span>
          </button>

          <button 
            onClick={() => setActiveModal('ama')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
              hasSubmittedPreviousMonth(monthlyRecords.ama) ? 'bg-emerald-700/80 text-white hover:bg-emerald-700' : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
            }`}
          >
            <PlusCircleIcon className="w-4 h-4" />
            <span>จำหน่ายไม่สมัครใจ</span>
          </button>
        </div>
      </div>

      {/* 2. ส่วนเนื้อหาหลัก */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-3 space-y-4 print:hidden department-sidebar-card">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4">
            <DepartmentEditor departmentId={deptId}/>
          </div>
        </div>

        <div className="lg:col-span-9 space-y-6 print-report-container">
          <div className="hidden print-header-title">
            <h2 className="text-xl font-bold text-black">กลุ่มภารกิจด้านการพยาบาล</h2>
            <h1 className="text-2xl font-extrabold text-black mt-1">{departmentData.Department}</h1>
            <p className="text-xs text-gray-700 mt-1">รายงานสรุปตัวชี้วัดและผลการดำเนินงานคุณภาพทางการพยาบาล</p>
          </div>

          {showPendingTable && totalPendingCount > 0 && (
            <div className="border rounded-2xl p-4 space-y-3 bg-red-50/80 border-red-200 shadow-sm print:hidden">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-red-900 flex items-center gap-2 uppercase tracking-wider">
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-600 animate-pulse" />
                  <span>รายการรอการตรวจสอบและอนุมัติ</span>
                </h3>
                <button onClick={() => setShowPendingTable(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 bg-white rounded border shadow-sm cursor-pointer">
                  ปิด ✕
                </button>
              </div>
              <div className="overflow-x-auto bg-white rounded-xl border border-red-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-red-100/70 text-red-900">
                    <tr>
                      <th className="p-3">ประเภทระบบ</th>
                      <th className="p-3">ประจำเดือน</th>
                      <th className="p-3">จำนวน</th>
                      <th className="p-3">ผู้บันทึก</th>
                      <th className="p-3 text-center">สถานะ</th>
                      <th className="p-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allPendingRows.map((batch: any, index: number) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-800 uppercase">{batch.type}</td>
                        <td className="p-3 font-semibold text-slate-700">{batch.audit_month}</td>
                        <td className="p-3 text-red-600 font-bold">{batch.items.length} รายการ</td>
                        <td className="p-3 text-slate-600">{batch.auditor_name || '-'}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold text-[10px]">
                            Pending
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
                            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold shadow-sm transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <EyeIcon className="w-3.5 h-3.5" />
                            <span>ตรวจสอบ</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!activeKpi ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 print:p-0 print:border-none print:shadow-none">
              {Object.entries(
                (departmentData?.kpis || []).reduce((acc: any, kpi: any) => {
                  const dim = kpi.dimension || 'มิติอื่นๆ';
                  if (!acc[dim]) acc[dim] = [];
                  acc[dim].push(kpi);
                  return acc;
                }, {})
              )
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([dimName, kpisInDim]: [string, any], dimIndex) => (
                <div key={dimName} className="space-y-3 break-inside-avoid">
                  <div className="flex items-center gap-2 bg-emerald-50/70 border-l-4 border-emerald-600 px-3 py-2 rounded-r-xl print:bg-gray-100 print:border-black">
                    <span className="text-xs font-extrabold text-emerald-800 print:text-black uppercase tracking-wide">
                      มิติที่ {dimIndex + 1}: {dimName}
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 print:border-black">
                    <table className="w-full text-xs text-left border-collapse table-fixed">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 print:bg-gray-200 print:text-black">
                        <tr>
                          <th className="w-[38%] px-3 py-2.5">ตัวชี้วัด (KPI)</th>
                          <th className="w-[8%] px-2 py-2.5 text-center">GOAL</th>
                          {YEARS.map(y => <th key={y} className="w-[7%] px-1 py-2.5 text-center">{y}</th>)}
                          <th className="w-[9%] px-1 py-2.5 text-center">Trend</th>
                          <th className="w-[9%] px-2 py-2.5 text-center print:hidden">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 print:divide-black">
                        {kpisInDim.map((kpi: any) => {
                          const trend = calculateTrend(kpi.entries);
                          const kpiType = (kpi.type || kpi.Type || '').toLowerCase();
                          const isRatioOrPercent = kpiType === 'percent' || kpiType === 'rate';

                          return (
                            <tr key={kpi.id} className="hover:bg-slate-50/80">
                              <td className="px-3 py-2.5 font-medium text-slate-800 print:text-black leading-snug">
                                {kpi.name}
                              </td>
                              <td className="px-2 py-2.5 text-center font-bold text-emerald-700 print:text-black">
                                {kpi.target_value}
                              </td>
                              {YEARS.map(year => {
                                const entry = kpi.entries?.find((e: any) => Number(e.year) === year);
                                const hasNumDenom = isRatioOrPercent && entry && (entry.numerator !== null && entry.denominator !== null && entry.denominator !== undefined);

                                return (
                                  <td key={year} className="px-1 py-2.5 text-center text-slate-600 print:text-black">
                                    {entry ? (
                                      <span 
                                        onClick={() => {
                                          if (isRatioOrPercent) {
                                            setDetailModalData({ kpi, year, entries: kpi.entries || [] });
                                          }
                                        }}
                                        className={`inline-block bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold text-[11px] print:bg-transparent print:p-0 ${isRatioOrPercent ? 'cursor-pointer hover:bg-emerald-200 transition-all' : ''}`}
                                        title={isRatioOrPercent ? "คลิกเพื่อดูรายละเอียดตัวตั้ง/ตัวหาร" : undefined}
                                      >
                                        {entry.value}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 print:text-gray-400">-</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="px-1 py-2.5 text-center">
                                {trend === 'up' && (
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-bold text-[10px] gap-0.5">
                                    <ArrowTrendingUpIcon className="w-3.5 h-3.5" /> ขึ้น
                                  </span>
                                )}
                                {trend === 'down' && (
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full font-bold text-[10px] gap-0.5">
                                    <ArrowTrendingDownIcon className="w-3.5 h-3.5" /> ลง
                                  </span>
                                )}
                                {trend === 'stable' && (
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold text-[10px] gap-0.5">
                                    <MinusIcon className="w-3.5 h-3.5" /> คงที่
                                  </span>
                                )}
                                {!trend && <span className="text-slate-300">-</span>}
                              </td>
                              <td className="px-2 py-2.5 text-center print:hidden">
                                <button 
                                  onClick={() => setActiveKpi(kpi)} 
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold shadow-sm transition cursor-pointer"
                                >
                                  บันทึก
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <button 
                onClick={() => setActiveKpi(null)} 
                className="text-emerald-700 font-bold hover:underline text-xs flex items-center gap-1 cursor-pointer"
              >
                ← กลับสู่ตารางภาพรวมตัวชี้วัด
              </button>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 leading-snug">{activeKpi.name}</h3>
                  <div className="h-64">
                    <ResponsiveContainer height="100%" width="100%">
                      <BarChart data={YEARS.map(y => {
                        const entry = activeKpi.entries?.find((e: any) => Number(e.year) === y);
                        return { year: y, value: entry ? parseFloat(entry.value) || 0 : 0 };
                      })}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fontSize: 11}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11}} />
                        <Tooltip cursor={{fill: '#f1f5f9'}} />
                        <Bar dataKey="value" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={32} />
                        <ReferenceLine 
                          y={activeKpi.target_value} 
                          stroke="#ef4444" 
                          strokeDasharray="3 3" 
                          label={{ value: 'Target', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }} 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-bold mb-4 text-slate-700 uppercase tracking-wider">บันทึกข้อมูลผลงานย้อนหลัง / รายปี</h4>
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

      {/* Modal แสดงรายละเอียดตัวตั้ง / ตัวหาร รายเดือน */}
      {detailModalData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative border border-slate-100">
            <div className="flex justify-between items-start gap-4 border-b pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                  {detailModalData.kpi.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ประจำปีพุทธศักราช {detailModalData.year} (ชนิด KPI: {detailModalData.kpi.type || detailModalData.kpi.Type || 'percent'})
                </p>
              </div>
              <button 
                onClick={() => setDetailModalData(null)} 
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">เดือน</th>
                    <th className="p-3.5 text-center">ตัวตั้ง (NUMERATOR)</th>
                    <th className="p-3.5 text-center">ตัวหาร (DENOMINATOR)</th>
                    <th className="p-3.5 text-center">ผลลัพธ์ (RESULT)</th>
                    <th className="p-3.5 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detailModalData.entries
                    .filter((e: any) => Number(e.year) === detailModalData.year)
                    .map((entry: any, index: number) => (
                      <tr key={index} className="hover:bg-slate-50/80">
                        <td className="p-3.5 font-bold text-slate-800">
                          {entry.month || entry.audit_month || 'ภาพรวมปี'}
                        </td>
                        <td className="p-3.5 text-center font-semibold text-slate-700">
                          {entry.numerator ?? '-'}
                        </td>
                        <td className="p-3.5 text-center font-semibold text-slate-700">
                          {entry.denominator ?? '-'}
                        </td>
                        <td className="p-3.5 text-center font-bold text-pink-600 text-sm">
                          {entry.value ?? '-'}
                        </td>
                        <td className="p-3.5 text-center">
                          <button 
                            onClick={async () => {
                              if (confirm('คุณต้องการลบข้อมูลรายการนี้ใช่หรือไม่?')) {
                                const { error } = await supabase
                                  .from('kpi_entries')
                                  .delete()
                                  .eq('id', entry.id)
                                  .eq('department_id', deptId); // เพิ่มความปลอดภัยให้ตรงกับหน่วยงานปัจจุบัน

                                if (!error) {
                                  fetchDepartmentData();
                                  setDetailModalData(null);
                                } else {
                                  alert('เกิดข้อผิดพลาดในการลบข้อมูล: ' + error.message);
                                }
                              }
                            }}
                            className="px-3 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg font-bold text-xs transition cursor-pointer"
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))}
                  {detailModalData.entries.filter((e: any) => Number(e.year) === detailModalData.year).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 font-medium">
                        ไม่พบข้อมูลรายเดือนสำหรับปีนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setDetailModalData(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditorModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-md font-bold text-slate-800">จัดการข้อมูลแนะนำหน่วยงาน</h3>
              <button onClick={() => setShowEditorModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
            </div>
            <DepartmentEditor departmentId={deptId} onClose={() => setShowEditorModal(false)} />
          </div>
        </div>
      )}

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
          supabase={supabase}
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