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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    let finalValue = formData.value;
    if (type === 'percent' && formData.numerator && formData.denominator) {
      finalValue = ((parseFloat(formData.numerator) / parseFloat(formData.denominator)) * 100).toFixed(2);
    }

    try {
      await submitEntry(kpiId, { 
        ...formData, 
        value: finalValue,
        numerator: type === 'percent' ? parseFloat(formData.numerator) : null,
        denominator: type === 'percent' ? parseFloat(formData.denominator) : null
      });
      onSuccess();
      setIsOpen(false);
      // รีเซ็ตฟอร์มหลังจากบันทึกสำเร็จ
      setFormData({ year: new Date().getFullYear().toString(), month: 'Jan', numerator: '', denominator: '', value: '' });
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-4 border-t pt-4">
      <button onClick={() => setIsOpen(!isOpen)} className="text-indigo-600 font-medium flex items-center gap-1">
        {isOpen ? '▲' : '▼'} เพิ่มข้อมูล
      </button>

      {isOpen && (
        <form onSubmit={handleSave} className="mt-4 p-4 border rounded-lg bg-gray-50 space-y-3">
          {/* 1. ปี และ 2. เดือน (ใช้ร่วมกัน) */}
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="ปี (พ.ศ.)" className="border p-2 rounded" 
              value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} required />
            <select className="border p-2 rounded" value={formData.month} 
              onChange={(e) => setFormData({...formData, month: e.target.value})}>
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => 
                <option key={m} value={m}>{m}</option>
              )}
            </select>
          </div>

          {/* แทนที่ช่อง "ระบุค่า (Value)" เดิมด้วยเงื่อนไขนี้ครับ */}
          {type === 'percent' ? (
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="number" 
                placeholder="ตัวตั้ง" 
                className="border p-2 rounded" 
                value={formData.numerator} 
                onChange={(e) => setFormData({...formData, numerator: e.target.value})} 
                required 
              />
              <input 
                type="number" 
                placeholder="ตัวหาร" 
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

          {/* 4. ปุ่มบันทึก */}
          <button type="submit" disabled={isSaving} className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
            {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </form>
      )}
    </div>
  );
}