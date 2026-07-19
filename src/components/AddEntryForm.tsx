'use client';
import { useState, useRef, useEffect } from 'react';
import { useKpiSubmission } from '@/hooks/useKpiSubmission';

export default function AddEntryForm({ kpiId, type, deptId, onSuccess }: { 
  kpiId: string, 
  type: string, 
  deptId?: string, 
  onSuccess: () => void 
}) {

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try { // <--- เพิ่ม try ตรงนี้
      const num = Number(formData.numerator);
      const den = Number(formData.denominator);
      const val = Number(formData.value);
      
      let finalValue = 0;

      // คำนวณค่าตามประเภท
      if (type === 'percent') {
        finalValue = den !== 0 ? Number(((num / den) * 100).toFixed(2)) : 0;
      } else if (type === 'rate') {
        finalValue = den !== 0 ? Number(((num / den) * 1000).toFixed(2)) : 0;
      } else {
        finalValue = val;
      }
        
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
      
      setFormData({ 
        year: new Date().getFullYear().toString(), 
        month: '', 
        numerator: '', 
        denominator: '', 
        value: '' 
      });
      
      onSuccess(); 
      setIsOpen(false);
    
    } catch (error: unknown) {
      if (error instanceof Error) {
          console.error("Error saving KPI:", error.message);
      } else {
          console.error("Error saving KPI:", error);
      }
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
      >
        {isOpen ? "ซ่อนฟอร์ม" : "เพิ่มข้อมูล"}
      </button>

      {isOpen && (
        <form onSubmit={handleSave} className="mt-4 p-4 border rounded-xl bg-white shadow-sm space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input 
              type="number" 
              placeholder="ปี พ.ศ." 
              className="border p-2 rounded-lg" 
              value={formData.year} 
              onChange={(e) => setFormData({...formData, year: e.target.value})} 
              required 
            />
            <select 
              className="border p-2 rounded-lg" 
              value={formData.month} 
              onChange={(e) => setFormData({...formData, month: e.target.value})}
              required
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

          <div className="flex items-center gap-2 pt-2">
            <button type="submit" disabled={isSaving} className="flex-grow bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50">
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </button>
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
              ยกเลิก
            </button>
          </div>
        </form>
      )}
    </div>
  );
}