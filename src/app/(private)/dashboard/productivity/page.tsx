'use client';
import { ReportStatusLegend } from '@/components/MonthlyReportStatus';
import { useState, useEffect } from 'react';
import { getProductivityData } from '@/lib/kpiService'; 
import { ProductivityTable } from '@/components/ProductivityTable'; // ปรับ path ให้ตรงกับของท่าน
import { productivityDepartmentName } from '@/lib/productivityReport';
import { NP_EXPORT_MONTHS, productivityMonthlyExport } from '@/lib/productivityExport';

export default function ProductivityPage() {
  const [loadError, setLoadError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('2570');
  const [exportMonth, setExportMonth] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const monthExport = productivityMonthlyExport(data, selectedYear, exportMonth);

  const handleExport = async () => {
    if (loading || exporting || loadError || !monthExport.hasData) return;
    setExporting(true);
    setExportError('');
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.aoa_to_sheet(monthExport.rows);
      sheet['!cols'] = [{wch: 12}, {wch: 45}, {wch: 20}, {wch: 32}, {wch: 22}, {wch: 16}, {wch: 70}, {wch: 50}, {wch: 50}];
      sheet['!merges'] = [{s: {r: 0, c: 0}, e: {r: 0, c: 5}}];
      for (let row = 4; row < monthExport.rows.length; row++) {
        const cell = sheet[XLSX.utils.encode_cell({r: row, c: 2})];
        if (cell?.t === 'n') cell.z = '0.0';
      }
      XLSX.utils.book_append_sheet(workbook, sheet, monthExport.sheetName);
      XLSX.writeFile(workbook, monthExport.filename, {compression: true});
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'ส่งออก Excel ไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setExporting(false);
    }
  };
  
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

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      setLoadError('');
      try {
        const results = await getProductivityData(selectedYear);
        if (active) setData(results);
      } catch (error) {
        if (active) {
          setData([]);
          setLoadError(error instanceof Error ? error.message : 'อ่านข้อมูล Productivity ไม่สำเร็จ');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, [selectedYear]);

  // ฟังก์ชันเมื่อกดคลิกที่ชื่อหน่วยงานเพื่อดูประวัติย้อนหลัง
  const handleViewHistory = async (deptName: string) => {
    setHistoryModal({ isOpen: true, deptName, loading: true, data: [] });
    
    setHistoryError('');
    const historyResults = await Promise.all(availableYears.map(async year => {
      try {
        const entries = await getProductivityData(year);
        const values = entries.filter((item: any) => productivityDepartmentName(item.department_name || '', year) === deptName)
          .map((item: any) => item.np_value).filter((value: any) => typeof value === 'number' && Number.isFinite(value));
        return {year, average: values.length ? (values.reduce((sum: number, value: number) => sum + value, 0) / values.length).toFixed(1) : '-'};
      } catch (error) {
        setHistoryError(error instanceof Error ? error.message : 'อ่านข้อมูลย้อนหลังไม่สำเร็จ');
        return {year, average: 'อ่านไม่สำเร็จ'};
      }
    }));
    setHistoryModal(current => current.isOpen && current.deptName === deptName
      ? {...current, loading: false, data: historyResults} : current);
  };

  return (
    <div className="flex flex-col mb-6"> 
      <div className="mb-2 rounded-xl border border-teal-100 bg-white px-3 py-1.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-lg font-bold text-slate-900">Nursing Productivity</h2>
          <ReportStatusLegend statuses={['missing', 'incomplete']}/>
        </div>
        
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label htmlFor="np-fiscal-year" className="text-sm font-bold text-gray-700 whitespace-nowrap pl-1">ปีงบประมาณ</label>
          <select id="np-fiscal-year"
            value={selectedYear} 
            onChange={(e) => { setLoading(true); setExportError(''); setSelectedYear(e.target.value); }}
            className="border px-2 py-1 rounded-lg font-medium text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <label htmlFor="np-export-month" className="text-sm font-medium text-gray-700">เดือน</label>
          <select id="np-export-month" value={exportMonth} disabled={exporting}
            onChange={event => { setExportMonth(Number(event.target.value)); setExportError(''); }}
            className="border border-gray-300 bg-white rounded-lg px-2 py-1 text-sm">
            {NP_EXPORT_MONTHS.map(month => <option key={month.value} value={month.value}>{month.thai}</option>)}
          </select>
          <button type="button" onClick={handleExport}
            disabled={loading || exporting || !!loadError || !monthExport.hasData}
            className="rounded-lg bg-emerald-700 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed">
            {exporting ? 'กำลังส่งออก...' : 'Download'}
          </button>
          {!loading && !loadError && !monthExport.hasData && <span className="text-sm text-gray-500">ไม่มีข้อมูลในเดือนที่เลือก</span>}
        </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-1 mt-1">
          <span className="text-sm text-gray-500 font-medium">เกณฑ์สี:</span>
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-3.5 h-3 rounded-sm ${item.color} border border-gray-300`}></div>
              <span className="text-xs text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      {exportError && <p role="alert" className="text-red-700 mb-3">{exportError}</p>}

      {loading ? (
        <p className="text-gray-500 text-center py-8">กำลังโหลดข้อมูล...</p>
      ) : loadError ? (
        <p role="alert" className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-4">{loadError}</p>
      ) : data.length > 0 ? (
        <ProductivityTable key={selectedYear}
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

            {historyError && <p role="alert" className="text-sm text-red-700 mb-3">{historyError}</p>}
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
