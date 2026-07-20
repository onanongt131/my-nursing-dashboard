'use client'
import { useState, useEffect } from 'react';
import { getProductivityData } from '@/lib/kpiService'; 
import { ProductivityTable } from '@/components/ProductivityTable';

export default function ProductivityPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('2569');

  const legendItems = [
    { label: "< 90", color: "bg-gray-200" },
    { label: "90-110", color: "bg-green-100" },
    { label: "111-120", color: "bg-yellow-100" },
    { label: "121-130", color: "bg-orange-100" },
    { label: "> 130", color: "bg-red-100" },
  ];

const getBgColor = (value: number) => {
  // เงื่อนไขต้องเรียงลำดับจากมากไปน้อยเพื่อให้ครอบคลุมช่วงข้อมูลที่ถูกต้องครับ
  if (value > 130) return "bg-red-100 text-red-800 border border-red-300";      
  if (value > 120) return "bg-orange-100 text-orange-800 border border-orange-300"; 
  if (value > 110) return "bg-yellow-100 text-yellow-800 border border-yellow-300"; 
  if (value >= 90) return "bg-green-100 text-gray-800 border border-green-300 font-normal";
  return "bg-gray-200 text-black-400 border border-gray-300";
    };     // น้อยกว่า 90 สีเหลืองอ่อน

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const results = await getProductivityData(selectedYear);
      setData(results || []);
      setLoading(false);
    }
    loadData();
  }, [selectedYear]);
  
  return (
  <div className="flex flex-col mb-6"> 
    {/* บรรทัดเดียวสำหรับหัวข้อและ Legend */}
    <div className="flex flex-wrap items-end gap-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-800">Nursing Productivity</h2>
      
      {/* Legend ของเกณฑ์สี */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-gray-500 font-medium">เกณฑ์สี:</span>
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-7 h-4 rounded-sm ${item.color} border border-gray-300`}></div>
            <span className="text-xs text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>

      {/* ปีงบประมาณ */}
      <div className="ml-auto text-lg font-semibold text-gray-600 bg-gray-100 px-4 py-2 rounded-lg">
        ปีงบประมาณ: {selectedYear}
      </div>
    </div>

    {/* ส่วนแสดงตาราง */}
    {loading ? (
      <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
    ) : data.length > 0 ? (
      <ProductivityTable data={data} />
    ) : (
      <p className="text-gray-500">ไม่พบข้อมูลในปีงบประมาณ {selectedYear}</p>
    )}
  </div>
);
}