'use client';

import {isDialysis} from '@/lib/dialysisStats';
import { useState, useEffect } from 'react';
import {loadUnitMonthly,saveUnitRecord} from '@/lib/unitRecords/client';
import { createPortal } from 'react-dom';
import { summarizeFallPatientDays } from '@/lib/fallPatientDays';

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
  const manualDays=isDialysis(departmentName);
  const [activeTab, setActiveTab] = useState<'incident' | 'summary'>('incident');
  const [saving, setSaving] = useState(false);

  // --- State ส่วนที่ 1: บันทึกอุบัติการณ์รายเคส ---
  const [hn, setHn] = useState('');
  const [an, setAn] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState('');
  const [severity, setSeverity] = useState('');
  const [riskScore, setRiskScore] = useState('');
  const [description, setDescription] = useState('');
  const [causePatient, setCausePatient] = useState('');
  const [causePersonnel, setCausePersonnel] = useState('');
  const [causeEnvironment, setCauseEnvironment] = useState('');
  const [causeSystem, setCauseSystem] = useState('');
  const [reviewAndSolution, setReviewAndSolution] = useState('');

  // --- State ส่วนที่ 2: บันทึกสรุปรายเดือน ---
  const [selectedMonthYear, setSelectedMonthYear] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  const [patientDays, setPatientDays] = useState('');

  // State สำหรับแสดงผลสรุปตัวเลขเคสในเดือนนั้น
  const [totalIncidents, setTotalIncidents] = useState(0);
  const [severeIncidents, setSevereIncidents] = useState(0);
  const [loadingSummaryData, setLoadingSummaryData] = useState(false);

  const [ready,setReady]=useState(false);
  const [daySummary,setDaySummary]=useState<ReturnType<typeof summarizeFallPatientDays>|null>(null);
  const [summaryError,setSummaryError]=useState('');
  useEffect(()=>setReady(true),[]);
  useEffect(()=>{if(!isOpen)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[isOpen]);
  useEffect(()=>{
    if(!isOpen||activeTab!=='summary'||!departmentId)return;
    const controller=new AbortController();setLoadingSummaryData(true);setPatientDays('');setDaySummary(null);setSummaryError('');setTotalIncidents(0);setSevereIncidents(0);
    loadUnitMonthly('fall',departmentId,selectedMonthYear,controller.signal).then(result=>{
      if(controller.signal.aborted)return;
      setDaySummary(result.days);setPatientDays(String((result.manual?result.patientDays:result.days?.total)??''));setTotalIncidents(result.total);setSevereIncidents(result.severe);
    }).catch(error=>{if(!controller.signal.aborted)setSummaryError(error.message||'โหลดข้อมูลไม่สำเร็จ');}).finally(()=>{if(!controller.signal.aborted)setLoadingSummaryData(false);});
    return()=>controller.abort();
  },[isOpen,activeTab,selectedMonthYear,departmentId]);

  if (!ready || !isOpen) return null;

  // บันทึกข้อมูลส่วนที่ 1 (รายเคส)
  const handleSaveIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId || saving) return;

    setSaving(true);
    try {
      await saveUnitRecord('fall-incident',{
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
        status: 'pending',
      });


      alert('บันทึกอุบัติการณ์การพลัดตกหกล้มสำเร็จ (รอหัวหน้าตรวจสอบ)');
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

  // บันทึกข้อมูลส่วนที่ 2 (สรุปรายเดือน) ลงตาราง fall_monthly_summary
  const handleSaveSummary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId || saving) return;

    if(loadingSummaryData||summaryError||(!manualDays&&!daySummary?.complete)){alert('ข้อมูลคงพยาบาลเวรบ่ายไม่ครบหรือโหลดไม่สำเร็จ กรุณาตรวจสอบก่อนบันทึก');return;}
    setSaving(true);
    try {
      await saveUnitRecord('fall-summary',{department_id:Number(departmentId),month:selectedMonthYear,...(manualDays?{patient_days:Number(patientDays)}:{})});

      alert('บันทึกข้อมูลสรุปรายเดือนสำเร็จ');
      setPatientDays('');
      onSuccess();
      onClose();
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="บันทึกการพลัดตกหกล้ม" className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[92dvh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="shrink-0 bg-amber-600 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">บันทึกข้อมูลอุบัติการณ์การพลัดตกหกล้ม (Fall)</h2>
            <p className="text-xs text-amber-100">หน่วยงาน: {departmentName}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-xl font-bold">✕</button>
        </div>

        {/* Tabs Switcher */}
        <div className="flex shrink-0 border-b bg-gray-50">
          <button
            type="button"
            onClick={() => setActiveTab('incident')}
            className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${
              activeTab === 'incident'
                ? 'border-amber-600 text-amber-700 bg-white shadow-sm'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            ส่วนที่ 1: บันทึกอุบัติการณ์รายเคส (บันทึกทุกครั้งที่เกิดเหตุ)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${
              activeTab === 'summary'
                ? 'border-amber-600 text-amber-700 bg-white shadow-sm'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            ส่วนที่ 2: บันทึกสรุปรายเดือน (บันทึกเดือนละ 1 ครั้ง)
          </button>
        </div>

        {/* Body Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {activeTab === 'incident' ? (
            <form onSubmit={handleSaveIncident} className="space-y-4">
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

              <div className="border border-gray-200 p-4 rounded-xl space-y-3 bg-gray-50/50">
                <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider">
                  ผลการประเมินสาเหตุของการพลัดตกหกล้ม (4 ด้าน)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs font-semibold text-gray-600">1. ด้านผู้ป่วย (Patient)</span>
                    <textarea rows={2} placeholder="สาเหตุย่อยด้านผู้ป่วย..." value={causePatient} onChange={(e) => setCausePatient(e.target.value)} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs bg-white" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-600">2. ด้านบุคลากร (Personnel)</span>
                    <textarea rows={2} placeholder="สาเหตุย่อยด้านบุคลากร..." value={causePersonnel} onChange={(e) => setCausePersonnel(e.target.value)} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs bg-white" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-600">3. ด้านสิ่งแวดล้อม (Environment)</span>
                    <textarea rows={2} placeholder="สาเหตุย่อยด้านสิ่งแวดล้อม..." value={causeEnvironment} onChange={(e) => setCauseEnvironment(e.target.value)} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs bg-white" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-600">4. ด้านระบบงาน (System)</span>
                    <textarea rows={2} placeholder="สาเหตุย่อยด้านระบบงาน..." value={causeSystem} onChange={(e) => setCauseSystem(e.target.value)} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs bg-white" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ผลการทบทวนและแนวทางแก้ไข</label>
                <textarea rows={3} placeholder="ระบุผลการทบทวนและแนวทางการป้องกันไม่ให้เกิดซ้ำ..." value={reviewAndSolution} onChange={(e) => setReviewAndSolution(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={onClose} className="px-5 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium">ยกเลิก</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold shadow disabled:opacity-50">
                  {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลเคส Fall'}
                </button>
              </div>
            </form>
          ) : (
            /* ================= FORM ส่วนที่ 2 (สรุปรายเดือน) ================= */
            <form onSubmit={handleSaveSummary} className="space-y-4">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-4">
                <h3 className="text-sm font-bold text-amber-900">บันทึกข้อมูลพื้นฐานรายเดือนสำหรับคำนวณอัตราการพลัดตกหกล้ม</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">ประจำเดือน (Month)</label>
                    <input
                      type="month"
                      value={selectedMonthYear}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedMonthYear(val);

                      }}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white font-semibold focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">จำนวนวันนอนผู้ป่วย (Patient Days)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder={manualDays ? 'กรอกจำนวนวันนอน' : loadingSummaryData ? 'กำลังดึงวันนอน…' : 'รอข้อมูลเวรบ่ายครบทุกวัน'}
                      value={patientDays}
                      readOnly={!manualDays || loadingSummaryData}
                      onChange={event=>setPatientDays(event.target.value)}
                      aria-describedby="fall-patient-days-status"
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white font-semibold focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                </div>

                <div id="fall-patient-days-status" role="status" className="rounded-lg border border-amber-200 bg-white p-3 text-sm text-amber-900">
                  {summaryError?summaryError:manualDays?'กรอกจำนวนวันนอนผู้ป่วยของเดือนที่เลือก':loadingSummaryData?'กำลังตรวจสอบข้อมูลเวรบ่าย…':daySummary&&<>
                    <strong>{daySummary.complete?`ข้อมูลครบ ${daySummary.valid_days}/${daySummary.expected_days} วัน รวม ${daySummary.total} วันนอน`:`ข้อมูลไม่ครบ/ต้องแก้ไข ${daySummary.valid_days}/${daySummary.expected_days} วัน`}</strong>
                    {daySummary.missing_dates.length>0&&<p className="mt-1 break-words">วันที่ขาด: {daySummary.missing_dates.join(', ')}</p>}
                    {daySummary.duplicate_dates.length>0&&<p className="mt-1 break-words">วันที่เวรบ่ายซ้ำ: {daySummary.duplicate_dates.join(', ')}</p>}
                    {daySummary.invalid_dates.length>0&&<p className="mt-1 break-words">วันที่ยอดคงพยาบาลไม่ถูกต้อง: {daySummary.invalid_dates.join(', ')}</p>}
                  </>}
                  {!manualDays&&<p className="mt-2">ดึงผลรวมคงพยาบาลเวรบ่ายทุกวันของเดือนจากสถิติหอผู้ป่วย ไม่รวมเวรเช้า/ดึก</p>}
                </div>
                {/* กล่องแสดงผลสรุปข้อมูลอุบัติการณ์ที่ดึงมาจากฐานข้อมูลอัตโนมัติ */}
                <div className="bg-white p-3 rounded-lg border border-amber-200 grid grid-cols-2 gap-4 text-center">
                  <div className="border-r border-gray-100 pr-2">
                    <span className="text-xs text-gray-500 block">จำนวนอุบัติการณ์ในเดือนนี้</span>
                    <span className="text-lg font-bold text-amber-800">
                      {loadingSummaryData ? 'กำลังโหลด...' : summaryError ? 'อ่านข้อมูลไม่สำเร็จ' : `${totalIncidents} ครั้ง`}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">อุบัติการณ์ระดับรุนแรง (&gt; E)</span>
                    <span className="text-lg font-bold text-red-600">
                      {loadingSummaryData ? 'กำลังโหลด...' : summaryError ? 'อ่านข้อมูลไม่สำเร็จ' : `${severeIncidents} ครั้ง`}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-500">* ข้อมูลอุบัติการณ์ด้านบนดึงจากรายการรายเคสที่บันทึกไว้ในเดือนดังกล่าวโดยอัตโนมัติ เพื่อนำไปใช้คำนวณอัตราการเกิด Fall ต่อพันวันนอน</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={onClose} className="px-5 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium">ยกเลิก</button>
                <button type="submit" disabled={saving || loadingSummaryData || !!summaryError || (manualDays ? patientDays==='' : !daySummary?.complete)} className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold shadow disabled:opacity-50">
                  {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลสรุปรายเดือน'}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>, document.body
  );
}