'use client';

import { useState } from 'react';

interface FallCareModalProps {
  isOpen: boolean;
  onClose: () => void;
  departmentId: string | number;
  departmentName: string;
  supabase: any;
  onSuccess: () => void;
}

const shiftOptions = ['เวรเช้า', 'เวรบ่าย', 'เวรดึก'];
const severityOptions = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

export default function FallCareModal({
  isOpen,
  onClose,
  departmentId,
  departmentName,
  supabase,
  onSuccess,
}: FallCareModalProps) {
  const [saving, setSaving] = useState(false);

  // State ฟิลด์ต่างๆ ของการบันทึก Fall
  const [hn, setHn] = useState('');
  const [an, setAn] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState('');
  const [severity, setSeverity] = useState('');
  const [riskScore, setRiskScore] = useState('');
  const [description, setDescription] = useState('');
  
  // ผลการประเมินสาเหตุ 4 ด้าน
  const [causePatient, setCausePatient] = useState('');
  const [causePersonnel, setCausePersonnel] = useState('');
  const [causeEnvironment, setCauseEnvironment] = useState('');
  const [causeSystem, setCauseSystem] = useState('');

  // ผลการทบทวนและแนวทางแก้ไข
  const [reviewAndSolution, setReviewAndSolution] = useState('');

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('fall_incident_records').insert({
        department_id: Number(departmentId),
        hn,
        an,
        incident_date: incidentDate,
        shift,
        severity,
        risk_score: riskScore !== '' ? Number(riskScore) : null,
        description,
        cause_patient: causePatient || null,
        cause_personnel: causePersonnel || null,
        cause_environment: causeEnvironment || null,
        cause_system: causeSystem || null,
        review_and_solution: reviewAndSolution || null,
        status: 'pending', // 👈 เพิ่มสถานะเริ่มต้นเพื่อให้หัวหน้าตรวจสอบอนุมัติ
      });

      if (error) throw error;

      alert('บันทึกอุบัติการณ์การพลัดตกหกล้มสำเร็จ (รอหัวหน้าตรวจสอบ)');
      // Reset form
      setHn('');
      setAn('');
      setShift('');
      setSeverity('');
      setRiskScore('');
      setDescription('');
      setCausePatient('');
      setCausePersonnel('');
      setCauseEnvironment('');
      setCauseSystem('');
      setReviewAndSolution('');
      
      onSuccess();
      onClose();
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-amber-600 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">บันทึกอุบัติการณ์การพลัดตกหกล้ม (Fall)</h2>
            <p className="text-xs text-amber-100">หน่วยงาน: {departmentName}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-xl font-bold">✕</button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* ส่วนข้อมูลเบื้องต้น HN, AN, วันที่ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
            <div>
              <label className="block text-xs font-semibold text-amber-900 mb-1">HN</label>
              <input
                type="text"
                placeholder="ระบุ HN"
                value={hn}
                onChange={(e) => setHn(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-amber-900 mb-1">AN</label>
              <input
                type="text"
                placeholder="ระบุ AN (ถ้ามี)"
                value={an}
                onChange={(e) => setAn(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-amber-900 mb-1">วันที่เกิดอุบัติการณ์</label>
              <input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          {/* เวร, ระดับความรุนแรง, คะแนนความเสี่ยง */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">เวรเกิดเหตุการณ์</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white"
                required
              >
                <option value="" disabled>-- เลือกเวร --</option>
                {shiftOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">ระดับความรุนแรง (A-I)</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white"
                required
              >
                <option value="" disabled>-- เลือกระดับความรุนแรง --</option>
                {severityOptions.map((sev) => (
                  <option key={sev} value={sev}>ระดับ {sev}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">คะแนนความเสี่ยงต่อการพลัดตกฯ</label>
              <input
                type="number"
                min="0"
                placeholder="ระบุตัวเลขคะแนน"
                value={riskScore}
                onChange={(e) => setRiskScore(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white font-semibold"
                required
              />
            </div>
          </div>

          {/* รายละเอียดเหตุการณ์ */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">รายละเอียดเหตุการณ์</label>
            <textarea
              rows={3}
              placeholder="เขียนรายละเอียดเหตุการณ์ที่เกิดขึ้น..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
              required
            />
          </div>

          {/* ผลการประเมินสาเหตุ 4 ด้าน */}
          <div className="border border-gray-200 p-4 rounded-xl space-y-3 bg-gray-50/50">
            <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider">
              ผลการประเมินสาเหตุของการพลัดตกหกล้ม (4 ด้าน)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-xs font-semibold text-gray-600">1. ด้านผู้ป่วย (Patient)</span>
                <textarea
                  rows={2}
                  placeholder="สาเหตุย่อยด้านผู้ป่วย..."
                  value={causePatient}
                  onChange={(e) => setCausePatient(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs bg-white"
                />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">2. ด้านบุคลากร (Personnel)</span>
                <textarea
                  rows={2}
                  placeholder="สาเหตุย่อยด้านบุคลากร..."
                  value={causePersonnel}
                  onChange={(e) => setCausePersonnel(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs bg-white"
                />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">3. ด้านสิ่งแวดล้อม (Environment)</span>
                <textarea
                  rows={2}
                  placeholder="สาเหตุย่อยด้านสิ่งแวดล้อม..."
                  value={causeEnvironment}
                  onChange={(e) => setCauseEnvironment(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs bg-white"
                />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">4. ด้านระบบงาน (System)</span>
                <textarea
                  rows={2}
                  placeholder="สาเหตุย่อยด้านระบบงาน..."
                  value={causeSystem}
                  onChange={(e) => setCauseSystem(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs bg-white"
                />
              </div>
            </div>
          </div>

          {/* ผลการทบทวนและแนวทางแก้ไข */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">ผลการทบทวนและแนวทางแก้ไข</label>
            <textarea
              rows={3}
              placeholder="ระบุผลการทบทวนและแนวทางการป้องกันไม่ให้เกิดซ้ำ..."
              value={reviewAndSolution}
              onChange={(e) => setReviewAndSolution(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold shadow disabled:opacity-50"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล Fall'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}