'use client';
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function ThreePForm({ kpiId }: { kpiId: string }) {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({ purpose: '', process: '', performance: '' });

  // 1. โหลดข้อมูลเดิมเมื่อเปิด Component
  useEffect(() => {
    const fetchData = async () => {
      const { data: existingData } = await supabase
        .from('kpi_3p_analysis')
        .select('*')
        .eq('kpi_id', kpiId)
        .single();

      if (existingData) {
        setData({
          purpose: existingData.purpose || '',
          process: existingData.process || '',
          performance: existingData.performance || ''
        });
      }
      setLoading(false);
    };
    fetchData();
  }, [kpiId, supabase]);

  // 2. ฟังก์ชันบันทึกข้อมูล (Upsert)
  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('kpi_3p_analysis')
      .upsert({ 
        kpi_id: kpiId, 
        ...data,
        updated_at: new Date().toISOString()
      });

    if (error) alert('เกิดข้อผิดพลาด: ' + error.message);
    else alert('บันทึกข้อมูล 3P เรียบร้อยแล้ว');
    setSaving(false);
  };

  if (loading) return <div>กำลังโหลดข้อมูล...</div>;

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