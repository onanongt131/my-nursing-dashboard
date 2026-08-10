'use client';

import React, { useState } from 'react';
import { CheckCircleIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

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
  supabase?: any;
}

export default function BatchDetailModal({
  isOpen,
  onClose,
  batchGroup,
  departmentName,
  canApprove,
  onApprove,
  supabase
}: BatchDetailModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !batchGroup) return null;

  const typeLower = batchGroup.type.toLowerCase();
  const isWpQa = typeLower.includes('wp_qa');
  const isReadmit = typeLower.includes('readmit');
  const isFall = typeLower.includes('fall');
  const isAma = typeLower.includes('ama') || typeLower.includes('against_medical_advice') || typeLower.includes('ไม่สมัคร');
  const isIvCare = typeLower.includes('iv_care');

  const handleApproveAll = async () => {
    const activeSupabase = supabase; 

    if (!activeSupabase) {
      alert('ไม่พบการเชื่อมต่อ Supabase Client');
      return;
    }

    const auditMonthStr = String(batchGroup.audit_month || '').trim();
    const typeStr = batchGroup.type ? String(batchGroup.type).toLowerCase() : '';

    if (!confirm(`คุณต้องการอนุมัติข้อมูลประจำเดือน ${auditMonthStr} ของระบบ ${batchGroup.type} ใช่หรือไม่?`)) {
      return;
    }

    setLoading(true);
    try {
      let targetTable = '';
      if (typeStr.includes('wp_qa')) {
        targetTable = 'wp_qa_records';
      } else if (typeStr.includes('iv_care')) {
        targetTable = typeStr.includes('summary') ? 'iv_care_monthly_summaries' : 'iv_care_complications';
      } else if (typeStr.includes('fall')) {
        targetTable = typeStr.includes('summary') ? 'fall_monthly_summary' : 'fall_incident_records';
      } else if (typeStr.includes('readmit')) {
        targetTable = typeStr.includes('summary') ? 'readmit_monthly_summary' : 'readmit_incident_records';
      } else if (typeStr.includes('ama')) {
        targetTable = typeStr.includes('summary') ? 'ama_monthly_summary' : 'ama_incident_records';
      } else {
        targetTable = batchGroup.type;
      }

      const ids = batchGroup.items.map(item => item.id).filter(Boolean);
      console.log(`กำลังอัปเดตตาราง ${targetTable} จำนวน ${ids.length} รายการ`, ids);

      // ส่งเฉพาะฟิลด์ status เพื่อความปลอดภัย ป้องกันปัญหาคอลัมน์ approved_at ไม่มีในตาราง
      const updatePayload = { status: 'approved' };

      let query = activeSupabase
        .from(targetTable)
        .update(updatePayload);

      if (ids.length > 0) {
        query = query.in('id', ids);
      } else if (auditMonthStr) {
        query = query.eq('audit_month', auditMonthStr);
      }

      const { data, error } = await query.select();
      if (error) throw error;

      console.log("--- อัปเดตสถานะสำเร็จ ---", data);
      alert('อนุมัติและบันทึกข้อมูลสำเร็จเรียบร้อย');
      
      onApprove(batchGroup.type, batchGroup.audit_month);
      onClose();

    } catch (err: any) {
      console.error('Approval error details:', err);
      alert(`เกิดข้อผิดพลาดในการอนุมัติ: ${err?.message || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };

  
  const isSummaryData = typeLower.includes('summary') || batchGroup.items[0]?.source_table?.includes('summary');
  const isIvCareSummary = isIvCare && (typeLower.includes('summary') || isSummaryData);
  const isFallSummary = isFall && (typeLower.includes('summary') || isSummaryData);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-5xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] flex flex-col">
        
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
            className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition cursor-pointer disabled:opacity-50"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div>
            <span className="font-semibold text-gray-500">หน่วยงาน:</span> {departmentName}
          </div>
          <div>
            <span className="font-semibold text-gray-500">ผู้ประเมิน:</span>{' '}
            {batchGroup.auditor_name || batchGroup.evaluator || '-'}
          </div>
          <div>
            <span className="font-semibold text-gray-500">สถานะ:</span>{' '}
            <span className="inline-flex items-center gap-1 text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              <ExclamationTriangleIcon className="w-3.5 h-3.5" /> รออนุมัติ (Pending)
            </span>
          </div>
        </div>

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
            ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition cursor-pointer disabled:opacity-50"
          >
            ปิดหน้าต่าง
          </button>

          {canApprove && (
            <button
              onClick={handleApproveAll}
              disabled={loading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircleIcon className="w-5 h-5" />
              <span>{loading ? 'กำลังอนุมัติ...' : 'อนุมัติรายการชุดนี้'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}