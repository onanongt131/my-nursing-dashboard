import React, { useState } from 'react';
import type { NpCompleteness } from '@/lib/productivityReport';
import { ReportStatusIcon, ReportValue, MonthlyTableViewport } from '@/components/MonthlyReportStatus';
import ReportMonthHeading from '@/components/ReportMonthHeading';
import { productivityDepartmentName } from '@/lib/productivityReport';
import { ProductivityEntry } from '@/lib/kpiService';

interface ProductivityTableProps {
  data: ProductivityEntry[];
  selectedYear: string;
  onViewHistory: (deptName: string) => void;
}

export const ProductivityTable: React.FC<ProductivityTableProps> = ({ data, selectedYear, onViewHistory }) => {
  const [qualityDetail, setQualityDetail] = useState<{name: string; month: string; quality: NpCompleteness} | null>(null);
  const quality = new Map(data.map(entry => [`${productivityDepartmentName(entry.department_name || 'ไม่ระบุหน่วยงาน', selectedYear)}:${entry.month}`, entry.completeness]));
  const groupedData = data.reduce((acc, entry) => {
    const rawDeptName = entry.department_name || 'ไม่ระบุหน่วยงาน';
    const deptName = productivityDepartmentName(rawDeptName, selectedYear);

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
    <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <MonthlyTableViewport label="ตาราง Nursing Productivity">
      <table className="w-full table-fixed border-collapse text-left text-xs">
        <thead>
          <tr className="text-gray-500 uppercase text-xs bg-gray-50/80">
            {/* ตรึงคอลัมน์แรก Header ให้ทึบแสงและอยู่ชั้นบนสุด (z-30) */}
            <th className="sticky left-0 z-30 bg-gray-50 px-3 py-2 w-[17%] font-semibold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
              หน่วยงาน
            </th>
            {monthLabels.map(m => (
              <ReportMonthHeading key={m} month={m} className="!px-0.5" />
            ))}
            <th className="px-2 py-2 text-center w-[6%] bg-orange-50/80 text-orange-900 font-bold">เฉลี่ย</th>
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
                  <td className="sticky left-0 z-20 bg-white px-3 py-1 font-medium text-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <button 
                      onClick={() => onViewHistory(deptName)}
                      className="text-indigo-600 hover:text-indigo-900 hover:underline font-medium text-left focus:outline-none flex w-full min-w-0 items-center gap-1"
                      title={deptName + " · คลิกเพื่อดูข้อมูลย้อนหลัง"}
                    >
                      <span className="text-base">🏢</span> 
                      <span className="min-w-0 truncate">{deptName}</span>
                    </button>
                  </td>
                  
                  {months.map(m => {
                    const value = monthsData[m];
                    const isValueValid = typeof value === 'number';
                    const status = quality.get(`${deptName}:${m}`);
                    const incomplete = status && status.valid < status.expected;
                    return (
                      <td key={m} className="px-0.5 py-1 text-right">
                        {isValueValid ? (
                          <ReportValue align="compact" warning={incomplete && (
                            <button type="button" aria-label={'ดูรายละเอียดข้อมูลไม่ครบ ' + deptName + ' ' + monthLabels[months.indexOf(m)]}
                              onClick={() => setQualityDetail({name:deptName,month:monthLabels[months.indexOf(m)],quality:status})}
                              className="rounded-full focus-visible:outline focus-visible:outline-amber-600">
                              <ReportStatusIcon status="incomplete"/>
                            </button>
                          )}>
                            <span className={'rounded-md px-0.5 py-0.5 font-semibold tabular-nums ' + getBgColor(value)}>
                              {value.toFixed(1)}
                            </span>
                          </ReportValue>
                        ) : incomplete ? (
                          <button type="button" aria-label="ดูรายละเอียดข้อมูลไม่ครบ"
                            onClick={() => setQualityDetail({name:deptName,month:monthLabels[months.indexOf(m)],quality:status})}>
                            <ReportStatusIcon status="incomplete"/>
                          </button>
                        ) : <ReportStatusIcon status="missing"/>}
                      </td>
                    );
                  })}

                  <td className="px-0.5 py-1 text-right bg-orange-50/30">
                     <span className={`font-bold text-sm ${average !== null ? getTextColorOnly(average) : 'text-gray-300'}`}>
                       {average !== null ? average.toFixed(1) : <ReportStatusIcon status="missing"/>}
                     </span>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
      </MonthlyTableViewport>
      {qualityDetail && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="np-quality-title">
        <div className="bg-white rounded-xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto">
          <div className="flex justify-between gap-3 mb-3"><h3 id="np-quality-title" className="font-bold">{qualityDetail.name} — {qualityDetail.month} ปีงบประมาณ {selectedYear}</h3>
            <button type="button" onClick={() => setQualityDetail(null)} aria-label="ปิดรายละเอียด">✕</button></div>
          <p className="text-sm mb-3">ข้อมูลใช้ได้ {qualityDetail.quality.valid}/{qualityDetail.quality.expected} เวร ตรวจถึง {qualityDetail.quality.through} (ไม่รวมวันนี้)</p>
          {([['missing','เวรที่ขาด'],['invalid','ค่า NP ว่างหรือไม่ถูกต้อง'],['duplicate','ข้อมูลวัน/เวรซ้ำ']] as const).map(([key,label]) => <div key={key} className="mb-3">
            <h4 className="font-semibold text-sm">{label}: {qualityDetail.quality[key].length} เวร</h4>
            <p className="text-sm whitespace-pre-line mt-1">{qualityDetail.quality[key].join('\n') || 'ไม่มี'}</p>
          </div>)}
          <p className="text-sm text-gray-500">ให้หน่วยงานตรวจและส่งสถิติรายวันของวันที่/เวรข้างต้นอีกครั้ง แล้วโหลดรายงานใหม่</p>
        </div>
      </div>}
    </div>
  );
};
