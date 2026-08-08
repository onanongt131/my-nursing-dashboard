'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client'; 

export default function AddEntryForm({ kpiId, type, deptId, onSuccess }: { 
  kpiId: string, type: string, deptId?: string, onSuccess: () => void 
}) {
  const supabase = createClient();
  
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

  const fetchExistingEntry = useCallback(async () => {
    if (!kpiId) return;

    try {
      const { data: data3P } = await supabase
        .from('kpi_3p_analysis')
        .select('*')
        .eq('kpi_id', kpiId)
        .maybeSingle();

      let currentNumerator = '';
      let currentDenominator = '';
      let currentValue = '';

      if (formData.year && formData.month) {
        const { data: entryData } = await supabase
          .from('kpi_entries')
          .select('*')
          .eq('kpi_id', kpiId)
          .eq('year', Number(formData.year))
          .eq('month', formData.month)
          .maybeSingle();

        if (entryData) {
          currentNumerator = entryData.numerator !== null ? String(entryData.numerator) : '';
          currentDenominator = entryData.denominator !== null ? String(entryData.denominator) : '';
          currentValue = entryData.value !== null ? String(entryData.value) : '';
        }
      }

      setFormData(prev => ({ 
        ...prev, 
        purpose: data3P?.purpose || '', 
        process: data3P?.process || '', 
        performance: data3P?.performance || '',
        numerator: currentNumerator,
        denominator: currentDenominator,
        value: currentValue
      }));

    } catch (err) {
      console.error("Error fetching existing entry:", err);
    }
  }, [kpiId, formData.year, formData.month, supabase]);

  useEffect(() => {
    if (isOpen) {
      fetchExistingEntry();
    }
  }, [isOpen, fetchExistingEntry]);

  const handleSaveNumeric = async () => {
    setIsSavingNum(true);
    
    try {
      const num = Number(formData.numerator);
      const den = Number(formData.denominator);
      const val = Number(formData.value);
      
      let finalValue = 0;

      if (type === 'count') {
        finalValue = Number(Number(val).toFixed(2));
      } else {
        const rawFinalValue = type === 'percent' ? (den !== 0 ? (num / den) * 100 : 0) : 
                            type === 'rate' ? (den !== 0 ? (num / den) * 1000 : 0) : val;
        
        finalValue = Number(Number(rawFinalValue).toFixed(2));
      }
      
      const payload = {
        kpi_id: Number(kpiId),
        department_id: deptId ? Number(deptId) : null, // <--- เพิ่มตรงนี้เพื่อผูกข้อมูลกับหน่วยงาน
        year: Number(formData.year),
        month: formData.month,
        value: finalValue,
        numerator: type === 'count' ? null : num,      
        denominator: type === 'count' ? null : den
      };

      const { error } = await supabase
        .from('kpi_entries')
        .upsert(payload, { onConflict: 'kpi_id, year, month' });

      if (error) throw error;
      
      alert("บันทึกทับ/อัปเดตผลงานเรียบร้อยแล้ว");
      onSuccess(); 
      
    } catch (err: any) {
      console.error("Error saving numeric entry:", err);
      alert("เกิดข้อผิดพลาดในการบันทึก: " + (err.message || "กรุณาลองใหม่อีกครั้ง"));
    } finally {
      setIsSavingNum(false);
    }
  };

  const handleSave3P = async () => {
    setIsSaving3P(true);
    const targetKpiId = Number(kpiId);

    const { error } = await supabase.from('kpi_3p_analysis').upsert(
      {
        kpi_id: targetKpiId,
        purpose: formData.purpose,
        process: formData.process,
        performance: formData.performance,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'kpi_id' }
    );

    setIsSaving3P(false);

    if (error) {
      alert("เกิดข้อผิดพลาดในการบันทึก: " + error.message);
      return;
    }

    alert("บันทึกการวิเคราะห์ 3P แล้ว");
  };

  return (
    <div> 
      <button onClick={() => setIsOpen(!isOpen)} className="text-indigo-600 font-medium hover:underline">
        {isOpen ? "ซ่อนฟอร์ม" : "เพิ่มข้อมูล/แก้ไขผลงาน / วิเคราะห์ 3P"}
      </button>

      {isOpen && (
        <div className="mt-4 p-4 border rounded-xl bg-white shadow-sm space-y-6">
          <div className="space-y-3">
            <h4 className="font-bold text-gray-700 text-sm">บันทึก / แก้ไขผลงานรายเดือน</h4>
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="number" 
                placeholder="ปี พ.ศ." 
                className="border p-2 rounded-lg text-sm" 
                value={formData.year} 
                onChange={(e) => setFormData({...formData, year: e.target.value})} 
                required 
              />
              <select 
                className="border p-2 rounded-lg text-sm bg-white" 
                value={formData.month} 
                onChange={(e) => {
                  setFormData({...formData, month: e.target.value});
                }} 
                required
              >
                <option value="">-- เลือกเดือนเพื่อดู/แก้ไข --</option>
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {type === 'percent' || type === 'rate' ? (
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="number" 
                  placeholder="ตัวตั้ง (Numerator)" 
                  className="border p-2 rounded text-sm" 
                  value={formData.numerator} 
                  onChange={(e) => setFormData({...formData, numerator: e.target.value})} 
                  required 
                />
                <input 
                  type="number" 
                  placeholder="ตัวหาร (Denominator)" 
                  className="border p-2 rounded text-sm" 
                  value={formData.denominator} 
                  onChange={(e) => setFormData({...formData, denominator: e.target.value})} 
                  required 
                />
              </div>
            ) : (
              <input 
                type="number" 
                placeholder="ระบุค่า (Value)" 
                className="border w-full p-2 rounded text-sm" 
                value={formData.value} 
                onChange={(e) => setFormData({...formData, value: e.target.value})} 
                required 
              />
            )}

            <button 
              onClick={handleSaveNumeric} 
              disabled={!formData.month}
              className={`w-full py-2 rounded-lg text-white font-medium text-sm transition-all ${!formData.month ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {isSavingNum ? 'กำลังบันทึก...' : 'บันทึกทับ/อัปเดตผลงาน'}
            </button>
            {!formData.month && <p className="text-xs text-red-500 text-center">กรุณาเลือกเดือนก่อนทำการบันทึกหรือตรวจสอบข้อมูล</p>}
          </div>

          <div className="border-t pt-4 space-y-3">
            <h4 className="font-bold text-gray-700 text-sm">วิเคราะห์ 3P</h4>
            <textarea placeholder="Purpose" className="w-full border p-2 rounded text-sm" value={formData.purpose} onChange={(e) => setFormData({...formData, purpose: e.target.value})} />
            <textarea placeholder="Process" className="w-full border p-2 rounded text-sm" value={formData.process} onChange={(e) => setFormData({...formData, process: e.target.value})} />
            <textarea placeholder="Performance" className="w-full border p-2 rounded text-sm" value={formData.performance} onChange={(e) => setFormData({...formData, performance: e.target.value})} />
            <button onClick={handleSave3P} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium transition-all">
              {isSaving3P ? 'กำลังบันทึก...' : 'บันทึกการวิเคราะห์ 3P'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}