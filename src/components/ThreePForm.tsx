'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function ThreePForm({ kpiId }: { kpiId: string }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({ purpose: '', process: '', performance: '' });

  // 1. โหลดข้อมูลเดิมเมื่อเปิด Component
  useEffect(() => {
    const fetchData = async () => {
      if (!kpiId) return;
      setLoading(true);

      const targetKpiId = Number(kpiId);

      // ใช้ .maybeSingle() เพื่อดึงมาแค่ 1 แถวแบบปลอดภัย ไม่ให้เกิด Error 406
      const { data: existingData, error } = await supabase
        .from('kpi_3p_analysis')
        .select('*')
        .eq('kpi_id', targetKpiId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching 3P:", error.message);
      }

      if (existingData) {
        setData({
          purpose: existingData.purpose || '',
          process: existingData.process || '',
          performance: existingData.performance || ''
        });
      } else {
        // ถ้ายังไม่มีข้อมูล ให้เคลียร์ฟอร์มเป็นค่าว่าง
        setData({ purpose: '', process: '', performance: '' });
      }
      setLoading(false);
    };

    fetchData();
  }, [kpiId, supabase]);

  const handleSave = async () => {
    if (!kpiId) return;
    setSaving(true);
    const targetKpiId = Number(kpiId);

    // ใช้ .upsert และระบุ onConflict เพื่อให้ Supabase อัปเดตทับข้อมูลเก่าทันทีถ้า kpi_id ซ้ำ
    const { error } = await supabase
      .from('kpi_3p_analysis')
      .upsert(
        { 
          kpi_id: targetKpiId, 
          purpose: data.purpose,
          process: data.process,
          performance: data.performance 
        },
        { onConflict: 'kpi_id' } // จุดนี้สำคัญมาก ต้องตรงกับชื่อคอลัมน์ที่เป็น Unique ในตาราง
      );

    if (error) {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
      setSaving(false);
      return;
    }

    alert('บันทึกข้อมูล 3P เรียบร้อยแล้ว');
    setSaving(false);
  };
  
  if (loading) return <div className="p-4 text-center text-gray-500">กำลังโหลดข้อมูล 3P...</div>;

  return (
    <div className="bg-white p-6 border rounded-xl shadow-sm space-y-4">
      <h2 className="text-lg font-bold text-gray-700 mb-4">ผลวิเคราะห์ตัวชี้วัดแบบ 3P</h2>
      
      {/* Purpose */}
      <div className="grid grid-cols-4 gap-4 items-start">
        <label className="font-semibold text-green-700 pt-2">Purpose</label>
        <textarea 
          className="col-span-3 border p-2 rounded-lg w-full h-20"
          value={data.purpose}
          onChange={(e) => setData({...data, purpose: e.target.value})}
        />
      </div>

      {/* Process */}
      <div className="grid grid-cols-4 gap-4 items-start">
        <label className="font-semibold text-blue-700 pt-2">Process</label>
        <textarea 
          className="col-span-3 border p-2 rounded-lg w-full h-32"
          value={data.process}
          onChange={(e) => setData({...data, process: e.target.value})}
        />
      </div>

      {/* Performance */}
      <div className="grid grid-cols-4 gap-4 items-start">
        <label className="font-semibold text-purple-700 pt-2">Performance</label>
        <textarea 
          className="col-span-3 border p-2 rounded-lg w-full h-32"
          value={data.performance}
          onChange={(e) => setData({...data, performance: e.target.value})}
        />
      </div>

      <button 
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
      >
        {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล 3P'}
      </button>
    </div>
  );
}