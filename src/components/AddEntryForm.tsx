'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client'; // ปรับตามที่คุณสร้างไว้
import { useKpiSubmission } from '@/hooks/useKpiSubmission';

export default function AddEntryForm({ kpiId, type, deptId, onSuccess }: { 
  kpiId: string, type: string, deptId?: string, onSuccess: () => void 
}) {
  const supabase = createClient();
  const { submitEntry } = useKpiSubmission();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSavingNum, setIsSavingNum] = useState(false);
  const [isSaving3P, setIsSaving3P] = useState(false);
  
const [formData, setFormData] = useState({
    year: new Date().getFullYear().toString(),
    month: '',
    numerator: '',
    denominator: '',
    value: '',
    purpose: '',
    process: '',
    performance: ''
  });

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        // ดึง 3P
        const { data: data3P } = await supabase.from('kpi_3p_analysis').select('*').eq('kpi_id', kpiId).single();
        if (data3P) {
          setFormData(prev => ({ ...prev, purpose: data3P.purpose || '', process: data3P.process || '', performance: data3P.performance || '' }));
        }
      };
      fetchData();
    }
  }, [isOpen, kpiId, supabase]);

  // 1. บันทึกเฉพาะตัวเลข (จัดการ payload ไว้ในนี้)
  const handleSaveNumeric = async () => {
    setIsSavingNum(true);
    
    // คำนวณค่าก่อน
    const num = Number(formData.numerator);
    const den = Number(formData.denominator);
    const val = Number(formData.value);
    let finalValue = type === 'percent' ? (den !== 0 ? (num / den) * 100 : 0) : 
                     type === 'rate' ? (den !== 0 ? (num / den) * 1000 : 0) : val;

    // สร้าง payload และส่งค่าในฟังก์ชันนี้เท่านั้น
    const payload = {
      kpi_id: kpiId,
      department_id: deptId || null,
      year: Number(formData.year),
      month: formData.month,
      value: finalValue,
      numerator: type === 'count' ? val : num,
      denominator: type === 'count' ? 1 : den,
      type: type
    };

    await submitEntry(kpiId, payload);
    
    setIsSavingNum(false);
    onSuccess();
    alert("บันทึกผลงานแล้ว");
  };

  // 2. บันทึกเฉพาะ 3P (แยกฟังก์ชันอิสระ)
  const handleSave3P = async () => {
    setIsSaving3P(true);
    const { error } = await supabase.from('kpi_3p_analysis').upsert({
      kpi_id: kpiId,
      purpose: formData.purpose,
      process: formData.process,
      performance: formData.performance,
      updated_at: new Date().toISOString()
    });
    setIsSaving3P(false);
    if (!error) alert("บันทึกการวิเคราะห์ 3P แล้ว");
  };

  return (
    <div> 
      <button onClick={() => setIsOpen(!isOpen)} className="text-indigo-600 font-medium">
        {isOpen ? "ซ่อนฟอร์ม" : "เพิ่มข้อมูล/วิเคราะห์ 3P"}
      </button>

      {isOpen && (
        <div className="mt-4 p-4 border rounded-xl bg-white shadow-sm space-y-6">
          {/* ส่วนตัวเลข */}
          <div className="space-y-3">
             <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="ปี พ.ศ." className="border p-2 rounded-lg" value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} required />
            <select className="border p-2 rounded-lg" value={formData.month} onChange={(e) => setFormData({...formData, month: e.target.value})} required>
              <option value="">เลือกเดือน</option>
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* ส่วนรับค่าตามประเภท KPI */}
          {type === 'percent' || type === 'rate' ? (
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="number" 
                placeholder="ตัวตั้ง (Numerator)" 
                className="border p-2 rounded" 
                value={formData.numerator} 
                onChange={(e) => setFormData({...formData, numerator: e.target.value})} 
                required 
              />
              <input 
                type="number" 
                placeholder="ตัวหาร (Denominator)" 
                className="border p-2 rounded" 
                value={formData.denominator} 
                onChange={(e) => setFormData({...formData, denominator: e.target.value})} 
                required 
              />
            </div>
          ) : (
            <input 
              type="number" 
              placeholder="ระบุค่า (Value)" 
              className="border w-full p-2 rounded" 
              value={formData.value} 
              onChange={(e) => setFormData({...formData, value: e.target.value})} 
              required 
            />
          )}
          {/* Inputs... */}
             <button onClick={handleSaveNumeric} className="w-full bg-green-600 text-white py-2 rounded-lg">
               {isSavingNum ? 'กำลังบันทึก...' : 'บันทึกผลงาน'}
             </button>
          </div>

          {/* ส่วน 3P */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-bold">วิเคราะห์ 3P</h4>
            <textarea placeholder="Purpose" className="w-full border p-2 rounded" value={formData.purpose} onChange={(e) => setFormData({...formData, purpose: e.target.value})} />
            <textarea placeholder="Process" className="w-full border p-2 rounded" value={formData.process} onChange={(e) => setFormData({...formData, process: e.target.value})} />
            <textarea placeholder="Performance" className="w-full border p-2 rounded" value={formData.performance} onChange={(e) => setFormData({...formData, performance: e.target.value})} />
            <button onClick={handleSave3P} className="w-full bg-indigo-600 text-white py-2 rounded-lg">
              {isSaving3P ? 'กำลังบันทึก...' : 'บันทึกการวิเคราะห์'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}