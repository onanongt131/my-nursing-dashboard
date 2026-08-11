'use client';

import React, { useState } from 'react';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface BatchItem {
  id?: string | number;
  source_table?: string;
  wp_id?: string;
  wp_name?: string;
  total_evaluated?: number;
  total_practiced?: number;
  hn?: string;
  an?: string;
  admit_date?: string;
  admit_diagnosis?: string;
  previous_discharge_date?: string;
  discharge_ward?: string;
  cause_patient?: string;
  cause_discharge_planning?: string;
  cause_disease_condition?: string;
  fall_date?: string;
  incident_date?: string;
  severity?: string;
  detail?: string;
  description?: string;
  discharge_date?: string;
  treatment_right?: string;
  ama_reason?: string;
  reason?: string;
  cause?: string;
  record_date?: string;
  complication?: string;
  issue?: string;
  grade?: string | number;
  site?: string;
  route?: string;
  factor_drug?: string;
  factor_patient?: string;
  factor_personnel?: string;
  audit_month?: string;
  month?: string;
  total_infusion_days?: number;
  total_sites?: number;
  total_punctures?: number;
  first_attempt_punctures?: number;
  total_falls?: number;
  fall_count?: number;
  total_cases?: number;
  note?: string;
  fiscal_year?: string | number;
  patient_days?: number;
  status?: string;
  [key: string]: any;
}

interface BatchGroup {
  type: string;
  audit_month: string;
  items: BatchItem[];
  auditor_name?: string;
  evaluator?: string;
  department_id?: number | string;
}

interface BatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchGroup: BatchGroup | null;
  departmentName: string;
  canApprove: boolean;
  onApprove: (type: string, audit_month: string) => void;
  onApproveSingle?: (item: BatchItem) => void;
  supabase?: any;
}

export default function BatchDetailModal({
  isOpen,
  onClose,
  batchGroup,
  departmentName,
  canApprove,
  onApprove,
  onApproveSingle,
  supabase
}: BatchDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedAuditItem, setSelectedAuditItem] = useState<BatchItem | null>(null);

  if (!isOpen || !batchGroup) return null;

  const typeLower = batchGroup.type.toLowerCase();
  const isNursingChartAudit = typeLower.includes('audit') || typeLower.includes('nursing_chart');
  const isWpQa = typeLower.includes('wp') || typeLower.includes('qa');
  const isReadmit = typeLower.includes('readmit');
  const isFall = typeLower.includes('fall');
  const isFallSummary = isFall && typeLower.includes('summary');
  const isAma = typeLower.includes('ama');
  const isIvCare = typeLower.includes('iv');
  const isIvCareSummary = isIvCare && typeLower.includes('summary');
  const isSummaryData = isFallSummary || isIvCareSummary || typeLower.includes('summary');

  const handleApproveAll = async () => {
    const activeSupabase = supabase; 
    if (!activeSupabase) {
      alert('ไม่พบการเชื่อมต่อ Supabase Client');
      return;
    }

    const auditMonthStr = String(batchGroup.audit_month || '').trim();
    if (!confirm(`คุณต้องการอนุมัติข้อมูลประจำเดือน ${auditMonthStr} ทั้งหมดใช่หรือไม่?`)) return;

    setLoading(true);
    try {
      const targetTable = 'nursing_chart_audit_records';
      const ids = batchGroup.items.map(item => item.id).filter(Boolean);

      let query = activeSupabase.from(targetTable).update({ status: 'approved' });
      if (ids.length > 0) {
        query = query.in('id', ids);
      } else {
        query = query.eq('audit_month', auditMonthStr);
      }

      const { error } = await query.select();
      if (error) throw error;

      alert('อนุมัติและบันทึกข้อมูลสำเร็จเรียบร้อย');
      onApprove(batchGroup.type, batchGroup.audit_month);
      onClose();
    } catch (err: any) {
      console.error('Approval error:', err);
      alert(`เกิดข้อผิดพลาดในการอนุมัติ: ${err?.message || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSingleApproval = async (item: BatchItem) => {
    if (onApproveSingle) {
      onApproveSingle(item);
    } else {
      const activeSupabase = supabase;
      if (!activeSupabase || !item.id) return;

      try {
        setLoading(true);
        const { error } = await activeSupabase
          .from('nursing_chart_audit_records')
          .update({ status: 'approved' })
          .eq('id', item.id);

        if (error) throw error;
        
        alert('อนุมัติรายการนี้สำเร็จ');
        item.status = 'approved';
        setSelectedAuditItem({ ...item });
      } catch (err: any) {
        alert('เกิดข้อผิดพลาด: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-6xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] flex flex-col">
        
        {/* หัวข้อ Modal หลัก */}
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase">
              รายละเอียดผลการประเมิน ({batchGroup.type.toUpperCase()})
            </span>
            <h3 className="text-lg font-bold text-gray-900">ประจำเดือน / วันที่: {batchGroup.audit_month}</h3>
          </div>
          <button 
            onClick={onClose} 
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* ข้อมูลสรุปย่อ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div><span className="font-semibold text-gray-500">หน่วยงาน:</span> {departmentName}</div>
          <div><span className="font-semibold text-gray-500">ผู้ประเมิน:</span> {batchGroup.auditor_name || batchGroup.evaluator || '-'}</div>
          <div><span className="font-semibold text-gray-500">สถานะรวม:</span> <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">รออนุมัติ</span></div>
        </div>

        {/* ตารางแสดงรายการ */}
        <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            รายการข้อมูล ({batchGroup.items.length} รายการ)
          </h4>
          <div className="border border-gray-200 rounded-xl overflow-y-auto flex-1 max-h-96">
            {isWpQa ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-emerald-100 text-emerald-900 sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5">รหัส WP</th>
                    <th className="p-2.5">หัวข้อ WP</th>
                    <th className="p-2.5 text-center">ประเมินแล้ว</th>
                    <th className="p-2.5 text-center">ปฏิบัติจริง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {batchGroup.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-2.5 font-bold text-emerald-800">{item.wp_id}</td>
                      <td className="p-2.5 text-gray-800">{item.wp_name}</td>
                      <td className="p-2.5 text-center font-semibold">{item.total_evaluated}</td>
                      <td className="p-2.5 text-center font-semibold text-emerald-600">{item.total_practiced}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : isReadmit ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-teal-100 text-teal-900 sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5 text-center">ลำดับ</th>
                    <th className="p-2.5">HN</th>
                    <th className="p-2.5">AN</th>
                    <th className="p-2.5">วันที่ Admit</th>
                    <th className="p-2.5">การวินิจฉัยโรคแรกรับ</th>
                    <th className="p-2.5">วันที่จำหน่ายเดิม</th>
                    <th className="p-2.5">หอผู้ป่วยเดิม</th>
                    <th className="p-2.5">สาเหตุ (ผู้ป่วย)</th>
                    <th className="p-2.5">สาเหตุ (D/C Plan)</th>
                    <th className="p-2.5">สาเหตุ (ตัวโรค)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {batchGroup.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-2.5 text-center font-bold">{idx + 1}</td>
                      <td className="p-2.5 font-semibold text-teal-800">{item.hn || '-'}</td>
                      <td className="p-2.5">{item.an || '-'}</td>
                      <td className="p-2.5">{item.admit_date || '-'}</td>
                      <td className="p-2.5 text-gray-800">{item.admit_diagnosis || '-'}</td>
                      <td className="p-2.5">{item.previous_discharge_date || '-'}</td>
                      <td className="p-2.5">{item.discharge_ward || '-'}</td>
                      <td className="p-2.5 font-medium text-emerald-700">{item.cause_patient || '-'}</td>
                      <td className="p-2.5 font-medium text-blue-700">{item.cause_discharge_planning || '-'}</td>
                      <td className="p-2.5 font-medium text-purple-700">{item.cause_disease_condition || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : isFall && !isFallSummary ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-amber-100 text-amber-900 sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5 text-center">ลำดับ</th>
                    <th className="p-2.5">HN</th>
                    <th className="p-2.5">AN</th>
                    <th className="p-2.5">วันที่เกิดเหตุ</th>
                    <th className="p-2.5">ระดับความรุนแรง</th>
                    <th className="p-2.5">รายละเอียดเหตุการณ์</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {batchGroup.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-2.5 text-center font-bold">{idx + 1}</td>
                      <td className="p-2.5 font-semibold text-amber-800">{item.hn || '-'}</td>
                      <td className="p-2.5">{item.an || '-'}</td>
                      <td className="p-2.5">{item.fall_date || item.incident_date || '-'}</td>
                      <td className="p-2.5 font-bold text-red-600">{item.severity || '-'}</td>
                      <td className="p-2.5 text-gray-800">{item.detail || item.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : isAma ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-rose-100 text-rose-900 sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5 text-center">ลำดับ</th>
                    <th className="p-2.5">HN</th>
                    <th className="p-2.5">AN</th>
                    <th className="p-2.5">วันที่เกิดเหตุ</th>
                    <th className="p-2.5">สิทธิการรักษา</th>
                    <th className="p-2.5">สาเหตุที่ไม่สมัครอยู่</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {batchGroup.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-2.5 text-center font-bold">{idx + 1}</td>
                      <td className="p-2.5 font-semibold text-rose-800">{item.hn || '-'}</td>
                      <td className="p-2.5">{item.an || '-'}</td>
                      <td className="p-2.5">{item.incident_date || item.discharge_date || '-'}</td>
                      <td className="p-2.5">{item.treatment_right || '-'}</td>
                      <td className="p-2.5 font-medium text-gray-800">{item.ama_reason || item.reason || item.cause || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : isIvCare && !isIvCareSummary ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-cyan-100 text-cyan-900 sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5 text-center">ลำดับ</th>
                    <th className="p-2.5">วันที่บันทึก</th>
                    <th className="p-2.5">HN / AN</th>
                    <th className="p-2.5">ภาวะแทรกซ้อน / Grade</th>
                    <th className="p-2.5">ตำแหน่ง / Route</th>
                    <th className="p-2.5">ปัจจัยเสี่ยง / รายละเอียด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {batchGroup.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 align-top">
                      <td className="p-2.5 text-center font-bold">{idx + 1}</td>
                      <td className="p-2.5 font-semibold text-gray-700">
                        {item.record_date || item.incident_date || '-'}
                      </td>
                      <td className="p-2.5">
                        <div className="font-bold text-cyan-800">{item.hn ? `HN: ${item.hn}` : '-'}</div>
                        <div className="text-gray-500 text-[11px]">{item.an ? `AN: ${item.an}` : ''}</div>
                      </td>
                      <td className="p-2.5">
                        <div className="font-bold text-red-600">{item.complication || item.issue || '-'}</div>
                        {item.grade && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded font-bold text-[10px]">
                            Grade {item.grade}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5">
                        <div className="font-medium text-gray-800">{item.site ? `ตำแหน่ง: ${item.site}` : '-'}</div>
                        <div className="text-gray-500 text-[11px]">{item.route ? `Route: ${item.route}` : ''}</div>
                      </td>
                      <td className="p-2.5 space-y-0.5 text-gray-600">
                        {item.factor_drug && <div className="text-indigo-700">ยา: {item.factor_drug}</div>}
                        {item.factor_patient && <div>ผู้ป่วย: {item.factor_patient}</div>}
                        {item.factor_personnel && <div>บุคลากร: {item.factor_personnel}</div>}
                        {item.detail && <div>{item.detail}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : isSummaryData ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-cyan-100 text-cyan-900 sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5 text-center">ลำดับ</th>
                    <th className="p-2.5">ประจำเดือน / งวด</th>
                    {isIvCareSummary ? (
                      <>
                        <th className="p-2.5 text-center">วันให้น้ำเกลือรวม (Infusion Days)</th>
                        <th className="p-2.5 text-center">ตำแหน่งเปิดเส้นรวม (Total Sites)</th>
                        <th className="p-2.5 text-center">จำนวนครั้งแทงเข็มรวม (Total Punctures)</th>
                        <th className="p-2.5 text-center">แทงครั้งเดียวสำเร็จ (1st Attempt)</th>
                      </>
                    ) : isFallSummary ? (
                      <>
                        <th className="p-2.5 text-center">วันนอนรวม (Patient Days)</th>
                        <th className="p-2.5 text-center">จำนวนครั้งที่พลัดตกหกล้ม (Total Falls)</th>
                        <th className="p-2.5">ระดับความรุนแรงรวม / รายละเอียด</th>
                      </>
                    ) : (
                      <>
                        <th className="p-2.5">ปีงบประมาณ</th>
                        <th className="p-2.5 text-center">วันนอนผู้ป่วย (Patient Days)</th>
                      </>
                    )}
                    <th className="p-2.5 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {batchGroup.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-2.5 text-center font-bold">{idx + 1}</td>
                      <td className="p-2.5 font-semibold text-cyan-900">{item.audit_month || item.month || '-'}</td>
                      {isIvCareSummary ? (
                        <>
                          <td className="p-2.5 text-center font-semibold text-gray-800">{item.total_infusion_days ?? '-'}</td>
                          <td className="p-2.5 text-center font-semibold text-gray-800">{item.total_sites ?? '-'}</td>
                          <td className="p-2.5 text-center font-semibold text-gray-800">{item.total_punctures ?? '-'}</td>
                          <td className="p-2.5 text-center font-semibold text-emerald-600">{item.first_attempt_punctures ?? '-'}</td>
                        </>
                      ) : isFallSummary ? (
                        <>
                          <td className="p-2.5 text-center font-bold text-blue-600">
                            {item.patient_days !== undefined ? item.patient_days.toLocaleString() : '-'}
                          </td>
                          <td className="p-2.5 text-center font-bold text-amber-700">{item.total_falls ?? item.fall_count ?? item.total_cases ?? '-'}</td>
                          <td className="p-2.5 text-gray-700">{item.detail || item.description || item.note || '-'}</td>
                        </>
                      ) : (
                        <>
                          <td className="p-2.5 font-semibold text-gray-700">{item.fiscal_year || '-'}</td>
                          <td className="p-2.5 text-center font-bold text-blue-600">
                            {item.patient_days !== undefined ? item.patient_days.toLocaleString() : '-'}
                          </td>
                        </>
                      )}
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {item.status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : isNursingChartAudit ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-indigo-100 text-indigo-900 sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5 text-center">ลำดับ</th>
                    <th className="p-2.5">ประจำเดือน / งวด</th>
                    <th className="p-2.5">HN ผู้ป่วย / วันที่ประเมิน</th>
                    <th className="p-2.5 text-center">สถานะ</th>
                    <th className="p-2.5 text-center">จัดการ (ส่วนปลาย)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {batchGroup.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-2.5 text-center font-bold">{idx + 1}</td>
                      <td className="p-2.5 font-semibold text-indigo-900">{item.audit_month || item.month || '-'}</td>
                      <td className="p-2.5 text-gray-700">
                        HN: <span className="font-bold">{item.patient_hn || item.hn || '-'}</span> (วันที่: {item.audit_date || '-'})
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {item.status || 'pending'}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <button 
                          onClick={() => setSelectedAuditItem(item)} 
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] font-semibold cursor-pointer"
                        >
                          ดูรายละเอียด
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        </div>

        {/* ปุ่มปิดและอนุมัติทั้งหมดด้านล่าง */}
        <div className="flex justify-between items-center pt-4 border-t">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition cursor-pointer">
            ปิดหน้าต่าง
          </button>
          {canApprove && (
            <button onClick={handleApproveAll} disabled={loading} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow transition flex items-center gap-1.5 cursor-pointer">
              <CheckCircleIcon className="w-5 h-5" />
              <span>อนุมัติรายการชุดนี้ทั้งหมด</span>
            </button>
          )}
        </div>

      </div>

      {/* ========================================================= */}
      {/* Sub-Modal: แสดงฟอร์มรายละเอียดรายข้อ พร้อมคะแนนครบทุกหมวด (1-5) */}
      {/* ========================================================= */}
      {selectedAuditItem && (
        <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col">
            
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-md font-bold text-gray-800">
                📝 ฟอร์มรายละเอียดคะแนนประเมิน (HN: {selectedAuditItem.patient_hn || selectedAuditItem.hn || '-'})
              </h3>
              <button 
                onClick={() => setSelectedAuditItem(null)}
                className="text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* ส่วนแสดงคะแนนรายข้อจัดกลุ่มตามฟอร์ม */}
            <div className="space-y-6 overflow-y-auto flex-1 pr-2 text-xs">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 grid grid-cols-2 gap-2 text-gray-700">
                <div><strong>ผู้ประเมิน:</strong> {selectedAuditItem.auditor_name || '-'}</div>
                <div><strong>วันที่ประเมิน:</strong> {selectedAuditItem.audit_date || '-'}</div>
                <div><strong>งวดประจำเดือน:</strong> {selectedAuditItem.audit_month || '-'}</div>
                <div><strong>สถานะรายการ:</strong> <span className="font-bold text-amber-600">{selectedAuditItem.status || 'pending'}</span></div>
              </div>

              {/* ================= หมวดที่ 1 ================= */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 text-sm border-b-2 border-emerald-600 pb-1.5 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  1. การประเมินแรกรับ
                </h3>

                {(() => {
                  const formStructure1 = [
                    {
                      sectionTitle: '1.1 การประเมิน (Assessment)',
                      items: [
                        { key: 's1_1_1', label: '1.1.1 ระบุวันเวลาที่รับไว้ในความดูแล' },
                        { key: 's1_1_2', label: '1.1.2 บอกถึงข้อมูลสำคัญ และระยะเวลาที่ปรากฏอาการ' },
                        { key: 's1_1_3', label: '1.1.3 มีข้อมูลประวัติการเจ็บป่วยปัจจุบัน ที่บอกปัญหา/สาเหตุ สุขภาพที่ปรากฏอย่างชัดเจน' },
                        { key: 's1_1_4', label: '1.1.4 มีข้อมูลการเจ็บป่วยในอดีต ที่มีความสัมพันธ์เกี่ยวข้อง/มีผลต่อการเจ็บป่วย/ปัญหาสุขภาพ' },
                        { key: 's1_1_5', label: '1.1.5 มีข้อมูล การตรวจร่างกาย ในระบบที่เกี่ยวข้องทั้งด้านร่างกาย จิตใจ อารมณ์ สังคม ที่สอดคล้องกับอาการสำคัญ และประวัติการเจ็บป่วย' },
                        { key: 's1_1_6', label: '1.1.6 มีข้อมูลอาการ/อาการแสดงเมื่อแรกรับ ที่เพียงพอที่จะบอกถึงปัญหาสุขภาพ' },
                      ]
                    },
                    {
                      sectionTitle: '1.2 การวางแผน (Planning)',
                      items: [
                        { key: 's1_2_1', label: '1.2.1 การช่วยเหลือ จัดการ แก้ไข/บรรเทา ปัญหา/ภาวะฉุกเฉิน' },
                        { key: 's1_2_2', label: '1.2.2 การวางแผนจำหน่าย หรือส่งต่ออย่างต่อเนื่อง' },
                        { key: 's1_2_3', label: '1.2.3 การป้องกันภาวะแทรกซ้อน หรือ ความเสี่ยงที่มีโอกาสเกิดขึ้น' },
                        { key: 's1_2_4', label: '1.2.4 การเฝ้าระวัง อาการ/อาการแสดง ที่สำคัญ สอดคล้องกับปัญหาสุขภาพด้วยความถี่ที่เหมาะสม' },
                        { key: 's1_2_5', label: '1.2.5 การให้ข้อมูลที่สำคัญ/จำเป็นแก่ผู้ป่วย/ผู้ใช้บริการ และญาติ' },
                      ]
                    },
                    {
                      sectionTitle: '1.3 การนำสู่การปฏิบัติ',
                      items: [
                        { key: 's1_3_1', label: '1.3.1 มีการปฏิบัติตามกิจกรรมที่สอดคล้องกับแผนที่วางไว้' },
                      ]
                    },
                    {
                      sectionTitle: '1.4 การประเมินผล',
                      items: [
                        { key: 's1_4_1', label: '1.4.1 มีการประเมินผลที่ชัดเจนและสะท้อนให้เห็นการดูแลที่ต่อเนื่อง' },
                        { key: 's1_4_2', label: '1.4.2 ชื่อผู้บันทึกพร้อมตำแหน่ง' },
                      ]
                    }
                  ];

                  return formStructure1.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-2 pl-2">
                      <h4 className="font-bold text-emerald-700 text-xs border-l-4 border-emerald-500 pl-2 py-0.5">
                        {group.sectionTitle}
                      </h4>
                      <div className="space-y-1.5 pl-2">
                        {group.items.map((subItem, sIdx) => {
                          const scoreValue = selectedAuditItem[subItem.key];
                          if (scoreValue === undefined) return null;

                          return (
                            <div key={sIdx} className="flex justify-between items-center p-3 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-gray-300 transition">
                              <span className="text-gray-800 font-medium pr-4">{subItem.label}</span>
                              <span className="bg-gray-50 px-3 py-1.5 rounded-lg font-bold text-gray-800 border border-gray-300 min-w-12 text-center">
                                {String(scoreValue)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
                
              {/* ================= หมวดที่ 2 ================= */}
              <div className="space-y-4 pt-2">
                <h3 className="font-bold text-gray-900 text-sm border-b-2 border-emerald-600 pb-1.5 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  2. การประเมินต่อเนื่อง (รวมถึงการวางแผนจำหน่าย และการให้สารน้ำ)
                </h3>

                {(() => {
                  const formStructure2 = [
                    {
                      sectionTitle: '2.1 เฝ้าระวังและควบคุมปัญหาวิกฤต/อาการรบกวนต่อเนื่อง',
                      items: [
                        { key: 's2_1_a', label: 'A : ประเมินสภาพในระบบที่ผิดปกติและที่เกี่ยวข้องอย่างต่อเนื่อง' },
                        { key: 's2_1_p', label: 'P : วางแผนการพยาบาล ระบุปัญหา สาเหตุ และกิจกรรมการพยาบาล' },
                        { key: 's2_1_i', label: 'I : มีการปฏิบัติตามกิจกรรมที่สอดคล้องกับแผนที่วางไว้' },
                        { key: 's2_1_e', label: 'E : มีการประเมินผลที่ชัดเจนและสะท้อนให้เห็นการดูแลที่ต่อเนื่อง' },
                        { key: 's2_1_name', label: 'ชื่อผู้บันทึกพร้อมตำแหน่ง' },
                      ]
                    },
                    {
                      sectionTitle: '2.2 ป้องกันภาวะแทรกซ้อนต่อเนื่อง',
                      items: [
                        { key: 's2_2_a', label: 'A : ประเมินสภาพต่อเนื่องเกี่ยวกับโอกาสเกิดภาวะแทรกซ้อน' },
                        { key: 's2_2_p', label: 'P : วางแผนการพยาบาล ป้องกันภาวะแทรกซ้อนต่อเนื่อง ระบุ ปัญหา สาเหตุ และกิจกรรมการพยาบาล' },
                        { key: 's2_2_i', label: 'I : มีการปฏิบัติตามกิจกรรมที่สอดคล้องกับแผนที่วางไว้' },
                        { key: 's2_2_e', label: 'E : มีการประเมินผลที่ชัดเจนและสะท้อนให้เห็นการดูแลที่ต่อเนื่อง' },
                        { key: 's2_2_name', label: 'ชื่อผู้บันทึกพร้อมตำแหน่ง' },
                      ]
                    },
                    {
                      sectionTitle: '2.3 ฟื้นฟูสภาพ',
                      items: [
                        { key: 's2_3_a', label: 'A : ประเมินสภาพต่อเนื่องเกี่ยวกับความต้องการและความสามารถในการฟื้นฟูสภาพ' },
                        { key: 's2_3_p', label: 'P : วางแผนการพยาบาล ฟื้นฟูสภาพ ระบุความต้องการและกิจกรรมการพยาบาล' },
                        { key: 's2_3_i', label: 'I : มีการปฏิบัติตามกิจกรรมที่สอดคล้องกับแผนที่วางไว้' },
                        { key: 's2_3_e', label: 'E : มีการประเมินผลที่ชัดเจนและสะท้อนให้เห็นการดูแลที่ต่อเนื่อง' },
                        { key: 's2_3_name', label: 'ชื่อผู้บันทึกพร้อมตำแหน่ง' },
                      ]
                    },
                    {
                      sectionTitle: '2.4 ประเมินความพร้อมของผู้ป่วยและญาติในการดูแลตนเอง',
                      items: [
                        { key: 's2_4_a', label: 'A : ประเมินความสามารถและการรับรู้ในการดูแลตนเองพร้อมทั้งระบุปัญหา/ความต้องการการดูแลต่อเนื่องที่บ้าน' },
                        { key: 's2_4_p', label: 'P : วางแผนการดูแลต่อเนื่องที่บ้าน' },
                        { key: 's2_4_i', label: 'I : มีการปฏิบัติตามแผนการดูแลต่อเนื่อง' },
                        { key: 's2_4_e', label: 'E : ประเมินผลการปฏิบัติตามแผนและปรับปรุงแผนอย่างสม่ำเสมอ' },
                        { key: 's2_4_name', label: 'ชื่อผู้บันทึกพร้อมตำแหน่ง' },
                      ]
                    }
                  ];
                  return formStructure2.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-2 pl-2">
                      <h4 className="font-bold text-emerald-700 text-xs border-l-4 border-emerald-500 pl-2 py-0.5">
                        {group.sectionTitle}
                      </h4>
                      <div className="space-y-1.5 pl-2">
                        {group.items.map((subItem, sIdx) => {
                          const scoreValue = selectedAuditItem[subItem.key];
                          if (scoreValue === undefined) return null;

                          return (
                            <div key={sIdx} className="flex justify-between items-center p-3 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-gray-300 transition">
                              <span className="text-gray-800 font-medium pr-4">{subItem.label}</span>
                              <span className="bg-gray-50 px-3 py-1.5 rounded-lg font-bold text-gray-800 border border-gray-300 min-w-12 text-center">
                                {String(scoreValue)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            
              {/* ================= หมวดที่ 3 ================= */}
              <div className="space-y-4 pt-2">
                <h3 className="font-bold text-gray-900 text-sm border-b-2 border-emerald-600 pb-1.5 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  3. การวางแผนจำหน่าย
                </h3>

                {(() => {
                  const items = [
                    { key: 's3_a', label: 'A : มีการเตรียมความพร้อมในการจำหน่ายโดยมีการคาดการณ์ ภาวะสุขภาพของผู้ป่วยก่อนจำหน่ายในด้านความสามารถ ทั้งด้านร่างกาย จิตใจ วิญญาณและสังคม' },
                    { key: 's3_p', label: 'P : กำหนดแผนการพยาบาลในการฟื้นฟูสภาพอย่างครอบคลุม' },
                    { key: 's3_i', label: 'I : มีการปฏิบัติตามแผนที่วางไว้ (สอนให้ความรู้และให้ปฏิบัติ)' },
                    { key: 's3_e', label: 'E : ประเมินผลตามความสามารถของผู้ป่วยและญาติในการดูแลตนเอง' },
                    { key: 's3_name', label: 'ชื่อผู้บันทึกพร้อมตำแหน่ง' },
                  ];

                  return (
                    <div className="space-y-1.5 pl-2">
                      {items.map((subItem, sIdx) => {
                        const scoreValue = selectedAuditItem[subItem.key];
                        if (scoreValue === undefined) return null;

                        return (
                          <div key={sIdx} className="flex justify-between items-center p-3 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-gray-300 transition">
                            <span className="text-gray-800 font-medium pr-4">{subItem.label}</span>
                            <span className="bg-gray-50 px-3 py-1.5 rounded-lg font-bold text-gray-800 border border-gray-300 min-w-12 text-center">
                              {String(scoreValue)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* ================= หมวดที่ 4 ================= */}
              <div className="space-y-4 pt-2">
                <h3 className="font-bold text-gray-900 text-sm border-b-2 border-emerald-600 pb-1.5 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  4. การบันทึกวันจำหน่าย
                </h3>

                {(() => {
                  const items = [
                    { key: 's4_1', label: '4.1 มีการบันทึกสัญญาณชีพก่อนการจำหน่าย' },
                    { key: 's4_2', label: '4.2 มีการบันทึกสภาวะ/ปัญหาของผู้ป่วยที่ต้องดูแลอย่างต่อเนื่อง' },
                    { key: 's4_3', label: '4.3 มีการประเมินความพร้อมในการดูแลตนเองของผู้ป่วยก่อนจำหน่ายและให้คำแนะนำเพิ่มเติม' },
                    { key: 's4_4', label: '4.4 มีการบันทึกประเภทจำหน่าย' },
                    { key: 's4_5', label: '4.5 มีการบันทึก การส่งต่อ/ การนัดมาตรวจ' },
                    { key: 's4_6', label: '4.6 ชื่อผู้บันทึกพร้อมตำแหน่ง' },
                  ];
                  return (
                    <div className="space-y-1.5 pl-2">
                      {items.map((subItem, sIdx) => {
                        const scoreValue = selectedAuditItem[subItem.key];
                        if (scoreValue === undefined) return null;

                        return (
                          <div key={sIdx} className="flex justify-between items-center p-3 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-gray-300 transition">
                            <span className="text-gray-800 font-medium pr-4">{subItem.label}</span>
                            <span className="bg-gray-50 px-3 py-1.5 rounded-lg font-bold text-gray-800 border border-gray-300 min-w-12 text-center">
                              {String(scoreValue)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
                
              {/* ================= หมวดที่ 5 ================= */}
              <div className="space-y-4 pt-2">
                <h3 className="font-bold text-gray-900 text-sm border-b-2 border-emerald-600 pb-1.5 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  5. การให้สารน้ำ/ยาทางหลอดเลือดดำ
                </h3>
                {(() => {
                  const items = [
                    { key: 's5_1', label: '5.1 บันทึกเกี่ยวกับการให้ความรู้ผู้ป่วย/ญาติ ชนิดของสารน้ำ ตำแหน่งการแทงเข็ม ภาวะแทรกซ้อนและการจัดการ' },
                  ];
                  return (
                    <div className="space-y-1.5 pl-2">
                      {items.map((subItem, sIdx) => {
                        const scoreValue = selectedAuditItem[subItem.key];
                        if (scoreValue === undefined) return null;

                        return (
                          <div key={sIdx} className="flex justify-between items-center p-3 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-gray-300 transition">
                            <span className="text-gray-800 font-medium pr-4">{subItem.label}</span>
                            <span className="bg-gray-50 px-3 py-1.5 rounded-lg font-bold text-gray-800 border border-gray-300 min-w-12 text-center">
                              {String(scoreValue)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

            </div>

            {/* ปุ่มกดอนุมัติเฉพาะในหน้าต่างดูรายละเอียด */}
            <div className="flex justify-end items-center pt-3 border-t gap-2">
              <button
                onClick={() => setSelectedAuditItem(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                ปิดหน้าต่างนี้
              </button>
              {canApprove && selectedAuditItem.status !== 'approved' && (
                <button
                  onClick={() => {
                    handleSingleApproval(selectedAuditItem);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow cursor-pointer flex items-center gap-1"
                >
                  <CheckCircleIcon className="w-4 h-4" /> อนุมัติรายการนี้
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}