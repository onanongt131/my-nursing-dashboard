// src/components/KpiTable.tsx
import { calculateEntryValue, checkKpiStatus } from "@/utils/kpiCalculations";

interface KpiTableProps {
  kpiList: any[]; // รายการ KPI ทั้งหมด
}

export const KpiTable = ({ kpiList }: KpiTableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-4 text-gray-600 font-bold">ตัวชี้วัด (KPI)</th>
                  <th className="p-4 text-center text-gray-600 font-bold">Goal</th>
                  {[2565, 2566, 2567, 2568, 2569].map(y => <th key={y} className="p-4 text-center text-gray-600 font-bold">{y}</th>)}
                  <th className="p-4 text-center text-gray-600">Trend</th>
                  <th className="p-4 text-center text-gray-600 font-bold">Add</th>
                </tr>
              </thead>
              <tbody>
          {kpiList.map((kpi) => {
            const latestEntry = kpi.kpi_entries?.[0]; // ดึงข้อมูลล่าสุด
            const isPass = checkKpiStatus(latestEntry, kpi.target_value, kpi.Type);
            const displayValue = calculateEntryValue(latestEntry, kpi.Type);

            return (
              <tr key={kpi.id} className="border-b">
                <td className="p-3">{kpi.name}</td>
                <td className="p-3 text-center font-bold">
                  <span className={isPass ? "text-green-600" : "text-red-600"}>
                    {displayValue} {kpi.Type === 'percent' ? '%' : ''}
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