'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function StrategicDashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [strategicData, setStrategicData] = useState<any[]>([]);

  // ข้อมูล 5 ยุทธศาสตร์การพยาบาล สอดคล้องตามมาตรฐาน NQA/SAR และโครงสร้างกลยุทธ์องค์กร
  const mockStrategies = [
    {
      id: 1,
      code: 'Strategy 1',
      title: 'ยุทธศาสตร์ที่ 1 : Clinical & Nursing Excellence',
      subTitle: 'พัฒนาระบบบริการพยาบาลให้มีคุณภาพ มุ่งสู่องค์กรพยาบาลที่เป็นเลิศ',
      progress: 91,
      target: '>= 90%',
      status: 'บรรลุเป้าหมาย',
      color: 'bg-emerald-600',
      kpiSummary: 'KPI ผ่าน 8/9 ตัว',
      warningText: '⚠️ 1 KPI ต้องเฝ้าระวัง',
      kpis: [
        { name: 'CNPG (Clinical Nursing Practice Guideline)', value: '94.2%', target: '90%', status: 'ผ่าน' },
        { name: 'NEWS / EWS Assessment Compliance', value: '92.5%', target: '90%', status: 'ผ่าน' },
        { name: 'Fall Prevention & Rate', value: '0.31 ต่อพันวันนอน', target: '< 0.5', status: 'ผ่าน' },
        { name: 'Pressure Injury Rate (HAPU)', value: '0.12%', target: '< 0.2%', status: 'ผ่าน' },
        { name: 'Medication Error Incident Rate', value: '0.15%', target: '< 0.1%', status: 'ต้องเฝ้าระวัง' },
        { name: 'Nursing Documentation Quality', value: '91.0%', target: '90%', status: 'ผ่าน' },
        { name: 'Clinical Outcome & Evaluation', value: '89.5%', target: '85%', status: 'ผ่าน' }
      ]
    },
    {
      id: 2,
      code: 'Strategy 2',
      title: 'ยุทธศาสตร์ที่ 2 : Medical & Wellness Tourism',
      subTitle: 'พัฒนาระบบบริการพยาบาลด้าน Medical & Wellness เพื่อยกระดับประสบการณ์',
      progress: 78,
      target: '>= 80%',
      status: 'ต้องเฝ้าระวัง',
      color: 'bg-amber-500',
      kpiSummary: 'KPI ผ่าน 3/4 ตัว',
      warningText: '⚠️ 1 KPI ใกล้เคียงเป้าหมาย',
      kpis: [
        { name: 'Foreign Patient Satisfaction', value: '88.0%', target: '85%', status: 'ผ่าน' },
        { name: 'Multicultural Competency Score', value: '76.5%', target: '80%', status: 'ใกล้เคียง' },
        { name: 'Patient Complaint Resolution Rate', value: '100%', target: '100%', status: 'ผ่าน' },
        { name: 'International Communication Skill', value: '82.0%', target: '80%', status: 'ผ่าน' }
      ]
    },
    {
      id: 3,
      code: 'Strategy 3',
      title: 'ยุทธศาสตร์ที่ 3 : PP&P Excellence',
      subTitle: 'ส่งเสริมสุขภาพและป้องกันโรคเชิงรุกด้วยระบบการพยาบาลที่มีคุณภาพ',
      progress: 68,
      target: '>= 75%',
      status: 'กำลังดำเนินการ',
      color: 'bg-blue-600',
      kpiSummary: 'KPI ผ่าน 3/5 ตัว',
      warningText: 'ℹ️ อยู่ระหว่างเร่งรัดติดตามผลงานรอบ 6 เดือน',
      kpis: [
        { name: 'D-METHOD / DALI Application', value: '74.2%', target: '80%', status: 'ต่ำกว่าเป้า' },
        { name: 'Teach-back Technique Compliance', value: '70.5%', target: '75%', status: 'ต่ำกว่าเป้า' },
        { name: 'Health Literacy Promotion', value: '82.0%', target: '80%', status: 'ผ่าน' },
        { name: 'Structured Follow-up System', value: '85.4%', target: '80%', status: 'ผ่าน' },
        { name: 'Readmission Rate (30 Days)', value: '4.1%', target: '< 5.0%', status: 'ผ่าน' }
      ]
    },
    {
      id: 4,
      code: 'Strategy 4',
      title: 'ยุทธศาสตร์ที่ 4 : People Excellence',
      subTitle: 'บริหารและพัฒนาศักยภาพบุคลากรทางการพยาบาลสู่ความเป็นเลิศ',
      progress: 88,
      target: '>= 85%',
      status: 'บรรลุเป้าหมาย',
      color: 'bg-emerald-600',
      kpiSummary: 'KPI ผ่าน 7/8 ตัว',
      warningText: '✅ อัตราคงอยู่และสมรรถนะผ่านเกณฑ์',
      kpis: [
        { name: 'Workload & Manpower Balance', value: '86.0%', target: '85%', status: 'ผ่าน' },
        { name: 'Patient Classification System (PCS)', value: '92.0%', target: '90%', status: 'ผ่าน' },
        { name: 'Productivity เฉลี่ยรวม', value: '82.5%', target: '80%', status: 'ผ่าน' },
        { name: 'Skill Mix & Competency Match', value: '89.0%', target: '85%', status: 'ผ่าน' },
        { name: 'IDP (Individual Development Plan)', value: '94.5%', target: '90%', status: 'ผ่าน' },
        { name: 'Clinical Supervision Coverage', value: '84.0%', target: '85%', status: 'ใกล้เคียง' },
        { name: 'Nurse Engagement & Retention', value: '87.2%', target: '85%', status: 'ผ่าน' }
      ]
    },
    {
      id: 5,
      code: 'Strategy 5',
      title: 'ยุทธศาสตร์ที่ 5 : Governance Excellence',
      subTitle: 'บริหารองค์กรพยาบาลตามหลักธรรมาภิบาลและนวัตกรรม สู่ความเป็นเลิศ',
      progress: 93,
      target: '>= 90%',
      status: 'บรรลุเป้าหมาย',
      color: 'bg-emerald-600',
      kpiSummary: 'KPI ผ่าน 6/6 ตัว',
      warningText: '✨ โดดเด่นด้านนวัตกรรมและผลงานวิจัย',
      kpis: [
        { name: 'Strategic KPI Monitoring & Review', value: '100%', target: '95%', status: 'ผ่าน' },
        { name: 'Action Plan Execution Rate', value: '92.5%', target: '90%', status: 'ผ่าน' },
        { name: 'Risk Management & Governance', value: '95.0%', target: '90%', status: 'ผ่าน' },
        { name: 'Dashboard Completeness & Data Integrity', value: '98.0%', target: '95%', status: 'ผ่าน' },
        { name: 'CQI Projects Implementation', value: '18 โครงการ', target: '15 โครงการ', status: 'ผ่าน' },
        { name: 'Research & Innovation Utilization', value: '12 ผลงาน', target: '10 ผลงาน', status: 'ผ่าน' }
      ]
    }
  ];

  useEffect(() => {
    setTimeout(() => {
      setStrategicData(mockStrategies);
      setLoading(false);
    }, 300);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* การ์ดสรุปภาพรวมองค์กรพยาบาล */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-emerald-900">ภาพรวมความสำเร็จองค์กรพยาบาล (Overall Strategic Progress)</h2>
            <p className="text-xs text-gray-500 mt-1">
              Strategy → Strategic KPI → Operational KPI → Unit KPI → Action Plan → Result
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-5 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <span className="block text-xs text-emerald-700 font-medium">ความสำเร็จภาพรวม</span>
              <span className="text-2xl font-extrabold text-emerald-900">86.2%</span>
            </div>
          </div>
        </div>

        {/* รายละเอียดยุทธศาสตร์ทั้ง 5 Card */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">กำลังโหลดข้อมูลยุทธศาสตร์และตัวชี้วัด...</div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {strategicData.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                
                {/* หัวข้อยุทธศาสตร์ */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                        {item.code}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">{item.kpiSummary}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mt-2">{item.title}</h3>
                    <p className="text-xs text-gray-500">{item.subTitle}</p>
                  </div>
                  <div className="flex items-center gap-3 self-start md:self-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      item.status === 'บรรลุเป้าหมาย' ? 'bg-emerald-100 text-emerald-800' :
                      item.status === 'ต้องเฝ้าระวัง' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {item.status}
                    </span>
                    <span className="text-xl font-extrabold text-emerald-900">{item.progress}%</span>
                  </div>
                </div>

                {/* ข้อความแจ้งเตือนสถานะย่อย */}
                <div className="mb-3 text-xs font-medium text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg inline-block">
                  {item.warningText}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden mb-6">
                  <div 
                    className={`h-full ${item.color} transition-all duration-500 rounded-full`} 
                    style={{ width: `${item.progress}%` }}
                  ></div>
                </div>

                {/* รายการตัวชี้วัดย่อย (Key Performance Indicators) */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    ตัวชี้วัดภายใต้ยุทธศาสตร์ (Strategic & Operational KPIs)
                  </h4>
                  <div className="space-y-2">
                    {item.kpis.map((kpi: any, idx: number) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-lg border border-gray-100 text-sm gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-xs">•</span>
                          <span className="font-medium text-gray-700">{kpi.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-gray-500">เป้าหมาย: <strong className="text-gray-700">{kpi.target}</strong></span>
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded">ผลงาน: {kpi.value}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            kpi.status === 'ผ่าน' ? 'bg-emerald-100 text-emerald-800' :
                            kpi.status === 'ใกล้เคียง' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {kpi.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}