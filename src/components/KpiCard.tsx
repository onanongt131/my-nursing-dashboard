'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import KpiBarChart from './KpiBarChart';
import AddEntryForm from './AddEntryForm';

export default function KpiCard({ kpi, chartData }: { kpi: any, chartData: any[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const router = useRouter();

  // ปรับปรุง: ใช้ useMemo เพื่อประสิทธิภาพที่ดีขึ้น
  const fullData = useMemo(() => {
    return [2565, 2566, 2567, 2568, 2569].map((year) => {
      const found = chartData.find((d) => Number(d.year) === year);
      return {
        year: year.toString(),
        value: found ? found.value : null,
      };
    });
  }, [chartData]); // คำนวณใหม่เฉพาะเมื่อ chartData เปลี่ยนเท่านั้น

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow">
      {/* ส่วนหัว */}
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-lg font-bold text-gray-800 leading-tight pr-4">
          {kpi.name || 'ไม่มีชื่อตัวชี้วัด'}
        </h2>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Target</p>
          <span className="font-bold text-blue-600">{kpi.target_value ?? '-'}</span>
        </div>
      </div>

      {/* กราฟ */}
      <div className="my-4 w-full flex-grow flex items-center justify-center min-h-[200px]">
        <KpiBarChart 
          data={fullData} 
          targetValue={kpi.target_value || 0} 
        />
      </div>

      {/* ส่วนปุ่มและฟอร์ม */}
      <div className="mt-auto pt-4 border-t border-gray-100">
        {!isAdding ? (
          <button 
            onClick={() => setIsAdding(true)}
            className="text-indigo-600 flex items-center gap-1 hover:text-indigo-700 transition font-semibold text-sm"
          >
            <span>+</span> เพิ่มข้อมูลปีปัจจุบัน
          </button>
        ) : (
          <div className="space-y-3 animate-in fade-in zoom-in duration-200">
            <AddEntryForm 
              kpiId={kpi.id.toString()} 
              type={kpi.Type}
              onSuccess={() => {
                setIsAdding(false);
                router.refresh();
              }} 
            />
            <button 
              onClick={() => setIsAdding(false)}
              className="text-gray-400 text-xs hover:text-gray-600 w-full text-center"
            >
              ยกเลิก
            </button>
          </div>
        )}
      </div>
    </div>
  );
}