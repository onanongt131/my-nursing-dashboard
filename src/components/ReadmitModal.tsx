'use client';

import { useState, useEffect } from 'react';

interface ReadmitCareModalProps {
  isOpen: boolean;
  onClose: () => void;
  departmentId: string | number;
  departmentName: string;
  supabase: any;
  onSuccess: () => void;
}

const shiftOptions = ['เวรเช้า', 'เวรบ่าย', 'เวรดึก'];
const severityOptions = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

export default function ReadmitCareModal({
  isOpen,
  onClose,
  departmentId,
  departmentName,
  supabase,
  onSuccess,
}: ReadmitCareModalProps) {
  const [activeTab, setActiveTab] = useState<'incident' | 'summary'>('incident');
  const [saving, setSaving] = useState(false);

  // --- State ส่วนที่ 1: บันทึกอุบัติการณ์รายเคส (Re-admit) ---
  const [hn, setHn] = useState('');
  const [an, setAn] = useState('');
  const [age, setAge] = useState('');
  const [admitDate, setAdmitDate] = useState(new Date().toISOString().slice(0, 10));
  const [admitDiagnosis, setAdmitDiagnosis] = useState('');
  const [previousDischargeDate, setPreviousDischargeDate] = useState('');
  const [dischargeWard, setDischargeWard] = useState('');
  const [dischargeDiagnosis, setDischargeDiagnosis] = useState('');
  
  // สาเหตุที่ต้องมา adm ครั้งนี้
  const [causePatient, setCausePatient] = useState('');
  const [causeDischargePlanning, setCauseDischargePlanning] = useState('');
  const [causeDiseaseCondition, setCauseDiseaseCondition] = useState('');

  // --- State ส่วนที่ 2: บันทึกสรุปรายเดือน ---
  const [selectedMonthYear, setSelectedMonthYear] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  const currentYearTh = new Date().getFullYear() + 543;
  const currentMonthNum = new Date().getMonth() + 1;
  const [fiscalYear, setFiscalYear] = useState(currentYearTh);
  const [month, setMonth] = useState(currentMonthNum);
  const [prevMonthDischarges, setPrevMonthDischarges] = useState('');

  // State สำหรับแสดงผลสรุปจำนวนเคส Readmit ในเดือนนั้น (อ้างอิงจาก admit_date)
  const [totalReadmits, setTotalReadmits] = useState(0);
  const [loadingSummaryData, setLoadingSummaryData] = useState(false);

  // ดึงข้อมูลสรุปอุบัติการณ์ของเดือนที่เลือกมาแสดงโดยอ้างอิงจาก admit_date
  useEffect(() => {
    if (isOpen && activeTab === 'summary' && departmentId) {
      fetchMonthlyReadmitStats();
    }
  }, [isOpen, activeTab, selectedMonthYear, departmentId]);

  const fetchMonthlyReadmitStats = async () => {
    setLoadingSummaryData(true);
    try {
      const [y, m] = selectedMonthYear.split('-');
      const startDate = `${y}-${m}-01`;
      const endDate = new Date(Number(y), Number(m), 0).toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('readmit_incident_records')
        .select('id')
        .eq('department_id', Number(departmentId))
        .gte('admit_date', startDate)
        .lte('admit_date', endDate);

      if (error) throw error;

      if (data) {
        setTotalReadmits(data.length);
      }
    } catch (error) {
      console.error('Error fetching monthly readmit stats:', error);
    } finally {
      setLoadingSummaryData(false);
    }
  };

  if (!isOpen) return null;

  // บันทึกข้อมูลส่วนที่ 1 (รายเคส Re-admit)
  const handleSaveIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('readmit_incident_records').insert({
        department_id: Number(departmentId),
        hn,
        an,
        age: age !== '' ? Number(age) : null,
        admit_date: admitDate || null,
        admit_diagnosis: admitDiagnosis || null,
        previous_discharge_date: previousDischargeDate || null,
        discharge_ward: dischargeWard || null,
        discharge_diagnosis: dischargeDiagnosis || null,
        cause_patient: causePatient || null,
        cause_discharge_planning: causeDischargePlanning || null,
        cause_disease_condition: causeDiseaseCondition || null,
        status: 'pending',
      });

      if (error) throw error;

      alert('บันทึกข้อมูล Re-admit รายเคสสำเร็จ');
      setHn('');
      setAn('');
      setAge('');
      setAdmitDiagnosis('');
      setPreviousDischargeDate('');
      setDischargeWard('');
      setDischargeDiagnosis('');
      setCausePatient('');
      setCauseDischargePlanning('');
      setCauseDiseaseCondition('');
      
      onSuccess();
      onClose();
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // บันทึกข้อมูลส่วนที่ 2 (สรุปรายเดือน) ลงตาราง readmit_monthly_summary
  const handleSaveSummary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('readmit_monthly_summary').upsert({
        department_id: Number(departmentId),
        fiscal_year: Number(fiscalYear),
        month: Number(month),
        prev_month_discharges: Number(prevMonthDischarges),
        readmit_count: totalReadmits,
      }, { onConflict: 'department_id,fiscal_year,month' });

      if (error) throw error;

      alert('บันทึกข้อมูลสรุปรายเดือน Re-admit สำเร็จ');
      setPrevMonthDischarges('');
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
        <div className="bg-teal-700 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">บันทึกข้อมูลผู้ป่วยกลับมารักษาซ้ำ (Re-admit)</h2>
            <p className="text-xs text-teal-100">หน่วยงาน: {departmentName}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-xl font-bold">✕</button>
        </div>

        {/* Tabs Switcher */}
        <div className="flex border-b bg-gray-50">
          <button
            type="button"
            onClick={() => setActiveTab('incident')}
            className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${
              activeTab === 'incident'
                ? 'border-teal-700 text-teal-800 bg-white shadow-sm'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            ส่วนที่ 1: บันทึก Re-admit (เมื่อพบผู้ป่วยกลับมารักษาซ้ำ)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${
              activeTab === 'summary'
                ? 'border-teal-700 text-teal-800 bg-white shadow-sm'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            ส่วนที่ 2: สรุปรายเดือน (บันทึกเดือนละ 1 ครั้ง)
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'incident' ? (
            <form onSubmit={handleSaveIncident} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-teal-50/50 p-4 rounded-xl border border-teal-100">
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
                    placeholder="ระบุ AN ใหม่"
                    value={an}
                    onChange={(e) => setAn(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-teal-900 mb-1">อายุ (ปี)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="ระบุอายุ"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">วันที่ Admit</label>
                  <input
                    type="date"
                    value={admitDate}
                    onChange={(e) => setAdmitDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">โรคที่ Admit</label>
                  <input
                    type="text"
                    placeholder="ระบุโรคที่มารักษาซ้ำ"
                    value={admitDiagnosis}
                    onChange={(e) => setAdmitDiagnosis(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">วันที่จำหน่ายครั้งที่แล้ว</label>
                  <input
                    type="date"
                    value={previousDischargeDate}
                    onChange={(e) => setPreviousDischargeDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">จำหน่ายจากหอผู้ป่วย</label>
                  <input
                    type="text"
                    placeholder="ระบุหอผู้ป่วยเดิม"
                    value={dischargeWard}
                    onChange={(e) => setDischargeWard(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">โรคที่จำหน่าย</label>
                  <input
                    type="text"
                    placeholder="ระบุโรคเดิมที่จำหน่าย"
                    value={dischargeDiagnosis}
                    onChange={(e) => setDischargeDiagnosis(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  />
                </div>
              </div>

              {/* ส่วนสาเหตุที่ต้องมา adm ครั้งนี้ */}
              <div className="border border-teal-200 p-4 rounded-xl space-y-3 bg-teal-50/30">
                <label className="block text-xs font-bold text-teal-900 uppercase tracking-wider">
                  สาเหตุที่ต้องมา adm ครั้งนี้
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-xs font-semibold text-gray-600">ด้านผู้ป่วย</span>
                    <textarea rows={2} placeholder="สาเหตุด้านผู้ป่วย..." value={causePatient} onChange={(e) => setCausePatient(e.target.value)} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs bg-white" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-600">การปฏิบัติตัวจากการวางแผนจำหน่าย</span>
                    <textarea rows={2} placeholder="สาเหตุการปฏิบัติตัว..." value={causeDischargePlanning} onChange={(e) => setCauseDischargePlanning(e.target.value)} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs bg-white" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-600">ภาวะโรค</span>
                    <textarea rows={2} placeholder="สาเหตุด้านภาวะโรค..." value={causeDiseaseCondition} onChange={(e) => setCauseDiseaseCondition(e.target.value)} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs bg-white" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={onClose} className="px-5 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium">ยกเลิก</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-bold shadow disabled:opacity-50">
                  {saving ? 'กำลังบันทึก...' : 'บันทึก Re-admit'}
                </button>
              </div>
            </form>
          ) : (
            /* ================= FORM ส่วนที่ 2 (สรุปรายเดือน) ================= */
            <form onSubmit={handleSaveSummary} className="space-y-4">
              <div className="bg-teal-50 p-4 rounded-xl border border-teal-200 space-y-4">
                <h3 className="text-sm font-bold text-teal-900">สรุปข้อมูลรายเดือน Re-admit</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">ประจำเดือน (Month)</label>
                    <input
                      type="month"
                      value={selectedMonthYear}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedMonthYear(val);
                        if (val) {
                          const [y, m] = val.split('-');
                          setFiscalYear(Number(y) + 543);
                          setMonth(Number(m));
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white font-semibold focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">ยอดจำหน่ายเดือนที่แล้ว</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="เช่น 350"
                      value={prevMonthDischarges}
                      onChange={(e) => setPrevMonthDischarges(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white font-semibold focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                </div>

                {/* กล่องแสดงผลจำนวนการ Re-admit ที่ดึงจากวันที่ Admit ในรายเคสโดยอัตโนมัติ */}
                <div className="bg-white p-3 rounded-lg border border-teal-200 text-center">
                  <span className="text-xs text-gray-500 block">จำนวนการ Re-admit ในเดือนนี้ (คำนวณจากวันที่ Admit ในระบบรายเคส)</span>
                  <span className="text-xl font-bold text-teal-800">
                    {loadingSummaryData ? 'กำลังโหลด...' : `${totalReadmits} ครั้ง`}
                  </span>
                </div>

                <p className="text-xs text-gray-500">* ข้อมูลจำนวนการ Re-admit ด้านบนจะถูกนำไปบันทึกพร้อมยอดจำหน่ายเดือนที่แล้ว เพื่อใช้คำนวณอัตราการกลับมารักษาซ้ำต่อไป</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={onClose} className="px-5 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium">ยกเลิก</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-bold shadow disabled:opacity-50">
                  {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลรายเดือน'}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}