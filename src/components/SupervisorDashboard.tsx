'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { CheckCircleIcon, ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export default function SupervisorDashboard() {
  const supabase = createClient();
  const [auditList, setAuditList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all'); // 👈 State สำหรับกรองประเภท
  const [headNurseName, setHeadNurseName] = useState('หัวหน้าหอผู้ป่วย');

  // ดึงข้อมูลตามประเภทที่เลือก
  const fetchPendingAudits = async () => {
    setLoading(true);
    let query = supabase
      .from('nursing_chart_audits')
      .select('*')
      .eq('status', 'pending');

    // ถ้าไม่ได้เลือก 'all' ให้กรองตาม audit_type
    if (selectedType !== 'all') {
      query = query.eq('audit_type', selectedType);
    }

    const { data, error } = await query.order('audit_date', { ascending: false });

    if (!error && data) {
      setAuditList(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPendingAudits();
  }, [selectedType]); // โหลดใหม่เมื่อเปลี่ยนแท็บประเภท

  const handleApproveRecord = async (recordId: string) => {
    if (!confirm('คุณต้องการอนุมัติผล Audit รายการนี้ใช่หรือไม่?')) return;

    const { error } = await supabase
      .from('nursing_chart_audits')
      .update({ 
        status: 'approved', 
        approved_by: headNurseName 
      })
      .eq('id', recordId);

    if (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } else {
      alert('อนุมัติข้อมูลเรียบร้อยแล้ว');
      fetchPendingAudits();
    }
  };

  // แปลงรหัสประเภทเป็นชื่อไทยสำหรับแสดงผล
  const getTypeName = (type: string) => {
    switch (type) {
      case 'chart': return 'Chart Audit';
      case 'wp': return 'WP (Work Procedure)';
      case 'fall': return 'Fall Prevention';
      case 'iv_care': return 'IV Care';
      default: return type;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-emerald-950 flex items-center gap-2">
            <DocumentTextIcon className="w-7 h-7 text-emerald-700" />
            ระบบตรวจสอบและอนุมัติงาน Audit ทั้งหมด
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            อนุมัติเวชระเบียน, WP, Fall Prevention และ IV Care
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-gray-700">ชื่อหัวหน้า:</label>
          <input 
            type="text" 
            value={headNurseName} 
            onChange={(e) => setHeadNurseName(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-gray-50 font-medium"
          />
        </div>
      </div>

      {/* แถบ Tabs เลือกประเภทการ Audit */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {[
          { id: 'all', label: 'ทั้งหมด' },
          { id: 'chart', label: 'Chart Audit' },
          { id: 'wp', label: 'WP' },
          { id: 'fall', label: 'Fall Prevention' },
          { id: 'iv_care', label: 'IV Care' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedType(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
              selectedType === tab.id 
                ? 'bg-emerald-700 text-white' 
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ตารางแสดงรายการ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
          <h3 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-amber-600" /> 
            รายการรอตรวจสอบ ({getTypeName(selectedType)}) - ทั้งหมด {auditList.length} รายการ
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">กำลังโหลดข้อมูล...</div>
        ) : auditList.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm flex flex-col items-center justify-center gap-2">
            <CheckCircleIcon className="w-12 h-12 text-emerald-300" />
            ไม่มีรายการรอตรวจสอบในหมวดหมู่นี้
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b text-xs font-bold text-gray-600">
                  <th className="p-4">ประเภท Audit</th>
                  <th className="p-4">วันที่ Audit</th>
                  <th className="p-4">HN ผู้ป่วย / รายละเอียด</th>
                  <th className="p-4">ผู้ตรวจ (Auditor)</th>
                  <th className="p-4 text-center">สถานะ</th>
                  <th className="p-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {auditList.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md text-xs font-bold">
                        {getTypeName(item.audit_type || 'chart')}
                      </span>
                    </td>
                    <td className="p-4 text-gray-700">{item.audit_date}</td>
                    <td className="p-4 font-semibold text-emerald-950">{item.patient_hn || item.disease || '-'}</td>
                    <td className="p-4 text-gray-700">{item.auditor_name || '-'}</td>
                    <td className="p-4 text-center">
                      <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
                        รอตรวจสอบ
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleApproveRecord(item.id)}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center justify-center gap-1 mx-auto"
                      >
                        <CheckCircleIcon className="w-4 h-4" /> อนุมัติ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}