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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitEntry(type, { ...formData, kpi_id: kpiId });
      alert('บันทึกข้อมูลสำเร็จ!');
      onSuccess();
      setIsOpen(false);
      setFormData({ year: new Date().getFullYear().toString(), month: 'Jan', numerator: '', denominator: '', value: '' });
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  return (
    <div className="mt-4 border-t pt-4">
      {/* ปรับปรุงตรงนี้: เปลี่ยนปุ่มให้เป็นข้อความและลูกศร */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="text-indigo-600 flex items-center gap-1 hover:text-indigo-800 transition font-medium"
      >
        {isOpen ? '▲' : '▼'} เพิ่มข้อมูล
      </button>

      {isOpen && (
        <form onSubmit={handleSave} className="mt-4 p-4 border rounded-lg bg-gray-50 space-y-3">
          {/* ส่วนฟอร์มคงเดิม */}
          <div className="grid grid-cols-2 gap-2">
            <input 
              type="number" placeholder="ปี (พ.ศ.)" className="border p-2 rounded" 
              value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} required 
            />
            <select 
              className="border p-2 rounded" value={formData.month} 
              onChange={(e) => setFormData({...formData, month: e.target.value})} required
            >
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {type === 'percent' ? (
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="number" placeholder="ตัวตั้ง" className="border p-2 rounded" 
                value={formData.numerator} onChange={(e) => setFormData({...formData, numerator: e.target.value})} required 
              />
              <input 
                type="number" placeholder="ตัวหาร" className="border p-2 rounded" 
                value={formData.denominator} onChange={(e) => setFormData({...formData, denominator: e.target.value})} required 
              />
            </div>
          ) : (
            <input 
              type="number" placeholder="ระบุจำนวน" className="border w-full p-2 rounded" 
              value={formData.value} onChange={(e) => setFormData({...formData, value: e.target.value})} required 
            />
          )}
          
          <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
            บันทึก
          </button>
        </form>
      )}
    </div>
  );
}