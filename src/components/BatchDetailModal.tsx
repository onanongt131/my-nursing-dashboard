import React from 'react';
import { CheckCircleIcon, EyeIcon } from '@heroicons/react/24/outline';

interface BatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchGroup: {
    type: string;
    audit_month: string;
    items: any[];
    auditor_name?: string;
    evaluator?: string;
  } | null;
  departmentName: string;
  canApprove: boolean;
  onApprove: (type: string, audit_month: string) => void;
}

export default function BatchDetailModal({
  isOpen,
  onClose,
  batchGroup,
  departmentName,
  canApprove,
  onApprove,
}: BatchDetailModalProps) {
  if (!isOpen || !batchGroup) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase">
              รายละเอียดผลการประเมิน ({batchGroup.type.toUpperCase()})
            </span>
            <h3 className="text-lg font-bold text-gray-900">ประจำเดือน / วันที่: {batchGroup.audit_month}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm bg-gray-50 p-4 rounded-xl">
          <div>
            <span className="font-semibold text-gray-500">หน่วยงาน:</span> {departmentName}
          </div>
          <div>
            <span className="font-semibold text-gray-500">ผู้ประเมิน:</span>{' '}
            {batchGroup.auditor_name || batchGroup.evaluator || '-'}
          </div>
          <div>
            <span className="font-semibold text-gray-500">สถานะ:</span>{' '}
            <span className="text-amber-600 font-bold">รออนุมัติ (Pending)</span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            รายการข้อมูล ({batchGroup.items.length} รายการ)
          </h4>
          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
            {batchGroup.type === 'wp_qa' ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-emerald-100 text-emerald-900 sticky top-0">
                  <tr>
                    <th className="p-2.5">รหัส WP</th>
                    <th className="p-2.5">หัวข้อ WP</th>
                    <th className="p-2.5 text-center">ประเมินแล้ว</th>
                    <th className="p-2.5 text-center">ปฏิบัติจริง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {batchGroup.items.map((item: any, idx: number) => (
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
                <thead className="bg-teal-100 text-teal-900 sticky top-0">
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
                  {batchGroup.items.map((item: any, idx: number) => (
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
                <thead className="bg-amber-100 text-amber-900 sticky top-0">
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
                  {batchGroup.items.map((item: any, idx: number) => (
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
                    <thead className="bg-rose-100 text-rose-900 sticky top-0">
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
                    {batchGroup.items.map((item: any, idx: number) => (
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
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-100 text-gray-700 sticky top-0">
                  <tr>
                    <th className="p-2.5 text-center">ลำดับ</th>
                    <th className="p-2.5">HN</th>
                    <th className="p-2.5">AN</th>
                    <th className="p-2.5">ข้อมูลรายละเอียด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {batchGroup.items.map((subItem: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-2.5 text-center font-bold">{idx + 1}</td>
                      <td className="p-2.5 font-semibold">{subItem.hn || '-'}</td>
                      <td className="p-2.5">{subItem.an || '-'}</td>
                      <td className="p-2.5 font-medium text-gray-800">
                        <pre className="whitespace-pre-wrap font-sans text-xs">
                          {JSON.stringify(subItem, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition"
          >
            ปิดหน้าต่าง
          </button>

          {batchGroup.items?.[0]?.status === 'pending' && canApprove && (
            <button
              onClick={() => {
                onApprove(batchGroup.type, batchGroup.audit_month);
                onClose();
              }}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow transition flex items-center gap-1.5"
            >
              <CheckCircleIcon className="w-5 h-5" />
              <span>อนุมัติรายการชุดนี้</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}