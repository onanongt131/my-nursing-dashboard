import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Activity, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';

// ตั้งค่าการเชื่อมต่อ Supabase (ดึงจาก Environment Variables ของคุณ)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function IvCareDashboard() {
  const [summaryData, setSummaryData] = useState([]);
  const [complicationData, setComplicationData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. ดึงข้อมูลสรุปรายเดือน
      const { data: monthly, error: monthlyError } = await supabase
        .from('iv_care_monthly_summaries')
        .select('*')
        .order('audit_month', { ascending: true });

      if (monthlyError) throw monthlyError;
      setSummaryData(monthly || []);

      // 2. ดึงข้อมูลภาวะแทรกซ้อนแยกตามประเภท
      const { data: comp, error: compError } = await supabase
        .from('iv_care_complications')
        .select('complication, grade');

      if (compError) throw compError;

      // จัดกลุ่มข้อมูลภาวะแทรกซ้อนสำหรับแสดงกราฟ
      const grouped = comp.reduce((acc, curr) => {
        acc[curr.complication] = (acc[curr.complication] || 0) + 1;
        return acc;
      }, {});

      const chartFormatted = Object.keys(grouped).map((key) => ({
        name: key,
        count: grouped[key]
      }));

      setComplicationData(chartFormatted);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">กำลังโหลดข้อมูล Dashboard...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Activity className="text-blue-600" /> IV Care Quality Dashboard
        </h1>
        <button 
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-blue-600 text-zone text-white rounded-lg shadow hover:bg-blue-700 text-sm font-medium transition"
        >
          รีเฟรชข้อมูล
        </button>
      </div>

      {/* ส่วนแสดงการ์ดสรุปตัวเลขสำคัญ (KPI Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">วันนอนให้สารน้ำรวม (Infusion Days)</p>
            <h3 className="text-2xl font-bold text-gray-800">
              {summaryData.reduce((sum, item) => sum + (item.total_infusion_days || 0), 0)} วัน
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">เจาะเส้นสำเร็จครั้งแรก (First Attempt)</p>
            <h3 className="text-2xl font-bold text-gray-800">
              {summaryData.reduce((sum, item) => sum + (item.first_attempt_punctures || 0), 0)} เคส
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">ภาวะแทรกซ้อนทั้งหมด</p>
            <h3 className="text-2xl font-bold text-gray-800">
              {complicationData.reduce((sum, item) => sum + item.count, 0)} เคส
            </h3>
          </div>
        </div>
      </div>

      {/* ส่วนแสดงกราฟวิเคราะห์ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* กราฟแสดงสถิติภาวะแทรกซ้อน */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">สถิติภาวะแทรกซ้อนแยกตามประเภท</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complicationData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* กราฟแสดงแนวโน้มตัวชี้วัดรายเดือน */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">ภาพรวมการแทงเส้นและจำนวนครั้ง (รายเดือน)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summaryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="audit_month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_punctures" name="จำนวนครั้งที่แทงรวม" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="first_attempt_punctures" name="สำเร็จตั้งแต่ครั้งแรก" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}