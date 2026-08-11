import React from 'react';
import { ProductivityEntry } from '@/lib/kpiService';

interface ProductivityTableProps {
  data: ProductivityEntry[];
  selectedYear: string;
  onViewHistory: (deptName: string) => void;
}

export const ProductivityTable: React.FC<ProductivityTableProps> = ({ data, selectedYear, onViewHistory }) => {
  const getMappedDepartmentName = (originalName: string, year: string) => {
    if (year === '2567' || year === '2568') {
      if (originalName === 'อายุรกรรม 4') return 'อายุรกรรมชาย 1';
      if (originalName === 'อายุรกรรม 2') return 'อายุรกรรมชาย 2';
      if (originalName === 'อายุรกรรม 5') return 'อายุรกรรมหญิง';
      if (originalName === 'อายุรกรรม 6') return 'ร่มไทร';
    }
    return originalName;
  };

  const groupedData = data.reduce((acc, entry) => {
    const rawDeptName = entry.department_name || 'ไม่ระบุหน่วยงาน';
    const deptName = getMappedDepartmentName(rawDeptName, selectedYear);

    if (!acc[deptName]) acc[deptName] = {};
    acc[deptName][entry.month] = entry.np_value;
    return acc;
  }, {} as Record<string, Record<number, number>>);

  const months = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const monthLabels = ['OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'];

  const getBgColor = (value: number) => {
    if (value > 130) return "bg-red-100 text-red-800 border border-red-300";      
    if (value > 120) return "bg-orange-100 text-orange-800 border border-orange-300"; 
    if (value > 110) return "bg-yellow-100 text-yellow-800 border border-yellow-300"; 
    if (value >= 90) return "bg-green-100 text-gray-800 border border-green-300 font-normal";
    return "bg-gray-200 text-black-400 border border-gray-300";
  }; 

  const getTextColorOnly = (value: number) => {
    if (value > 130) return "text-red-600";      
    if (value > 120) return "text-orange-600"; 
    if (value > 110) return "text-yellow-600"; 
    if (value >= 90) return "text-emerald-600";
    return "text-gray-400";
  };

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-2xl border border-gray-100 p-4">
      <table className="min-w-full text-sm text-left border-separate border-spacing-x-0 border-spacing-y-2">
        <thead>
          <tr className="text-gray-500 uppercase text-xs bg-gray-50/80">
            {/* ตรึงคอลัมน์แรก Header ให้ทึบแสงและอยู่ชั้นบนสุด (z-30) */}
            <th className="sticky left-0 z-30 bg-gray-50 px-6 py-3.5 rounded-l-xl min-w-[260px] font-semibold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
              หน่วยงาน
            </th>
            {monthLabels.map(m => (
              <th key={m} className="px-3 py-3.5 text-center min-w-[75px] font-semibold">{m}</th>
            ))}
            <th className="px-4 py-3.5 text-center rounded-r-xl min-w-[95px] bg-orange-50/80 text-orange-900 font-bold">เฉลี่ย</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {Object.entries(groupedData)
            .sort((a, b) => a[0].localeCompare(b[0], 'th')) 
            .map(([deptName, monthsData]) => {
              const values = months.map(m => monthsData[m]).filter(v => typeof v === 'number');
              const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;

              return (
                <tr key={deptName} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  {/* ตรึงคอลัมน์แรกข้อมูล ให้มี bg-white ทึบแสงและ z-20 เพื่อบล็อกไม่ให้ตัวเลขเดือนวิ่งมาทับ */}
                  <td className="sticky left-0 z-25 bg-white px-6 py-3 font-medium text-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <button 
                      onClick={() => onViewHistory(deptName)}
                      className="text-indigo-600 hover:text-indigo-900 hover:underline font-medium text-left focus:outline-none flex items-center gap-2"
                      title="คลิกเพื่อดูข้อมูลย้อนหลัง"
                    >
                      <span className="text-base">🏢</span> 
                      <span className="truncate max-w-[220px]">{deptName}</span>
                    </button>
                  </td>
                  
                  {months.map(m => {
                    const value = monthsData[m];
                    const isValueValid = typeof value === 'number';
                    return (
                      <td key={m} className="px-2 py-3 text-center">
                        <div className={`inline-block px-2.5 py-1 rounded-md font-semibold text-xs ${isValueValid ? getBgColor(value) : 'text-gray-300'}`}>
                          {isValueValid ? value.toFixed(1) : '-'}
                        </div>
                      </td>
                    );
                  })}

                  <td className="px-4 py-3 text-center bg-orange-50/30">
                     <span className={`font-bold text-sm ${average !== null ? getTextColorOnly(average) : 'text-gray-300'}`}>
                       {average !== null ? average.toFixed(1) : '-'}
                     </span>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
};