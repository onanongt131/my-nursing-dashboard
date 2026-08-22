'use client';
import { useState, useEffect } from 'react';
import { getProductivityData } from '@/lib/kpiService'; 
import { ProductivityTable } from '@/components/ProductivityTable'; // ปรับ path ให้ตรงกับของท่าน

export default function ProductivityPage() {
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

  const availableYears = ['2567', '2568', '2569'];

  const legendItems = [
    { label: "< 90", color: "bg-gray-200" },
    { label: "90-110", color: "bg-green-100" },
    { label: "111-120", color: "bg-yellow-100" },
    { label: "121-130", color: "bg-orange-100" },
    { label: "> 130", color: "bg-red-100" },
  ];

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const results = await getProductivityData(selectedYear);
      setData(results || []);
      setLoading(false);
    }
    loadData();
  }, [selectedYear]);
  
  // ฟังก์ชันเมื่อกดคลิกที่ชื่อหน่วยงาน
  const handleViewHistory = async (deptName: string) => {
    setHistoryModal({ isOpen: true, deptName, loading: true, data: [] });
    
    const historyResults = [];
    
    // วนลูปดึงข้อมูลย้อนหลังของปี 2567-2569
    for (const y of availableYears) {
      const res = await getProductivityData(y);
      if (res && res.length > 0) {
        // ฟังก์ชันช่วยจำลองการ Map ชื่อย้อนหลัง
        const getMappedName = (original: string, year: string) => {
          if ((year === '2567' || year === '2568') && original === 'อายุรกรรม 4') return 'อายุรกรรมชาย 1';
          return original;
        };

        const deptData = res.filter(item => getMappedName(item.department_name || '', y) === deptName);
        
        let sum = 0;
        let count = 0;
        deptData.forEach(entry => {
          if (typeof entry.np_value === 'number') {
            sum += entry.np_value;
            count++;
          }
        });
        
        historyResults.push({
          year: y,
          average: count > 0 ? (sum / count).toFixed(1) : '-'
        });
      } else {
        historyResults.push({ year: y, average: '-' });
      }
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

    {/* Modal ดูข้อมูลย้อนหลัง 3 ปี */}
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