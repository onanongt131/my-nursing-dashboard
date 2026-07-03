'use client';
import { useState } from 'react';
import KpiBarChart from './KpiBarChart';

export default function KpiCard({ kpi }: { kpi: any }) {
  // 1. ประกาศ useState ไว้ "ข้างใน" ฟังก์ชันนี้เท่านั้น เพื่อแยก State ของแต่ละการ์ด
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
      {/* ส่วนหัว */}
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-lg font-bold text-gray-800 leading-tight pr-4">
          {kpi.name || 'ไม่มีชื่อตัวชี้วัด'}
        </h2>
        <div className="text-right text-xs text-gray-500 whitespace-nowrap">
          <p>Target: <span className="font-bold text-blue-600">{kpi.target_value ?? '-'}</span></p>
        </div>
      </div>

      {/* 2. กราฟ: วางไว้นอกเงื่อนไข isAdding เพื่อให้กราฟแสดงผล "ตลอดเวลา" ไม่ว่าจะเปิด/ปิดฟอร์ม */}
      <div className="my-6 min-h-[200px] w-full flex items-center justify-center">
        <KpiBarChart 
          data={kpi.kpi_entries || []} 
          targetValue={kpi.target_value || 0} 
        />
      </div>

      {/* 3. ส่วนปุ่มและฟอร์ม: ให้สลับแค่ส่วนนี้เท่านั้น */}
      <div className="mt-auto pt-4 border-t border-gray-100">
        {!isAdding ? (
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
          >
            + เพิ่มข้อมูล
          </button>
        ) : (
          <div className="space-y-3 animate-in fade-in duration-300">
            <h3 className="font-bold text-gray-800 text-sm">บันทึกข้อมูลใหม่ (ร้อยละ)</h3>
            
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="ปี" className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
              <select className="w-full p-2 border border-gray-300 rounded-lg text-sm">
                <option>Jan</option><option>Feb</option><option>Mar</option>
              </select>
              <input type="number" placeholder="ตัวตั้ง" className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
              <input type="number" placeholder="ตัวหาร" className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setIsAdding(false)} 
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition"
              >
                ยกเลิก
              </button>
              <button 
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition"
              >
                บันทึก
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}