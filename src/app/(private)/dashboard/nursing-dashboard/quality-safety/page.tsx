'use client';

import React, { useState } from 'react';

export default function QualitySafetyDashboardPage() {
  // State สำหรับเลือก KPI เพื่อดู Trend 12 เดือน
  const [selectedTrendKpi, setSelectedTrendKpi] = useState('Fall');

  // ข้อมูลจำลอง Trend 12 เดือน (สามารถเชื่อมต่อฐานข้อมูลรายเดือนจริงภายหลังได้)
  const trendData: Record<string, { months: string[]; values: number[]; target: number }> = {
    Fall: {
      months: ['ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.'],
      values: [0.45, 0.52, 0.38, 0.40, 0.35, 0.42, 0.31, 0.30, 0.38, 0.33, 0.29, 0.31],
      target: 0.50
    },
    'Pressure Injury': {
      months: ['ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.'],
      values: [0.20, 0.18, 0.25, 0.15, 0.12, 0.19, 0.14, 0.12, 0.15, 0.10, 0.11, 0.12],
      target: 0.20
    },
    'Medication Error': {
      months: ['ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.'],
      values: [0.18, 0.22, 0.15, 0.12, 0.14, 0.10, 0.16, 0.15, 0.13, 0.11, 0.09, 0.10],
      target: 0.10
    },
    'Unplanned CPR': {
      months: ['ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.'],
      values: [2.1, 1.8, 2.5, 3.0, 2.2, 1.9, 2.4, 2.0, 1.7, 2.1, 1.8, 1.9],
      target: 2.0
    }
  };

  // ข้อมูล Unit Heatmap
  const heatmapData = [
    { ward: 'Ward A (อายุรกรรม)', fall: 'green', pi: 'green', medError: 'red', ews: 'yellow', cnpG: 'green' },
    { ward: 'Ward B (ศัลยกรรม)', fall: 'yellow', pi: 'green', medError: 'green', ews: 'green', cnpG: 'yellow' },
    { ward: 'ICU (หอผู้ป่วยหนัก)', fall: 'green', pi: 'yellow', medError: 'green', ews: 'green', cnpG: 'green' },
    { ward: 'LR / Post-Partum', fall: 'green', pi: 'green', medError: 'green', ews: 'yellow', cnpG: 'green' },
    { ward: 'ER (อุบัติเหตุฉุกเฉิน)', fall: 'yellow', pi: 'green', medError: 'red', ews: 'green', cnpG: 'green' }
  ];

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'green': return <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block shadow-sm" title="ผ่านเกณฑ์ / ปกติ"></span>;
      case 'yellow': return <span className="w-3.5 h-3.5 rounded-full bg-amber-400 inline-block shadow-sm" title="ต้องเฝ้าระวัง"></span>;
      case 'red': return <span className="w-3.5 h-3.5 rounded-full bg-rose-500 inline-block shadow-sm" title="เกินเกณฑ์ / ความเสี่ยงสูง"></span>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* หัวข้อหน้า Dashboard */}
        <div className="pt-6">
          <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
            Nursing Safety Command Center
          </span>
          <h2 className="text-2xl font-extrabold text-gray-900 mt-2">วิเคราะห์จุดเสี่ยงและอุบัติการณ์ความปลอดภัย</h2>
          <p className="text-sm text-gray-600 mt-1">ติดตามอุบัติการณ์สำคัญ ความคลาดเคลื่อนทางยา และจุดเสี่ยงในกระบวนการพยาบาลแบบเรียลไทม์</p>
        </div>

        {/* ส่วนที่ 1: Safety Cards ด้านบน */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { name: 'Fall', status: 'green', value: '0.31 ครั้ง/พันวันนอน' },
            { name: 'Pressure Injury', status: 'yellow', value: '0.12%' },
            { name: 'Medication Error', status: 'red', value: '0.15%' },
            { name: 'IV Care', status: 'green', value: '98.2%' },
            { name: 'Unplanned CPR', status: 'red', value: '2.1 ครั้ง/พัน' },
            { name: 'Aspiration', status: 'green', value: '0%' }
          ].map((card, idx) => (
            <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">{card.name}</span>
                {getStatusDot(card.status)}
              </div>
              <p className="text-xs font-semibold text-gray-500 mt-3">{card.value}</p>
            </div>
          ))}
        </div>

        {/* ส่วนที่ 2: Trend 12 เดือน (เลือก KPI แล้วกราฟเปลี่ยนตาม) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-800">แนวโน้มอุบัติการณ์ 12 เดือนย้อนหลัง (12-Month Trend)</h3>
              <p className="text-xs text-gray-500">เลือกตัวชี้วัดเพื่อวิเคราะห์ทิศทางความเสี่ยงเปรียบเทียบกับค่าเป้าหมาย</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.keys(trendData).map((kpiKey) => (
                <button
                  key={kpiKey}
                  onClick={() => setSelectedTrendKpi(kpiKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedTrendKpi === kpiKey
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {kpiKey}
                </button>
              ))}
            </div>
          </div>

          {/* จำลองการแสดงผลกราฟแนวโน้มแบบสี่เหลี่ยมมินิมอลรายเดือน */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex justify-between items-center mb-4 text-xs font-medium text-gray-500">
              <span>ตัวชี้วัด: <strong className="text-gray-800">{selectedTrendKpi}</strong></span>
              <span>ค่าเป้าหมาย (Target): <strong className="text-emerald-700">{trendData[selectedTrendKpi].target}</strong></span>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 text-center">
              {trendData[selectedTrendKpi].months.map((m, idx) => {
                const val = trendData[selectedTrendKpi].values[idx];
                const target = trendData[selectedTrendKpi].target;
                const isExceed = val > target;
                return (
                  <div key={idx} className="bg-white p-2 rounded-lg border border-gray-100 shadow-2xs flex flex-col items-center justify-between h-28">
                    <span className="text-[10px] text-gray-400">{m}</span>
                    <div className="w-full bg-gray-100 h-16 rounded flex items-end justify-center overflow-hidden relative">
                      <div 
                        className={`w-full rounded-t transition-all duration-300 ${isExceed ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                        style={{ height: `${Math.min((val / (target * 1.5)) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className={`text-[11px] font-bold ${isExceed ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ส่วนที่ 3: Unit Heatmap & Top Risks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Unit Heatmap (กินพื้นที่ 2 คอลัมน์) */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-base font-bold text-gray-800 mb-1">Unit Heatmap (ตรวจจับความเสี่ยงรายหน่วยงาน)</h3>
            <p className="text-xs text-gray-500 mb-4">ผู้บริหารสามารถมองเห็นทันทีว่าหน่วยงานใดมีหลายปัญหาเกิดขึ้นพร้อมกัน</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase">
                    <th className="pb-3">หน่วยงาน</th>
                    <th className="pb-3 text-center">Fall</th>
                    <th className="pb-3 text-center">PI</th>
                    <th className="pb-3 text-center">Med Error</th>
                    <th className="pb-3 text-center">NEWS/EWS</th>
                    <th className="pb-3 text-center">CNPG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {heatmapData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-3 font-medium text-gray-700">{row.ward}</td>
                      <td className="py-3 text-center">{getStatusDot(row.fall)}</td>
                      <td className="py-3 text-center">{getStatusDot(row.pi)}</td>
                      <td className="py-3 text-center">{getStatusDot(row.medError)}</td>
                      <td className="py-3 text-center">{getStatusDot(row.ews)}</td>
                      <td className="py-3 text-center">{getStatusDot(row.cnpG)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Risks / Management Attention (กินพื้นที่ 1 คอลัมน์) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-800">Top Risks / Attention</h3>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-[10px] font-bold">High Priority</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">ประเด็นเร่งด่วนที่ต้องติดตามการแก้ไขอย่างใกล้ชิด</p>

              <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-rose-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block animate-pulse"></span>
                  Unplanned CPR เพิ่มขึ้นในหอผู้ป่วยวิกฤต
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-gray-600 pt-1">
                  <span>หน่วยงาน: <strong className="text-gray-800">ICU / Ward A</strong></span>
                  <span>RCA: <strong className="text-emerald-700">Completed</strong></span>
                  <span>Corrective Action: <strong className="text-gray-800">3 กิจกรรม</strong></span>
                  <span>Owner: <strong className="text-gray-800">หัวหน้าตึก</strong></span>
                  <span>Due Date: <strong className="text-gray-800">30/09/2026</strong></span>
                  <span className="flex items-center gap-1">Status: <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> <strong className="text-amber-700">In progress</strong></span>
                </div>
              </div>
            </div>

            <button className="w-full mt-4 bg-gray-900 hover:bg-gray-800 text-white py-2 rounded-xl text-xs font-medium transition-all shadow-sm">
              ดูรายงานอุบัติการณ์ฉบับเต็มทั้งหมด
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}