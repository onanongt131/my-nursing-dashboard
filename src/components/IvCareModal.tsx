'use client';

import { useState } from 'react';
import { Pill, Droplets, User, Users } from 'lucide-react'; // นำเข้าไอคอนสำหรับแต่ละด้าน

interface IvCareModalProps {
  isOpen: boolean;
  onClose: () => void;
  departmentId: string | number;
  departmentName: string;
  supabase: any;
  onSuccess: () => void;
}

const complicationOptions = ['Phlebitis', 'Extravasation', 'Infiltration'];
const gradeOptions = ['1', '2', '3', '4'];
const routeOptions = ['IV', 'HL'];
const siteOptions = [
  'หลังมือขวา', 'หลังมือซ้าย',
  'ข้อมือขวา', 'ข้อมือซ้าย',
  'แขนใต้ข้อศอกลงมาขวา', 'แขนใต้ข้อศอกลงมาซ้าย',
  'แขนเหนือข้อศอกขึ้นไปขวา', 'แขนเหนือข้อศอกขึ้นไปซ้าย',
  'ข้อพับบริเวณข้อศอกขวา', 'ข้อพับบริเวณข้อศอกซ้าย',
  'หลังเท้าขวา', 'หลังเท้าซ้าย',
  'ข้อเท้าขวา', 'ข้อเท้าซ้าย',
  'ขาใต้เขาลงมาขวา', 'ขาใต้เขาลงมาซ้าย',
  'ขาเหนือเข่าขึ้นไปขวา', 'ขาเหนือเข่าขึ้นไปซ้าย',
  'นิ้วมือขวา', 'นิ้วมือซ้าย',
  'ศีรษะ', 'อื่นๆ ระบุเพิ่ม'
];

export default function IvCareModal({
  isOpen,
  onClose,
  departmentId,
  departmentName,
  supabase,
  onSuccess,
}: IvCareModalProps) {
  const [activeTab, setActiveTab] = useState<'complication' | 'monthly'>('complication');
  const [saving, setSaving] = useState(false);

  // State ส่วนที่ 1
  const [compDate, setCompDate] = useState(new Date().toISOString().slice(0, 10));
  const [hn, setHn] = useState('');
  const [an, setAn] = useState('');
  const [complication, setComplication] = useState('');
  const [grade, setGrade] = useState('');
  const [route, setRoute] = useState('');
  const [site, setSite] = useState('');
  const [otherSite, setOtherSite] = useState('');
  
  const [factorDrug, setFactorDrug] = useState('');
  const [factorFluid, setFactorFluid] = useState('');
  const [factorPatient, setFactorPatient] = useState('');
  const [factorPersonnel, setFactorPersonnel] = useState('');

  // State ส่วนที่ 2
  const [auditMonth, setAuditMonth] = useState(new Date().toISOString().slice(0, 7));
  const [totalDays, setTotalDays] = useState('');
  const [totalSites, setTotalSites] = useState('');
  const [totalPunctures, setTotalPunctures] = useState('');
  const [firstAttemptPunctures, setFirstAttemptPunctures] = useState('');
  const [discrepancy, setDiscrepancy] = useState('');
  const [overCount, setOverCount] = useState('');
  const [underCount, setUnderCount] = useState('');

  if (!isOpen) return null;

  const handleSaveComplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId) return;

    setSaving(true);
    try {
      const finalSite = site === 'อื่นๆ ระบุเพิ่ม' ? `อื่นๆ: ${otherSite}` : site;

      const { error } = await supabase.from('iv_care_complications').insert({
        department_id: Number(departmentId),
        record_date: compDate,
        hn,
        an,
        complication,
        grade: Number(grade),
        route,
        site: finalSite,
        factor_drug: factorDrug || null,
        factor_fluid: factorFluid || null,
        factor_patient: factorPatient || null,
        factor_personnel: factorPersonnel || null,
        status: 'pending', // 👈 เพิ่มสถานะเริ่มต้นเพื่อให้หัวหน้าตรวจสอบอนุมัติ
      });

      if (error) throw error;

      alert('บันทึกภาวะแทรกซ้อน IV Care สำเร็จ (รอหัวหน้าตรวจสอบ)');
      setHn('');
      setAn('');
      setComplication('');
      setGrade('');
      setRoute('');
      setSite('');
      setOtherSite('');
      setFactorDrug('');
      setFactorFluid('');
      setFactorPatient('');
      setFactorPersonnel('');
      onSuccess();
      onClose(); // เพิ่มการปิด Modal หลังจากบันทึกสำเร็จ (ตามความเหมาะสม)
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMonthly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('iv_care_monthly_summaries').upsert({
        department_id: Number(departmentId),
        audit_month: auditMonth,
        total_infusion_days: Number(totalDays) || 0,
        total_sites: Number(totalSites) || 0,
        total_punctures: Number(totalPunctures) || 0,
        first_attempt_punctures: Number(firstAttemptPunctures) || 0,
        discrepancy: discrepancy || null,
        over_count: overCount !== '' ? Number(overCount) : null,
        under_count: underCount !== '' ? Number(underCount) : null,
      }, { onConflict: 'department_id, audit_month' });

      if (error) throw error;

      alert('บันทึกข้อมูลสรุปรายเดือน IV Care สำเร็จ');
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
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-teal-800 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">บันทึกข้อมูล IV Care</h2>
            <p className="text-xs text-teal-200">หน่วยงาน: {departmentName}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-xl font-bold">✕</button>
        </div>

        {/* Tabs Switcher */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('complication')}
            className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition-all ${
              activeTab === 'complication'
                ? 'bg-white text-teal-800 border-t border-x border-gray-200 shadow-sm'
                : 'text-gray-500 hover:text-teal-700'
            }`}
          >
            ส่วนที่ 1: บันทึกภาวะแทรกซ้อน (บันทึกทุกครั้งที่พบภาวะแทรกซ้อน)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition-all ${
              activeTab === 'monthly'
                ? 'bg-white text-teal-800 border-t border-x border-gray-200 shadow-sm'
                : 'text-gray-500 hover:text-teal-700'
            }`}
          >
            ส่วนที่ 2: บันทึกสรุปรายเดือน (บันทึกเดือนละ 1 ครั้ง)
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB 1: ภาวะแทรกซ้อน */}
          {activeTab === 'complication' && (
            <form onSubmit={handleSaveComplication} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-teal-50/50 p-4 rounded-xl border border-teal-100">
                <div>
                  <label className="block text-xs font-semibold text-teal-900 mb-1">วัน/เดือน/ปี</label>
                  <input
                    type="date"
                    value={compDate}
                    onChange={(e) => setCompDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-teal-900 mb-1">HN</label>
                  <input
                    type="text"
                    placeholder="ระบุ HN"
                    value={hn}
                    onChange={(e) => setHn(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-teal-900 mb-1">AN</label>
                  <input
                    type="text"
                    placeholder="ระบุ AN (ถ้ามี)"
                    value={an}
                    onChange={(e) => setAn(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* 2 คอลัมน์: ภาวะแทรกซ้อน และ ระดับ (Grade) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">ภาวะแทรกซ้อน</label>
                  <select
                    value={complication}
                    onChange={(e) => setComplication(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white"
                    required
                  >
                    <option value="" disabled>-- ระบุภาวะแทรกซ้อน --</option>
                    {complicationOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">ระดับ (Grade)</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white"
                    required
                  >
                    <option value="" disabled>-- ระดับ (Grade) --</option>
                    {gradeOptions.map((g) => (
                      <option key={g} value={g}>ระดับ {g}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2 คอลัมน์: ทางที่ให้ และ ตำแหน่งที่เกิด */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">ทางที่ให้</label>
                  <select
                    value={route}
                    onChange={(e) => setRoute(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white"
                    required
                  >
                    <option value="" disabled>-- ระบุทางที่ให้ --</option>
                    {routeOptions.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">ตำแหน่งที่เกิด</label>
                  <select
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white"
                    required
                  >
                    <option value="" disabled>-- ระบุตำแหน่งที่เกิด --</option>
                    {siteOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ช่องกรอกเพิ่มเติมกรณีเลือก อื่นๆ ระบุเพิ่ม */}
              {site === 'อื่นๆ ระบุเพิ่ม' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">ระบุตำแหน่งอื่นๆ</label>
                  <input
                    type="text"
                    placeholder="ระบุตำแหน่ง..."
                    value={otherSite}
                    onChange={(e) => setOtherSite(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                    required
                  />
                </div>
              )}

              {/* ปัจจัยที่ส่งผลให้เกิด (พร้อมเพิ่มไอคอนสวยงามแต่ละด้าน) */}
              <div className="border border-gray-200 p-4 rounded-xl space-y-4 bg-gray-50/50">
                <label className="block text-sm font-bold text-teal-900 uppercase tracking-wider mb-2">
                  ปัจจัยที่ส่งผลให้เกิด (วิเคราะห์แต่ละด้าน)
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ด้านยา (Drug) */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                      <span className="p-1 bg-blue-50 text-blue-600 rounded-md">
                        <Pill size={16} />
                      </span>
                      ด้านยา (Drug)
                    </label>
                    <textarea
                      rows={2}
                      value={factorDrug}
                      onChange={(e) => setFactorDrug(e.target.value)}
                      placeholder="วิเคราะห์ปัจจัยด้านยา..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-y bg-white"
                    />
                  </div>

                  {/* ด้านสารน้ำ (Fluid) */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                      <span className="p-1 bg-cyan-50 text-cyan-600 rounded-md">
                        <Droplets size={16} />
                      </span>
                      ด้านสารน้ำ (Fluid)
                    </label>
                    <textarea
                      rows={2}
                      value={factorFluid}
                      onChange={(e) => setFactorFluid(e.target.value)}
                      placeholder="วิเคราะห์ปัจจัยด้านสารน้ำ..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-y bg-white"
                    />
                  </div>

                  {/* ด้านตัวผู้ป่วย (Patient) */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                      <span className="p-1 bg-purple-50 text-purple-600 rounded-md">
                        <User size={16} />
                      </span>
                      ด้านตัวผู้ป่วย (Patient)
                    </label>
                    <textarea
                      rows={2}
                      value={factorPatient}
                      onChange={(e) => setFactorPatient(e.target.value)}
                      placeholder="วิเคราะห์ปัจจัยด้านตัวผู้ป่วย..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-y bg-white"
                    />
                  </div>

                  {/* ด้านบุคลากร (Personnel) */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                      <span className="p-1 bg-green-50 text-green-600 rounded-md">
                        <Users size={16} />
                      </span>
                      ด้านบุคลากร (Personnel)
                    </label>
                    <textarea
                      rows={2}
                      value={factorPersonnel}
                      onChange={(e) => setFactorPersonnel(e.target.value)}
                      placeholder="วิเคราะห์ปัจจัยด้านบุคลากร..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-y bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium"
                >
                  ปิด
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-bold shadow disabled:opacity-50"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึกภาวะแทรกซ้อนนี้'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: สรุปรายเดือน */}
          {activeTab === 'monthly' && (
            <form onSubmit={handleSaveMonthly} className="space-y-4">
              <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100">
                <label className="block text-xs font-semibold text-teal-900 mb-1">ประจำเดือน (Month)</label>
                <input
                  type="month"
                  value={auditMonth}
                  onChange={(e) => setAuditMonth(e.target.value)}
                  className="w-full md:w-1/2 px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">จำนวนวันการให้สารน้ำ</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={totalDays}
                    onChange={(e) => setTotalDays(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-semibold bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">จำนวนตำแหน่งในการให้ยาและสารน้ำ</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={totalSites}
                    onChange={(e) => setTotalSites(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-semibold bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">จำนวนการแทงเข็มทั้งหมด</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={totalPunctures}
                    onChange={(e) => setTotalPunctures(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-semibold bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">จำนวนการแทงเข็มได้ในครั้งแรก</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={firstAttemptPunctures}
                    onChange={(e) => setFirstAttemptPunctures(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-semibold bg-white"
                    required
                  />
                </div>
              </div>

              {/* ความคลาดเคลื่อนในการให้สารน้ำ */}
              <div className="border border-gray-200 p-4 rounded-xl space-y-4 bg-gray-50/50">
                <label className="block text-xs font-bold text-teal-900 uppercase tracking-wider">
                  ความคลาดเคลื่อนในการให้สารน้ำ
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">ได้รับสารน้ำเกิน (ครั้ง)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="ระบุจำนวนครั้งที่เกิน (ถ้ามี)"
                      value={overCount}
                      onChange={(e) => setOverCount(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">ได้รับสารน้ำขาด (ครั้ง)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="ระบุจำนวนครั้งที่ขาด (ถ้ามี)"
                      value={underCount}
                      onChange={(e) => setUnderCount(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                    />
                  </div>
                </div>
              </div>

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
                  className="px-6 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-bold shadow disabled:opacity-50"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลสรุปรายเดือน'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}