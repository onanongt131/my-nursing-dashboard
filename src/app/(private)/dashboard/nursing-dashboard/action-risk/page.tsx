'use client';

import React, { useState } from 'react';

export default function ActionRiskDashboardPage() {
  // State สำหรับเก็บรายการที่เลือกมาดูรายละเอียด (Drill-down modal / detail view)
  const [selectedIssue, setSelectedIssue] = useState<any>(null);

  // ข้อมูลจำลองรายการ Action & Risk (เชื่อมโยงตามข้อเสนอแนะและ Gap ของระบบพยาบาล)
  const actionItems = [
    {
      id: 1,
      priority: 'red',
      issue: 'Skill Mix (สัดส่วนบุคลากรวิชาชีพ)',
      kpi: '72%',
      result: 72,
      target: 90,
      owner: 'กลุ่มงาน A (อายุรกรรม)',
      due: '30 ก.ย. 2026',
      action: 'In progress',
      problem: 'สัดส่วนพยาบาลวิชาชีพในเวรดึกต่ำกว่าเกณฑ์มาตรฐาน',
      gap: 'ห่างจากเป้าหมายร้อยละ 18',
      cause: 'การลาออกและการจัดเวรที่ไม่สมดุลตามภาระงานจริง',
      correctiveAction: 'ปรับเกลี่ยอัตรากำลังระหว่างหน่วยงานและทบทวนระบบ GPX',
      followUp: 'ติดตามทุก 2 สัปดาห์โดยกรรมการบริหาร',
      effectiveness: 'อยู่ระหว่างประเมินผลลัพธ์รอบเดือนถัดไป'
    },
    {
      id: 2,
      priority: 'red',
      issue: 'Medication Error (ความคลาดเคลื่อนทางยา)',
      kpi: 'อุบัติการณ์เพิ่มขึ้น',
      result: '—',
      target: 'ลดลง',
      owner: 'กลุ่มงาน B (ศัลยกรรม)',
      due: '15 ก.ย. 2026',
      action: 'RCA',
      problem: 'พบความคลาดเคลื่อนในการบริหารยา High-Alert Drug ซ้ำในหอผู้ป่วย',
      gap: 'เกินค่าเป้าหมายความปลอดภัย',
      cause: 'กระบวนการตรวจสอบก่อนให้ยา (Double check) ไม่สมบูรณ์ในภาวะเร่งด่วน',
      correctiveAction: 'จัดทำ Standardized Checklist และทบทวน RCA ร่วมกับทีมเภสัชกรรม',
      followUp: 'ตรวจเยี่ยมหน้างานและประเมินซ้ำ',
      effectiveness: 'รอสรุปผลการทำ RCA'
    },
    {
      id: 3,
      priority: 'yellow',
      issue: 'NEWS/EWS (การประเมินสัญญาณชีพผู้ป่วยทรุดลง)',
      kpi: '91%',
      result: 91,
      target: 95,
      owner: 'กลุ่มงาน C (กุมารเวช)',
      due: '30 ก.ย. 2026',
      action: 'Coaching',
      problem: 'การบันทึกคะแนน EWS และการแจ้งแพทย์ล่าช้าในบางเวร',
      gap: 'ต่ำกว่าเป้าหมายร้อยละ 4',
      cause: 'พยาบาลน้องใหม่ยังขาดความมั่นใจในการใช้เกณฑ์ Escalation',
      correctiveAction: 'จัดระบบ Preceptor คอยโค้ชหน้างานและอบรมฟื้นฟู',
      followUp: 'สุ่มตรวจเวรปฏิบัติงานรายสัปดาห์',
      effectiveness: 'แนวโน้มการบันทึกดีขึ้น'
    },
    {
      id: 4,
      priority: 'green',
      issue: 'CNPG (Clinical Nursing Practice Guideline)',
      kpi: '94%',
      result: 94,
      target: 90,
      owner: '-',
      due: '-',
      action: 'Maintain',
      problem: 'การปฏิบัติตามแนวปฏิบัติการพยาบาลผู้ป่วยโรคเรื้อรัง',
      gap: 'บรรลุเป้าหมาย',
      cause: '—',
      correctiveAction: 'คงมาตรฐานการนิเทศและแลกเปลี่ยนเรียนรู้ Best Practice',
      followUp: 'ติดตามต่อเนื่องรายไตรมาส',
      effectiveness: 'ผ่านเกณฑ์และรักษามาตรฐานได้ดีเยี่ยม'
    }
  ];

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'red': return <span className="w-3.5 h-3.5 rounded-full bg-rose-500 inline-block shadow-sm" title="ความเร่งด่วนสูง (High Priority)"></span>;
      case 'yellow': return <span className="w-3.5 h-3.5 rounded-full bg-amber-400 inline-block shadow-sm" title="ต้องเฝ้าระวัง (Moderate)"></span>;
      case 'green': return <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block shadow-sm" title="ปกติ / บำรุงรักษา (Low Risk)"></span>;
      default: return null;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'In progress': return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold">In progress</span>;
      case 'RCA': return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg text-xs font-bold">RCA</span>;
      case 'Coaching': return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold">Coaching</span>;
      case 'Maintain': return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">Maintain</span>;
      default: return <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">{action}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12 px-2 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-2">
        <div className="pt-0">
          <h2 className="text-2xl font-extrabold text-gray-900 mt-2">ติดตามประเด็นข้อเสนอแนะและกำหนดเวลาแก้ไข</h2>
        </div>

        {/* ส่วนตารางหลัก Action & Risk Dashboard */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-800">รายการข้อเสนอแนะและแผนการดำเนินงาน (Action Plan Tracking)</h3>
              <p className="text-xs text-blue-800">คลิกที่แถวรายการเพื่อดูรายละเอียดวงจรการพัฒนาตั้งแต่ Problem จนถึง Effectiveness</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> สูง</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> ปานกลาง</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> ปกติ</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase">
                  <th className="pb-3 text-center w-16">Priority</th>
                  <th className="pb-3">ประเด็น / ความเสี่ยง</th>
                  <th className="pb-3 text-center">KPI</th>
                  <th className="pb-3 text-center">Result</th>
                  <th className="pb-3 text-center">Target</th>
                  <th className="pb-3">Owner (ผู้รับผิดชอบ)</th>
                  <th className="pb-3">Due Date</th>
                  <th className="pb-3 text-center">Action Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {actionItems.map((item) => (
                  <tr 
                    key={item.id} 
                    onClick={() => setSelectedIssue(item)}
                    className="hover:bg-emerald-50/40 cursor-pointer transition-colors"
                    title="คลิกเพื่อดูรายละเอียด Problem -> Gap -> Cause -> Corrective Action"
                  >
                    <td className="py-4 text-center">{getPriorityDot(item.priority)}</td>
                    <td className="py-4 font-bold text-gray-800">{item.issue}</td>
                    <td className="py-4 text-center font-semibold text-gray-600">{item.kpi}</td>
                    <td className="py-4 text-center font-semibold text-gray-800">{item.result}</td>
                    <td className="py-4 text-center text-emerald-700 font-bold">{item.target}</td>
                    <td className="py-4 text-gray-700 font-medium">{item.owner}</td>
                    <td className="py-4 text-gray-600 font-medium">{item.due}</td>
                    <td className="py-4 text-center">{getActionBadge(item.action)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal / ส่วนแสดงรายละเอียดเชิงลึก (Drill-down) เมื่อคลิกเลือกรายการ */}
        {selectedIssue && (
          <div className="bg-gradient-to-br from-emerald-900 to-gray-900 text-white rounded-2xl p-6 shadow-xl border border-emerald-700 space-y-4 relative animate-fadeIn">
            <div className="flex items-center justify-between border-b border-emerald-800 pb-3">
              <div>
                <span className="text-xs font-bold px-2.5 py-1 bg-emerald-800 text-emerald-200 rounded-full">
                  Detailed Learning & Action Pipeline (SAR Evidence)
                </span>
                <h3 className="text-lg font-extrabold mt-2 text-white">{selectedIssue.issue}</h3>
              </div>
              <button 
                onClick={() => setSelectedIssue(null)}
                className="text-gray-400 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              >
                ปิดหน้าต่าง ✕
              </button>
            </div>

            {/* Workflow Pipeline ตามโครงสร้าง Problem -> Gap -> Cause -> Action */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">1. Problem (ปัญหา)</span>
                <p className="text-xs text-gray-200 mt-1.5 font-medium">{selectedIssue.problem}</p>
              </div>
              <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">2. Gap (ส่วนต่าง)</span>
                <p className="text-xs text-gray-200 mt-1.5 font-medium">{selectedIssue.gap}</p>
              </div>
              <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
                <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">3. Root Cause (สาเหตุ)</span>
                <p className="text-xs text-gray-200 mt-1.5 font-medium">{selectedIssue.cause}</p>
              </div>
              <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">4. Corrective Action (แนวทางแก้ไข)</span>
                <p className="text-xs text-gray-200 mt-1.5 font-medium">{selectedIssue.correctiveAction}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-emerald-800/60 text-xs">
              <div>
                <span className="text-gray-400">ผู้รับผิดชอบ (Owner):</span> <strong className="text-white">{selectedIssue.owner}</strong>
              </div>
              <div>
                <span className="text-gray-400">กำหนดแล้วเสร็จ (Due Date):</span> <strong className="text-amber-300">{selectedIssue.due}</strong>
              </div>
              <div>
                <span className="text-gray-400">ผลลัพธ์เชิงประจักษ์ (Effectiveness):</span> <strong className="text-emerald-300">{selectedIssue.effectiveness}</strong>
              </div>
            </div>
          </div>
        )}

      </div>
      </div>
  );
}