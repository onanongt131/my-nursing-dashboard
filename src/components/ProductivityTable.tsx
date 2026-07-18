import React from 'react';
import { ProductivityEntry } from '@/lib/kpiService';

interface ProductivityTableProps {
  data: ProductivityEntry[];
}

export const ProductivityTable: React.FC<ProductivityTableProps> = ({ data }) => {
  // 1. จัดกลุ่มข้อมูลตามหน่วยงาน
  const groupedData = data.reduce((acc, entry) => {
  const deptName = entry.department_name || 'ไม่ระบุหน่วยงาน';
    if (!acc[deptName]) acc[deptName] = {};
    acc[deptName][entry.month] = entry.np_value;
    return acc;
  }, {} as Record<string, Record<number, number>>);

  const months = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const monthLabels = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];

  // 1. ปรับฟังก์ชัน getBgColor ให้สีจางลง
const getBgColor = (value: number) => {
  // เงื่อนไขต้องเรียงลำดับจากมากไปน้อยเพื่อให้ครอบคลุมช่วงข้อมูลที่ถูกต้องครับ
  if (value > 130) return "bg-red-100 text-red-800 border border-red-200";      // มากกว่า 130 สีแดงอ่อน
  if (value > 120) return "bg-pink-100 text-pink-800 border border-pink-200";   // มากกว่า 120 สีชมพู
  if (value > 110) return "bg-orange-100 text-orange-800 border border-orange-200"; // มากกว่า 110 สีส้มอ่อน
  if (value >= 90) return "bg-green-100 text-green-800 border border-green-200"; // 90-110 สีเขียว
  return "bg-yellow-100 text-yellow-800 border border-yellow-200";              // น้อยกว่า 90 สีเหลืองอ่อน
};

  console.log("Data received in Table:", data); // ดูว่าใน object มี key 'department_name' ไหม

  // 2. ปรับการแสดงผลใน Table
return (
  <div className="overflow-x-auto">
    <table className="min-w-full text-sm text-left border-separate border-spacing-x-0 border-spacing-y-1">
      <thead>
        <tr className="text-gray-500 uppercase text-xs">
          <th className="px-4 py-2">หน่วยงาน</th>
          {monthLabels.map(m => <th key={m} className="px-1 py-2 text-center">{m}</th>)}
          <th className="px-3 py-2 text-center">เฉลี่ย</th>
        </tr>
      </thead>
      <tbody className="bg-white">
        {Object.entries(groupedData)
  .sort((a, b) => a[0].localeCompare(b[0], 'th')) // เรียงลำดับชื่อหน่วยงาน ก-ฮ
  .map(([deptName, monthsData]) => {
    const values = months.map(m => monthsData[m]).filter(v => typeof v === 'number');
    const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;

    return (
      <tr key={deptName} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <td className="px-4 py-2 font-medium text-gray-700">{deptName}</td>
        {months.map(m => {
          const value = monthsData[m];
          const isValueValid = typeof value === 'number';
          return (
            <td key={m} className="px-0.5 py-1 text-center">
              <div className={`inline-block px-2 py-0.5 rounded font-semibold text-xs ${isValueValid ? getBgColor(value) : 'text-gray-300'}`}>
                {isValueValid ? value.toFixed(1) : '-'}
              </div>
            </td>
          );
        })}
        {/* ช่องแสดงผลเฉลี่ย (อย่าลืมใส่ส่วนนี้ต่อท้ายครับ) */}
        <td className="px-3 py-1 text-center">
           <div className={`inline-block px-2 py-0.5 rounded font-bold text-xs ${average !== null ? getBgColor(average) : 'text-gray-300'}`}>
             {average !== null ? average.toFixed(1) : '-'}
           </div>
        </td>
      </tr>
    );
  })}
      </tbody>
    </table>
  </div>
);
}