'use client';
import { useState, useEffect } from 'react';
import { getProductivityData } from '@/lib/kpiService'; 
import { ProductivityTable } from '@/components/ProductivityTable'; // ปรับ path ให้ตรงกับของท่าน
import { createClient } from '@/utils/supabase/client';

export default function ProductivityPage() {
  const supabase = createClient();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('2569');
  
  // State สำหรับ Modal ดูข้อมูลย้อนหลัง
  const [historyModal, setHistoryModal] = useState<{ isOpen: boolean, deptName: string, data: any[], loading: boolean }>({
    isOpen: false,
    deptName: '',
    data: [],
    loading: false
  });

  const availableYears = ['2567', '2568', '2569', '2570'];

  const legendItems = [
    { label: "< 90", color: "bg-gray-200" },
    { label: "90-110", color: "bg-green-100" },
    { label: "111-120", color: "bg-yellow-100" },
    { label: "121-130", color: "bg-orange-100" },
    { label: "> 130", color: "bg-red-100" },
  ];

const fetchYear2570Data = async () => {
    try {
      // 1. ดึงข้อมูลรายวันเฉพาะช่วงปีงบประมาณ 2570 (วันที่ 1 ต.ค. 2026 ถึง 30 ก.ย. 2027)
      const staffingRes = await supabase
        .from('daily_staffing')
        .select('department_id, date, np')
        .gte('date', '2026-10-01')
        .lte('date', '2027-09-30');

      if (staffingRes.error) {
        console.error('Staffing Error:', staffingRes.error);
        return [];
      }

      const staffingData = staffingRes.data || [];
      if (staffingData.length === 0) return [];

      // 2. ดึงรายชื่อหน่วยงานจากตาราง departments
      const deptRes = await supabase.from('departments').select('*');
      const departments = deptRes.data || [];

      const deptNameMap: { [id: string]: string } = {};
      departments.forEach((dept: any) => {
        const id = String(dept.id);
        const name = dept.Department || dept.name || `หน่วยงาน ${id}`;
        deptNameMap[id] = name;
      });

      // หากตาราง departments ว่าง ให้ดึงชื่อจากฐานข้อมูลปีอื่นสำรอง
      if (Object.keys(deptNameMap).length === 0) {
        const baseRes = await getProductivityData('2569');
        if (baseRes && baseRes.length > 0) {
          baseRes.forEach((item: any) => {
            if (item.department_id && item.department_name) {
              deptNameMap[String(item.department_id)] = item.department_name;
            }
          });
        }
      }

      // 3. กำหนดเดือนและปี ค.ศ. ให้ตรงตามปีงบประมาณ 2570 เป๊ะๆ
      const fiscalMonths = [
        { monthNum: 10, m: '10', y: '2026' },
        { monthNum: 11, m: '11', y: '2026' },
        { monthNum: 12, m: '12', y: '2026' },
        { monthNum: 1, m: '01', y: '2027' },
        { monthNum: 2, m: '02', y: '2027' },
        { monthNum: 3, m: '03', y: '2027' },
        { monthNum: 4, m: '04', y: '2027' },
        { monthNum: 5, m: '05', y: '2027' },
        { monthNum: 6, m: '06', y: '2027' },
        { monthNum: 7, m: '07', y: '2027' },
        { monthNum: 8, m: '08', y: '2027' },
        { monthNum: 9, m: '09', y: '2027' },
      ];

      const activeDeptIds = Array.from(new Set(staffingData.map((r: any) => String(r.department_id))));
      const flattenedEntries: any[] = [];

      activeDeptIds.forEach((deptId: any) => {
        const deptName = deptNameMap[deptId] || `หน่วยงาน ID: ${deptId}`;

        fiscalMonths.forEach(({ monthNum, m, y }) => {
          // กรองข้อมูลเฉพาะเดือนและปี ค.ศ. นั้นๆ จริงๆ (ป้องกันข้อมูลปีอื่นปะปน)
          const monthRecords = staffingData.filter((row: any) => {
            if (String(row.department_id) !== String(deptId)) return false;
            return row.date && row.date.startsWith(`${y}-${m}`);
          });

          if (monthRecords.length === 0) return;

          // จัดกลุ่มตามวันที่เพื่อหาค่าเฉลี่ย NP ของแต่ละวันก่อน
          const dailyGroups: { [date: string]: { sum: number, count: number } } = {};
          monthRecords.forEach((r: any) => {
            const d = r.date;
            if (!dailyGroups[d]) dailyGroups[d] = { sum: 0, count: 0 };
            dailyGroups[d].sum += Number(r.np || 0);
            dailyGroups[d].count += 1;
          });

          // นำค่าเฉลี่ยของแต่ละวันมารวมกัน แล้วหารด้วยจำนวนวันทั้งหมดในเดือนนั้น (ตรงกับหน้าสถิติหอผู้ป่วย)
          let sumOfDailyAverages = 0;
          let daysCount = 0;
          
          Object.keys(dailyGroups).forEach(d => {
            const grp = dailyGroups[d];
            if (grp.count > 0) {
              const dayAvg = grp.sum / grp.count;
              sumOfDailyAverages += dayAvg;
              daysCount++;
            }
          });

          if (daysCount > 0) {
            const monthlyAvg = sumOfDailyAverages / daysCount;
            flattenedEntries.push({
              department_id: deptId,
              department_name: deptName,
              month: monthNum,
              np_value: Number(monthlyAvg.toFixed(2))
            });
          }
        });
      });

      return flattenedEntries;
    } catch (error) {
      console.error('Error fetching 2570 staffing data:', error);
      return [];
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        if (selectedYear === '2570') {
          const results = await fetchYear2570Data();
          setData(results);
        } else {
          const results = await getProductivityData(selectedYear);
          setData(results || []);
        }
      } catch (error) {
        console.error('Error loading productivity data:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedYear]);

  // ฟังก์ชันเมื่อกดคลิกที่ชื่อหน่วยงานเพื่อดูประวัติย้อนหลัง
  const handleViewHistory = async (deptName: string) => {
    setHistoryModal({ isOpen: true, deptName, loading: true, data: [] });
    
    const historyResults = [];
    
    for (const y of availableYears) {
      let deptAverage = '-';

      if (y === '2570') {
        const year2570Data = await fetchYear2570Data();
        const found = year2570Data.find((item: any) => item.department_name === deptName);
        if (found) deptAverage = found.average;
      } else {
        const res = await getProductivityData(y);
        if (res && res.length > 0) {
          const getMappedName = (original: string, year: string) => {
            if ((year === '2567' || year === '2568') && original === 'อายุรกรรม 4') return 'อายุรกรรมชาย 1';
            return original;
          };

          const deptData = res.filter((item: any) => getMappedName(item.department_name || '', y) === deptName);
          
          let sum = 0;
          let count = 0;
          deptData.forEach((entry: any) => {
            if (typeof entry.np_value === 'number') {
              sum += entry.np_value;
              count++;
            }
          });
          
          if (count > 0) {
            deptAverage = (sum / count).toFixed(1);
          }
        }
      }

      historyResults.push({
        year: y,
        average: deptAverage
      });
    }

    setHistoryModal({ isOpen: true, deptName, loading: false, data: historyResults });
  };

  return (
    <div className="flex flex-col mb-6"> 
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Nursing Productivity</h2>
        
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm text-gray-500 font-medium">เกณฑ์สี:</span>
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-7 h-4 rounded-sm ${item.color} border border-gray-300`}></div>
              <span className="text-xs text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
          <label className="text-sm font-bold text-gray-700 whitespace-nowrap pl-1">📅 ปีงบประมาณ:</label>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            className="border p-2 rounded-lg font-medium text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>ปีงบประมาณ {year}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-8">กำลังโหลดข้อมูล...</p>
      ) : data.length > 0 ? (
        <ProductivityTable 
          data={data} 
          selectedYear={selectedYear} 
          onViewHistory={handleViewHistory} 
        />
      ) : (
        <p className="text-gray-500 text-center py-8">ไม่พบข้อมูลในปีงบประมาณ {selectedYear}</p>
      )}

      {/* Modal ดูข้อมูลย้อนหลัง */}
      {historyModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                ย้อนหลัง: <span className="text-indigo-600">{historyModal.deptName}</span>
              </h3>
              <button 
                onClick={() => setHistoryModal({ ...historyModal, isOpen: false })}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold px-2"
              >
                &times;
              </button>
            </div>

            {historyModal.loading ? (
              <div className="py-8 text-center text-gray-500 text-sm">กำลังดึงข้อมูลย้อนหลัง...</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 text-sm text-center">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left">ปีงบประมาณ</th>
                    <th className="px-3 py-2 bg-indigo-50 text-indigo-900">ค่าเฉลี่ย Productivity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historyModal.data.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-left font-medium text-gray-800">ปี {item.year}</td>
                      <td className="px-3 py-3 font-bold text-gray-700 bg-indigo-50/30">
                        {item.average}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="mt-6 text-right">
              <button
                onClick={() => setHistoryModal({ ...historyModal, isOpen: false })}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}