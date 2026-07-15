'use client';
import { useState } from 'react';
import { useKpiSubmission } from '@/hooks/useKpiSubmission';

export default function AddEntryForm({ kpiId, type, onSuccess }: { kpiId: string, type: string, onSuccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear().toString(),
    month: 'Jan',
    numerator: '',
    denominator: '',
    value: ''
  });
  
  const { submitEntry } = useKpiSubmission();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => { // ระบุชนิดข้อมูลให้ e
  e.preventDefault();
  
  // 2. ป้องกัน Error หารด้วยศูนย์
  let finalValue = 0;
  if (type === 'percent') {
    const num = Number(formData.numerator);
    const den = Number(formData.denominator);
    finalValue = den !== 0 ? (num / den) * 100 : 0; 
  } else {
    finalValue = Number(formData.value);
  }
  
  // 3. เตรียม payload ให้ตรงกับโครงสร้างที่ฐานข้อมูลต้องการ
  const payload = {
    kpi_id: kpiId,
    year: Number(formData.year),
    month: formData.month,
    value: finalValue,
    // ส่งข้อมูลดิบไปด้วยกรณีต้องตรวจสอบย้อนหลัง
    raw_data: type === 'percent' ? { num: formData.numerator, den: formData.denominator } : null 
  };

  try {
    setIsSaving(true);
    
    // ปรับตรงนี้: ส่ง kpiId และ formData (หรือ payload ตามที่คุณต้องการส่ง)
    // ให้ดูว่า saveKpiEntry ต้องการข้อมูลชุดไหน
    await submitEntry(kpiId, payload); 
    
    onSuccess(); 
    setIsOpen(false);
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
            placeholder="ปี (พ.ศ.)" 
            className="border p-2 rounded" 
            value={formData.year} 
            onChange={(e) => setFormData({...formData, year: e.target.value})} 
            required 
          />
          <select 
            className="border p-2 rounded" 
            value={formData.month} 
            onChange={(e) => setFormData({...formData, month: e.target.value})}
          >
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => 
              <option key={m} value={m}>{m}</option>
            )}
          </select>
        </div>

        {/* ส่วนรับค่าตามประเภท KPI */}
        {type === 'percent' ? (
          <div className="grid grid-cols-2 gap-2">
            <input 
              type="number" 
              placeholder="ตัวตั้ง" 
              className="border p-2 rounded" 
              value={formData.numerator || ''} 
              onChange={(e) => setFormData({...formData, numerator: e.target.value})} 
              required 
            />
            <input 
              type="number" 
              placeholder="ตัวหาร" 
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
            className="px-4 py-2 text-sm text-gray-150 bg-gray-300 rounded-lg hover:bg-gray-400 transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      </form>
      )}
    </div>
  )}