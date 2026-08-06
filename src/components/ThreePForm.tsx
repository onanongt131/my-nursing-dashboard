'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client'; 

export default function ThreePForm({ kpiId }: { kpiId: string }) {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({ purpose: '', process: '', performance: '' });

  useEffect(() => {
    const fetchData = async () => {
      if (!kpiId) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const targetKpiId = Number(kpiId); // แปลงเป็น Number ให้แน่ใจ

      try {
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
          setData({ purpose: '', process: '', performance: '' });
        }
      } catch (err) {
        console.error("Exception fetching 3P:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [kpiId, supabase]);

  const handleSave = async () => {
    if (!kpiId) return;
    setSaving(true);
    const targetKpiId = Number(kpiId);

    const { error } = await supabase
      .from('kpi_3p_analysis')
      .upsert(
        { 
          kpi_id: targetKpiId, 
          purpose: data.purpose,
          process: data.process,
          performance: data.performance,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'kpi_id' } 
      );

    setSaving(false);

    if (error) {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
      return;
    }

    alert('บันทึกข้อมูล 3P เรียบร้อยแล้ว');
  };
  
  if (loading) {
    return <div className="p-4 text-center text-gray-500 bg-white border rounded-xl shadow-sm">กำลังโหลดข้อมูล 3P...</div>;
  }

  return (
    <div className="bg-white p-6 border rounded-xl shadow-sm space-y-4">
      <h2 className="text-lg font-bold text-gray-700 mb-4">ผลวิเคราะห์ตัวชี้วัดแบบ 3P</h2>
      
      {/* Purpose */}
      <div className="grid grid-cols-4 gap-4 items-start">
        <label className="font-semibold text-green-700 pt-2">Purpose</label>
        <textarea 
          className="col-span-3 border p-2 rounded-lg w-full h-20 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          placeholder="ระบุวัตถุประสงค์..."
          value={data.purpose}
          onChange={(e) => setData({...data, purpose: e.target.value})}
        />
      </div>

      {/* Process */}
      <div className="grid grid-cols-4 gap-4 items-start">
        <label className="font-semibold text-blue-700 pt-2">Process</label>
        <textarea 
          className="col-span-3 border p-2 rounded-lg w-full h-32 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          placeholder="ระบุกระบวนการดำเนินงาน..."
          value={data.process}
          onChange={(e) => setData({...data, process: e.target.value})}
        />
      </div>

      {/* Performance */}
      <div className="grid grid-cols-4 gap-4 items-start">
        <label className="font-semibold text-purple-700 pt-2">Performance</label>
        <textarea 
          className="col-span-3 border p-2 rounded-lg w-full h-32 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          placeholder="ระบุผลการดำเนินงานและผลลัพธ์..."
          value={data.performance}
          onChange={(e) => setData({...data, performance: e.target.value})}
        />
      </div>

      <button 
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium text-sm disabled:opacity-50"
      >
        {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล 3P'}
      </button>
    </div>
  );
}