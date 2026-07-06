'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import KpiBarChart from './KpiBarChart';
import AddEntryForm from './AddEntryForm';

export default function KpiCard({ kpi, chartData }: { kpi: any, chartData: any[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const router = useRouter();

  // สร้างข้อมูลให้ครบ 5 ปี (2565-2569)
  const fullData = [2565, 2566, 2567, 2568, 2569].map((year) => {
    // ค้นหาว่าใน chartData มีข้อมูลของปีนั้นๆ ไหม
    const found = chartData.find((d) => Number(d.year) === year);
    return {
      year: year.toString(),
      // ถ้าไม่มีข้อมูล ให้เป็น null (Recharts จะเว้นว่างแท่งกราฟไว้ให้)
      value: found ? found.value : null, 
    };
  });

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
      {/* ส่วนหัว */}
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-lg font-bold text-gray-800 leading-tight pr-4">
          {kpi.name || 'ไม่มีชื่อตัวชี้วัด'}
        </h2>
        <div className="text-right text-xs text-gray-500 whitespace-nowrap">
          <p>Target: <span className="font-bold text-blue-600">{kpi.target_value ?? '-'}</span></p>
        </div>
      </div>

      {/* กราฟ */}
      <div className="my-4 w-full flex-grow flex items-center justify-center">
        <KpiBarChart 
          // ส่ง fullData ที่เตรียมไว้ไปแทน
          data={fullData} 
          targetValue={kpi.target_value || 0} 
        />
      </div>

      {/* ส่วนปุ่มและฟอร์ม */}
      <div className="mt-auto pt-4 border-t border-gray-100">
        {!isAdding ? (
          <button 
            onClick={() => setIsAdding(true)}
            className="text-indigo-600 flex items-center gap-1 hover:text-indigo-800 transition font-medium text-sm"
          >
            ▼ เพิ่มข้อมูล
          </button>
        ) : (
          <div className="space-y-2">
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
              className="text-gray-400 text-sm hover:text-gray-600 ml-1"
            >
              ▲ ปิดฟอร์ม
            </button>
          </div>
        )}
      </div>
    </div>
  );
}