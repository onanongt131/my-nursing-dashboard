'use client'
import { useState, useEffect } from 'react';
import { getProductivityData } from '@/lib/kpiService'; 
import { ProductivityTable } from '@/components/ProductivityTable';

export default function ProductivityPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('2569');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      // แก้ไข: เปลี่ยนจาก year เป็น selectedYear
      const results = await getProductivityData(selectedYear);
      setData(results || []);
      setLoading(false);
    }
    loadData();
  }, [selectedYear]); // แก้ไข: เปลี่ยนจาก [year] เป็น [selectedYear]

  return (
    <div className="flex flex-col mb-6"> {/* เปลี่ยนเป็น flex-col เพื่อเรียงจากบนลงล่าง */}
  
  {/* ส่วนหัวที่ต้องการให้อยู่บนตาราง */}
  <div className="flex justify-between items-center mb-4 w-full">
    <h2 className="text-2xl font-bold text-gray-800">Nursing Productivity</h2>
    
    <div className="text-lg font-semibold text-gray-600 bg-gray-100 px-4 py-2 rounded-lg">
      ปีงบประมาณ: 2569
    </div>
  </div>

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