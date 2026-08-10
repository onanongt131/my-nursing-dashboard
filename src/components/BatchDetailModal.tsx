'use client';

import React, { useState } from 'react';
import { CheckCircleIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

// กำหนด Interface สำหรับ Item และ BatchGroup เพื่อความปลอดภัยทางประเภทข้อมูล (Type Safety)
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
  [key: string]: any; // รองรับฟิลด์เสริมอื่นๆ
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

  const handleApproveAll = async () => {
    if (!confirm(`คุณต้องการอนุมัติข้อมูลประจำเดือน ${batchGroup.audit_month} ทั้งหมด ${batchGroup.items.length} รายการ ใช่หรือไม่?`)) {
      return;
    }

    if (supabase) {
      setLoading(true);
      try {
        const tablesMap = batchGroup.items.reduce((acc: Record<string, (string | number)[]>, item: BatchItem) => {
          const table = item.source_table;
          if (!table || item.id === undefined) return acc;
          if (!acc[table]) acc[table] = [];
          acc[table].push(item.id);
          return acc;
        }, {});

        for (const [tableName, ids] of Object.entries(tablesMap)) {
          const { error } = await supabase
            .from(tableName)
            .update({ status: 'approved' })
            .in('id', ids);

          if (error) {
            console.error(`Error updating table ${tableName}:`, error);
            alert(`เกิดข้อผิดพลาดในการอนุมัติข้อมูลตาราง ${tableName}: ${error.message}`);
            setLoading(false);
            return;
          }
        }

        let summaryTableName = '';
        const typeLower = batchGroup.type.toLowerCase();
        
        if (typeLower.includes('iv_care')) summaryTableName = 'iv_care_monthly_summaries';
        else if (typeLower.includes('fall')) summaryTableName = 'fall_monthly_summary';
        else if (typeLower.includes('readmit')) summaryTableName = 'readmit_monthly_summary';
        else if (typeLower.includes('ama') || typeLower.includes('against_medical_advice') || typeLower.includes('ไม่สมัคร')) summaryTableName = 'ama_monthly_summary';

        if (summaryTableName) {
          let query = supabase
            .from(summaryTableName)
            .update({ 
              status: 'approved',
              approved_at: new Date().toISOString()
            })
            .eq('audit_month', batchGroup.audit_month);

          if (batchGroup.department_id) {
            query = query.eq('department_id', batchGroup.department_id);
          }

          const { error: summaryError } = await query;
          if (summaryError) {
            console.error(`Error updating summary table ${summaryTableName}:`, summaryError);
          }
        }

      } catch (err: any) {
        console.error('Approval error:', err);
        alert(`เกิดข้อผิดพลาด: ${err?.message || 'กรุณาลองใหม่อีกครั้ง'}`);
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    onApprove(batchGroup.type, batchGroup.audit_month);
    onClose();
  };

  const isSummaryData = batchGroup.type.toLowerCase().includes('summary') || batchGroup.items[0]?.source_table?.includes('summary');
  const isIvCareSummary = batchGroup.type.toLowerCase().includes('iv_care');
  const isFallSummary = batchGroup.type.toLowerCase().includes('fall');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-5xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
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

        {/* Modal Info Bar */}
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

        {/* Data Table Content */}
        <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            รายการข้อมูล ({batchGroup.items.length} รายการ)
          </h4>
          <div className="border border-gray-200 rounded-xl overflow-y-auto flex-1 max-h-96">
            {batchGroup.type === 'wp_qa' ? (
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
            ) : batchGroup.type === 'readmit' ? (
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
            ) : batchGroup.type === 'fall' ? (
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
            ) : batchGroup.type === 'ama' || 
                batchGroup.type === 'against_medical_advice' || 
                batchGroup.type === 'ไม่สมัครอยู่' || 
                batchGroup.type === 'ไม่สมัครใจอยู่' ? (
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
            ) : batchGroup.type === 'iv_care' || batchGroup.type === 'iv_care_comp' ? (
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

        {/* Modal Footer */}
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