'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AddEntryForm({ kpiId, type, onSuccess }: { kpiId: string, type: string, onSuccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState('Jan');
  const [numerator, setNumerator] = useState('');
  const [denominator, setDenominator] = useState('');
  const [value, setValue] = useState('');

  const monthMap: { [key: string]: number } = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // คำนวณค่าร้อยละในหน้าเว็บก่อนส่งไปเก็บที่คอลัมน์ value
    let finalValue = 0;
    if (type === 'percent') {
      const num = parseFloat(numerator) || 0;
      const den = parseFloat(denominator) || 1;
      finalValue = den > 0 ? (num / den) * 100 : 0;
    } else {
      finalValue = parseFloat(value) || 0;
    }

    const dataToSave = { 
        kpi_id: parseInt(kpiId), 
        year: parseFloat(year), 
        month: month.toString(), // สอดคล้องกับ schema เดิมที่เก็บเป็น text
        value: parseFloat(finalValue.toFixed(2)) 
    };

    const { error } = await supabase.from('kpi_entries').insert([dataToSave]);

    if (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } else {
      alert('บันทึกข้อมูลสำเร็จ!');
      onSuccess(); // อัปเดตกราฟทันที
      setIsOpen(false);
      setNumerator(''); setDenominator(''); setValue('');
    }
  };

  return (
    <div className="mt-6 border-t pt-4">
      {!isOpen ? (
        <button onClick={() => setIsOpen(true)} className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
          + เพิ่มข้อมูล
        </button>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <h3 className="font-semibold text-lg">บันทึกข้อมูลใหม่ ({type === 'percent' ? 'ร้อยละ' : 'จำนวน'})</h3>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="ปี" className="border p-2 rounded" value={year} onChange={(e) => setYear(e.target.value)} required />
            <select className="border p-2 rounded" value={month} onChange={(e) => setMonth(e.target.value)} required>
              {Object.keys(monthMap).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {type === 'percent' ? (
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="ตัวตั้ง" className="border p-2 rounded" value={numerator} onChange={(e) => setNumerator(e.target.value)} required />
              <input type="number" placeholder="ตัวหาร" className="border p-2 rounded" value={denominator} onChange={(e) => setDenominator(e.target.value)} required />
            </div>
          ) : (
            <input type="number" placeholder="ระบุจำนวน" className="border w-full p-2 rounded" value={value} onChange={(e) => setValue(e.target.value)} required />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsOpen(false)} className="w-1/3 py-2 bg-gray-200 rounded-lg">ยกเลิก</button>
            <button type="submit" className="w-2/3 py-2 bg-blue-600 text-white rounded-lg">บันทึก</button>
          </div>
        </form>
      )}
    </div>
  );
}