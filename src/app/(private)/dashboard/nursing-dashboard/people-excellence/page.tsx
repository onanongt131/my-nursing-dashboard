'use client';

import React, { useState } from 'react';

export default function PeopleExcellenceDashboardPage() {
  const [activeTab, setActiveTab] = useState<'competency' | 'development' | 'outcome'>('competency');

  // ข้อมูล Competency รายด้าน
  const competencySummary = [
    { category: 'Core Competency', score: '88.5%', target: '≥ 85.0%', status: 'emerald', desc: 'สมรรถนะหลักของบุคลากรในองค์กร' },
    { category: 'Managerial Competency', score: '82.0%', target: '≥ 80.0%', status: 'emerald', desc: 'สมรรถนะทางการบริหารจัดการและภาวะผู้นำ' },
    { category: 'Specific Competency', score: '76.5%', target: '≥ 80.0%', status: 'amber', desc: 'สมรรถนะเฉพาะทางวิชาชีพการพยาบาล (ICU, ER, OR)' }
  ];

  // ข้อมูลกิจกรรมการพัฒนา (Development)
  const developmentMetrics = [
    { title: 'Competency Gap', value: '12.4%', sub: 'ส่วนต่างที่ต้องเร่งพัฒนา', color: 'text-amber-600' },
    { title: 'IDP Completed', value: '88.2%', sub: 'บรรลุตามแผนพัฒนาบุคลากรรายบุคคล', color: 'text-emerald-700' },
    { title: 'Training Hours', value: '38.4 ชม.', sub: 'เฉลี่ยต่อคน/ปี', color: 'text-blue-700' },
    { title: 'Preceptor / Coaching', value: '142 คน', sub: 'พี่เลี้ยงและโค้ชในระบบ', color: 'text-indigo-700' },
    { title: 'Nursing Supervision', value: '95.0%', sub: 'การนิเทศทางการพยาบาลตามรอบ', color: 'text-emerald-700' }
  ];

  // ข้อมูล People Outcome
  const outcomeMetrics = [
    { title: 'Engagement Score', value: '84.6%', sub: 'ความผูกพันต่อองค์กร', color: 'text-emerald-700' },
    { title: 'Job Satisfaction', value: '81.2%', sub: 'ความพึงพอใจในการปฏิบัติงาน', color: 'text-emerald-700' },
    { title: 'Retention Rate', value: '91.5%', sub: 'อัตราการคงอยู่ของบุคลากร', color: 'text-blue-700' },
    { title: 'Turnover Rate', value: '8.5%', sub: 'อัตราการลาออก (ควบคุม < 10%)', color: 'text-amber-600' },
    { title: 'Well-being Index', value: '78.0%', sub: 'ดัชนีสุขภาวะและความสุข', color: 'text-indigo-700' }
  ];

  // ข้อมูล Competency Heatmap รายหน่วยงาน
  const heatmapData = [
    { ward: 'Ward A (อายุรกรรม)', core: 'green', managerial: 'green', specific: 'green', gap: 'Low' },
    { ward: 'Ward B (ศัลยกรรม)', core: 'green', managerial: 'yellow', specific: 'red', gap: 'High Gap' },
    { ward: 'ICU (หอผู้ป่วยหนัก)', core: 'green', managerial: 'green', specific: 'yellow', gap: 'Moderate' },
    { ward: 'ER (อุบัติเหตุฉุกเฉิน)', core: 'green', managerial: 'green', specific: 'green', gap: 'Low' },
    { ward: 'LR / Post-Partum', core: 'yellow', managerial: 'yellow', specific: 'red', gap: 'High Gap' }
  ];

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'green': return <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block shadow-sm" title="ผ่านเกณฑ์ดี"></span>;
      case 'yellow': return <span className="w-3.5 h-3.5 rounded-full bg-amber-400 inline-block shadow-sm" title="ต้องพัฒนาเพิ่ม"></span>;
      case 'red': return <span className="w-3.5 h-3.5 rounded-full bg-rose-500 inline-block shadow-sm" title="Gap สูง / วิกฤต"></span>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* หัวข้อหน้า Dashboard */}
        <div className="pt-6">
          <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
            People Excellence & Competency Center
          </span>
          <h2 className="text-2xl font-extrabold text-gray-900 mt-2">พัฒนาการสมรรถนะและความผูกพันบุคลากร</h2>
          <p className="text-sm text-gray-600 mt-1">ติดตามผล Competency, แผนพัฒนาบุคลากรรายบุคคล (IDP), ระบบพี่เลี้ยง และดัชนีความผูกพัน (Engagement)</p>
        </div>

        {/* ส่วนที่ 1: Competency Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {competencySummary.map((item, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">{item.category}</span>
                  <span className={`w-3 h-3 rounded-full ${item.status === 'emerald' ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                </div>
                <p className="text-3xl font-extrabold text-gray-900">{item.score}</p>
                <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between text-xs font-medium text-gray-400">
                <span>ค่าเป้าหมาย: <strong className="text-gray-700">{item.target}</strong></span>
                <span className={item.status === 'emerald' ? 'text-emerald-600' : 'text-amber-600'}>
                  {item.status === 'emerald' ? 'ผ่านเกณฑ์' : 'ต้องยกระดับ'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ส่วนที่ 2: Development & Preceptor Metrics */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-base font-bold text-gray-800 mb-1">Development & Capability Building</h3>
          <p className="text-xs text-gray-500 mb-4">ติดตามความก้าวหน้าของ IDP, การฝึกอบรม, และระบบพี่เลี้ยง/โค้ช</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {developmentMetrics.map((card, idx) => (
              <div key={idx} className="bg-gray-50/60 p-4 rounded-xl border border-gray-100 flex flex-col justify-between">
                <span className="text-xs font-bold text-gray-500">{card.title}</span>
                <p className={`text-xl font-extrabold my-2 ${card.color}`}>{card.value}</p>
                <span className="text-[11px] text-gray-400">{card.sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ส่วนที่ 3: People Outcome Metrics */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-base font-bold text-gray-800 mb-1">People Outcome & Engagement</h3>
          <p className="text-xs text-gray-500 mb-4">ดัชนีชี้วัดความสุข ความผูกพัน และอัตราการคงอยู่ของบุคลากรในองค์กร</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {outcomeMetrics.map((card, idx) => (
              <div key={idx} className="bg-gray-50/60 p-4 rounded-xl border border-gray-100 flex flex-col justify-between">
                <span className="text-xs font-bold text-gray-500">{card.title}</span>
                <p className={`text-xl font-extrabold my-2 ${card.color}`}>{card.value}</p>
                <span className="text-[11px] text-gray-400">{card.sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ส่วนที่ 4: Competency Heatmap รายหน่วยงาน */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="mb-4">
            <h3 className="text-base font-bold text-gray-800">Competency Heatmap (ตรวจจับหน่วยงานที่มี Competency Gap สูง)</h3>
            <p className="text-xs text-gray-500">ช่วยให้ฝ่ายพัฒนาทรัพยากรบุคคลสามารถจัดหลักสูตรอบรมหรือส่งเสริม Preceptor ได้ตรงจุด</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase">
                  <th className="pb-3">หน่วยงาน</th>
                  <th className="pb-3 text-center">Core Competency</th>
                  <th className="pb-3 text-center">Managerial Competency</th>
                  <th className="pb-3 text-center">Specific Competency</th>
                  <th className="pb-3 text-center">Competency Gap Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {heatmapData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-3.5 font-medium text-gray-700">{row.ward}</td>
                    <td className="py-3.5 text-center">{getStatusDot(row.core)}</td>
                    <td className="py-3.5 text-center">{getStatusDot(row.managerial)}</td>
                    <td className="py-3.5 text-center">{getStatusDot(row.specific)}</td>
                    <td className="py-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                        row.gap === 'High Gap' ? 'bg-rose-100 text-rose-800' :
                        row.gap === 'Moderate' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {row.gap}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}