'use client';
import { useState, useRef, useEffect } from 'react'; // 1. เพิ่ม useRef และ useEffect
import { useKpiSubmission } from '@/hooks/useKpiSubmission';

export default function AddEntryForm({ kpiId, type, onSuccess }: { kpiId: string, type: string, onSuccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear().toString(),
    month: '',
    numerator: '',
    denominator: '',
    value: ''
  });
 
  const { submitEntry } = useKpiSubmission();
  const [isSaving, setIsSaving] = useState(false);
  const [showMonthSelect, setShowMonthSelect] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null); // 2. สร้าง ref สำหรับ select

  useEffect(() => {
    if (showMonthSelect && selectRef.current) {
      selectRef.current.focus();
    }
  }, [showMonthSelect]);

  const handleSave = async (e: React.FormEvent) => {
  e.preventDefault();
  
  let finalValue = 0;
  let numerator = Number(formData.numerator);
  let denominator = Number(formData.denominator);

  if (type === 'percent') {
    finalValue = denominator !== 0 ? (numerator / denominator) * 100 : 0;
  } else if (type === 'rate') {
    // สูตรสำหรับ rate: (ตัวตั้ง / ตัวหาร) * 1000
    finalValue = denominator !== 0 ? (numerator / denominator) * 1000 : 0;
  } else {
    // กรณี count: ใช้ค่าจากช่อง value
    numerator = Number(formData.value);
    finalValue = numerator;
    denominator = 1; // เพื่อความสมบูรณ์ของข้อมูล
  }
  
  const payload = {
    kpi_id: kpiId,
    year: Number(formData.year),
    month: formData.month,
    value: finalValue,
    numerator: numerator,
    denominator: denominator,
    type: type
  };

  try {
    setIsSaving(true);
    await submitEntry(kpiId, payload); 
    onSuccess(); 
    setIsOpen(false);
    // รีเซ็ตฟอร์ม (แนะนำให้ทำ)
    setFormData({ year: new Date().getFullYear().toString(), month: 'Jan', numerator: '', denominator: '', value: '' });
  } catch (error) {
    console.error("Error saving KPI:", error);
    alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
  } finally {
    setIsSaving(false);
  }
};

  return (
    <div> 
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="text-indigo-600 font-medium flex items-center gap-1"
        >เพิ่มข้อมูล 
      </button>

      {isOpen && (
      <form onSubmit={handleSave} className="mt-4 p-4 border rounded-lg bg-gray-50 space-y-3">
        <div className="grid grid-cols-2 gap-2">
            <input 
              type="number" 
              placeholder="ปี พ.ศ." 
              className="border p-2 rounded" 
              value={formData.year === new Date().getFullYear().toString() ? '' : formData.year} 
              onChange={(e) => setFormData({...formData, year: e.target.value})} 
              required 
            />

          <select 
            className="border p-2 rounded" 
            value={formData.month} 
            onChange={(e) => setFormData({...formData, month: e.target.value})}
          >
              <option value="">เลือกเดือน</option>
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => 
              <option key={m} value={m}>{m}</option>
            )}
          </select>
        </div>
  

        {/* ส่วนรับค่าตามประเภท KPI */}
{type === 'percent' || type === 'rate' ? (
  <div className="grid grid-cols-2 gap-2">
    <input 
      type="number" 
      placeholder="ตัวตั้ง (Numerator)" 
      className="border p-2 rounded" 
      value={formData.numerator || ''} 
      onChange={(e) => setFormData({...formData, numerator: e.target.value})} 
      required 
    />
    <input 
      type="number" 
      placeholder="ตัวหาร (Denominator)" 
      className="border p-2 rounded" 
      value={formData.denominator || ''} 
      onChange={(e) => setFormData({...formData, denominator: e.target.value})} 
      required 
    />
  </div>
) : (
  <input 
    type="number" 
    placeholder="ระบุค่า (Value)" 
    className="border w-full p-2 rounded" 
    value={formData.value || ''} 
    onChange={(e) => setFormData({...formData, value: e.target.value})} 
    required 
  />
)}

        <div className="flex items-center gap-3 mt-2">
          {/* ปุ่มบันทึก (ให้ยืดเต็มที่) */}
          <button 
            type="submit" 
            className="flex-grow bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            บันทึก
          </button>

          {/* ปุ่มยกเลิก (ปรับขนาดและสี) */}
          <button 
            type="button" 
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      </form>
      )}
    </div>
  )}