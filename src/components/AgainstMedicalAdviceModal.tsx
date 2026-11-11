'use client';

import { useState, useEffect } from 'react';
import {loadUnitMonthly,saveUnitRecord} from '@/lib/unitRecords/client';
import {createPortal} from 'react-dom';
import {summarizeAmaDischarges} from '@/lib/amaDischarges';

interface AgainstMedicalAdviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  departmentId: string | number;
  departmentName: string;
  supabase: any;
  onSuccess: () => void;
}

export default function AgainstMedicalAdviceModal({
  isOpen,
  onClose,
  departmentId,
  departmentName,
  supabase,
  onSuccess,
}: AgainstMedicalAdviceModalProps) {
  const [activeTab, setActiveTab] = useState<'incident' | 'summary'>('incident');
  const [saving, setSaving] = useState(false);

  // --- State ส่วนที่ 1: บันทึกรายเคส (จำหน่ายไม่สมัครอยู่) ---
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 10));
  const [hn, setHn] = useState('');
  const [an, setAn] = useState('');
  const [treatmentRight, setTreatmentRight] = useState('');
  const [amaReason, setAmaReason] = useState('');

  // --- State ส่วนที่ 2: บันทึกสรุปรายเดือน ---
  const [selectedMonthYear, setSelectedMonthYear] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  const [totalDischarges, setTotalDischarges] = useState('');

  // State นับจำนวนเคสไม่สมัครอยู่จากตารางรายเคสอัตโนมัติ
  const [totalAmaCount, setTotalAmaCount] = useState(0);
  const [loadingSummaryData, setLoadingSummaryData] = useState(false);

  const [ready,setReady]=useState(false),[summaryError,setSummaryError]=useState('');
  const [dischargeStats,setDischargeStats]=useState<ReturnType<typeof summarizeAmaDischarges>|null>(null);
  useEffect(()=>setReady(true),[]);
  useEffect(()=>{if(!isOpen)return;const before=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=before;};},[isOpen]);
  async function loadMonthly(signal?:AbortSignal){return loadUnitMonthly('ama',departmentId,selectedMonthYear,signal);}
  useEffect(()=>{if(!isOpen||activeTab!=='summary'||!departmentId)return;let cancelled=false;setLoadingSummaryData(true);setSummaryError('');setDischargeStats(null);setTotalDischarges('');setTotalAmaCount(0);
    loadMonthly().then(({stats,ama})=>{if(cancelled)return;setDischargeStats(stats);setTotalDischarges(stats.total===null?'':String(stats.total));setTotalAmaCount(ama);}).catch((error:any)=>{if(!cancelled)setSummaryError(error.message||'โหลดข้อมูลไม่สำเร็จ');}).finally(()=>{if(!cancelled)setLoadingSummaryData(false);});return()=>{cancelled=true;};
  },[isOpen,activeTab,selectedMonthYear,departmentId]);
  if(!ready||!isOpen)return null;

  // บันทึกข้อมูลส่วนที่ 1 (รายเคส)
  const handleSaveIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId || saving) return;

    setSaving(true);
    try {
      await saveUnitRecord('ama-incident',{
        department_id: Number(departmentId),
        incident_date: incidentDate,
        hn,
        an,
        treatment_right: treatmentRight,
        ama_reason: amaReason,
        status: 'pending',
      });


      alert('บันทึกข้อมูลจำหน่ายไม่สมัครอยู่ (รายเคส) สำเร็จ');
      setHn('');
      setAn('');
      setTreatmentRight('');
      setAmaReason('');
      
      onSuccess();
      onClose();
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // บันทึกข้อมูลส่วนที่ 2 (สรุปรายเดือน)
  const handleSaveSummary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId || saving) return;

    if(loadingSummaryData||summaryError||!dischargeStats?.complete){alert('ข้อมูลจำหน่ายยังไม่ครบ กรุณาตรวจสอบสถิติ');return;}
    setSaving(true);
    try {
      await saveUnitRecord('ama-summary',{department_id:Number(departmentId),month:selectedMonthYear});

      alert('บันทึกข้อมูลสรุปรายเดือนสำเร็จ');
      setTotalDischarges('');
      onSuccess();
      onClose();
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="บันทึกจำหน่ายไม่สมัครอยู่" className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[92dvh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="shrink-0 bg-teal-700 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">บันทึกข้อมูลจำหน่ายไม่สมัครอยู่</h2>
            <p className="text-xs text-teal-100">หน่วยงาน: {departmentName}</p>
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
                ? 'border-teal-700 text-teal-800 bg-white shadow-sm'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            ส่วนที่ 1: บันทึกรายเคส
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
            ส่วนที่ 2: บันทึกสรุปรายเดือน
          </button>
        </div>

        {/* Body Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {activeTab === 'incident' ? (
            <form onSubmit={handleSaveIncident} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-teal-50/50 p-4 rounded-xl border border-teal-100">
                <div>
                  <label className="block text-xs font-semibold text-teal-900 mb-1">วปป. (วันที่)</label>
                  <input
                    type="date"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
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
                    placeholder="ระบุ AN"
                    value={an}
                    onChange={(e) => setAn(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">สิทธิการรักษา</label>
                <input
                  type="text"
                  placeholder="เช่น บัตรทอง, ประกันสังคม, ข้าราชการ"
                  value={treatmentRight}
                  onChange={(e) => setTreatmentRight(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">สาเหตุที่ไม่สมัครอยู่</label>
                <textarea
                  rows={3}
                  placeholder="ระบุสาเหตุที่ผู้ป่วยขอจำหน่ายไม่สมัครอยู่..."
                  value={amaReason}
                  onChange={(e) => setAmaReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={onClose} className="px-5 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium">ยกเลิก</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-bold shadow disabled:opacity-50">
                  {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลรายเคส'}
                </button>
              </div>
            </form>
          ) : (
            /* ================= ส่วนที่ 2: สรุปรายเดือน ================= */
            <form onSubmit={handleSaveSummary} className="space-y-4">
              <div className="bg-teal-50 p-4 rounded-xl border border-teal-200 space-y-4">
                <h3 className="text-sm font-bold text-teal-900">สรุปข้อมูลจำหน่ายไม่สมัครอยู่ประจำเดือน</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">เดือน (Month)</label>
                    <input
                      type="month"
                      value={selectedMonthYear}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedMonthYear(val);

                      }}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white font-semibold focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">ยอดจำหน่ายรวมทั้งหมดเดือนนี้ (Total Discharges)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder={loadingSummaryData?'กำลังดึงยอด…':'รอข้อมูลครบทุกเวร'}
                      value={totalDischarges}
                      readOnly
                      aria-describedby="ama-discharge-status"
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white font-semibold focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                </div>

                {!loadingSummaryData&&(summaryError||(dischargeStats&&!dischargeStats.complete))&&<div id="ama-discharge-status" role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  {summaryError||<><strong>ข้อมูลไม่ครบทุกเวร/ต้องแก้ไข {dischargeStats?.valid}/{dischargeStats?.expected} เวร</strong>
                    {!!dischargeStats?.missing.length&&<p className="mt-1 break-words">วันที่/เวรที่ขาด: {dischargeStats.missing.join(', ')}</p>}
                    {!!dischargeStats?.duplicate.length&&<p className="mt-1 break-words">วันที่/เวรซ้ำ: {dischargeStats.duplicate.join(', ')}</p>}
                    {!!dischargeStats?.invalid.length&&<p className="mt-1 break-words">วันที่/เวรยอดไม่ครบหรือไม่ถูกต้อง: {dischargeStats.invalid.join(', ')}</p>}
                  </>}
                </div>}
                {/* กล่องแสดงผลจำนวนเคสไม่สมัครอยู่ ที่นับจากส่วนที่ 1 อัตโนมัติ */}
                <div className="bg-white p-3 rounded-lg border border-teal-200 text-center">
                  <span className="text-xs text-gray-500 block">จำนวนไม่สมัครอยู่ (นับจากรายการรายเคสในเดือนนี้)</span>
                  <span className="text-xl font-bold text-teal-800">
                    {loadingSummaryData ? 'กำลังโหลด...' : summaryError ? 'อ่านข้อมูลไม่สำเร็จ' : `${totalAmaCount} เคส`}
                  </span>
                </div>

                <p className="text-xs text-gray-500">* ข้อมูลจำนวนเคส A.M.A. ด้านบนดึงและนับจากวันที่บันทึกในส่วนที่ 1 โดยอัตโนมัติ</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={onClose} className="px-5 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium">ยกเลิก</button>
                <button type="submit" disabled={saving||loadingSummaryData||!!summaryError||!dischargeStats?.complete} className="px-6 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-bold shadow disabled:opacity-50">
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