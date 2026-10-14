'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function StrategicDashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [strategicData, setStrategicData] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<number | 'all'>('all');
  const [selectedSubTabs, setSelectedSubTabs] = useState<{ [key: number]: string }>({});

  const mockStrategies = [
    {
      id: 1,
      code: 'Strategy 1',
      title: 'ยุทธศาสตร์ที่ 1 : พัฒนาระบบบริการพยาบาลให้มีคุณภาพ มุ่งสู่องค์กรพยาบาลที่เป็นเลิศ',
      subTitle: 'Service Excellence & High Reliability Organization (HRO)',
      progress: 91,
      target: '>= 80%',
      status: 'บรรลุเป้าหมาย',
      color: 'bg-emerald-600',
      kpiSummary: 'KPI ผ่านเกณฑ์ภาพรวม',
      warningText: '⚠️ มีตัวชี้วัดบางรายการต้องเฝ้าระวัง',
      subStrategies: [
        {
          code: '1.1',
          name: 'พัฒนาระบบบริการพยาบาลตามมาตรฐานวิชาชีพ',
          progress: 92,
          kpis: [
            { name: 'ร้อยละหน่วยงานที่มี CNPG/Care Map ครอบคลุมโรคหรือกระบวนการสำคัญ', target: '100%', status: 'ผ่าน', years: [2565, 2566, 2567, 2568, 2569], history: [90, 93, 96, 98, 100] },
            { name: 'ร้อยละการปฏิบัติตาม CNPG/Care Map', target: '>=90%', status: 'ผ่าน', years: [2565, 2566, 2567, 2568, 2569], history: [82, 85, 89, 92, 94.2] },
            { name: 'ร้อยละความสมบูรณ์ของบันทึกทางการพยาบาลตามเกณฑ์ 4C', target: '>90%', status: 'ผ่าน', years: [2565, 2566, 2567, 2568, 2569], history: [84, 87, 88, 90, 91.5] },
            { name: 'ร้อยละหน่วยงานที่ผ่านการตรวจประเมินคุณภาพบริการพยาบาลภายใน', target: '>90%', status: 'ผ่าน', years: [2565, 2566, 2567, 2568, 2569], history: [85, 88, 90, 91, 92.0] }
          ]
        },
        {
          code: '1.2',
          name: 'พัฒนาระบบความปลอดภัยของผู้ป่วย (Patient Safety & HRO)',
          progress: 88,
          kpis: [
            { name: 'ร้อยละผู้ป่วยได้รับการประเมิน NEWS/EWS ครบถ้วนตามเกณฑ์', target: '>=95%', status: 'เฝ้าระวัง', years: [2565, 2566, 2567, 2568, 2569], history: [85, 88, 90, 91, 92.5] },
            { name: 'ร้อยละผู้ป่วยที่มีคะแนนเตือนผิดปกติได้รับการรายงานและตอบสนอง', target: '>=90%', status: 'ผ่าน', years: [2565, 2566, 2567, 2568, 2569], history: [82, 85, 88, 90, 92.0] },
            { name: 'จำนวน Medication error ระดับ E–I', target: '0 ครั้ง', status: 'ผ่าน', years: [2565, 2566, 2567, 2568, 2569], history: [5, 3, 2, 1, 0] },
            { name: 'อัตราการเกิดแผลกดทับระดับ 2-4 ในโรงพยาบาล', target: '<2', status: 'ผ่าน', years: [2565, 2566, 2567, 2568, 2569], history: [3.5, 2.8, 2.2, 1.8, 1.2] }
          ]
        },
        {
          code: '1.3',
          name: 'พัฒนาระบบการพยาบาลผู้ป่วยโรคสำคัญ (Service Plan Nursing)',
          progress: 89,
          kpis: [
            { name: 'ร้อยละตัวชี้วัดด้านความรวดเร็วในการเข้าถึงหรือได้รับการรักษา', target: '>=80%', status: 'ผ่าน', years: [2565, 2566, 2567, 2568, 2569], history: [72, 76, 80, 84, 88.0] },
            { name: 'ร้อยละตัวชี้วัดด้านการคัดกรองและเฝ้าระวังผู้ป่วยโรคสำคัญ', target: '>=80%', status: 'ผ่าน', years: [2565, 2566, 2567, 2568, 2569], history: [75, 78, 82, 85, 89.0] }
          ]
        },
        {
          code: '1.4',
          name: 'พัฒนาระบบการดูแลผู้ป่วยแบบไร้รอยต่อ (Seamless Care)',
          progress: 90,
          kpis: [
            { name: 'ร้อยละผู้ป่วยได้รับการวางแผนจำหน่ายตาม D-METHOD ครบถ้วน', target: '>=90%', status: 'ผ่าน', years: [2565, 2566, 2567, 2568, 2569], history: [80, 83, 86, 89, 91.2] },
            { name: 'อัตรา Unplanned readmission ภายใน 28 วัน', target: '<=2%', status: 'ผ่าน', years: [2565, 2566, 2567, 2568, 2569], history: [3.2, 2.8, 2.4, 2.1, 1.8] }
          ]
        },
        {
          code: '1.5',
          name: 'พัฒนาคุณภาพบริการด้วยนวัตกรรมและข้อมูลสารสนเทศ (Digital Nursing)',
          progress: 85,
          kpis: [
            { name: 'ร้อยละหน่วยงานที่บันทึกและส่งข้อมูลตัวชี้วัดครบถ้วน', target: '>=95%', status: 'เฝ้าระวัง', years: [2565, 2566, 2567, 2568, 2569], history: [86, 89, 92, 94, 94.5] },
            { name: 'ร้อยละหน่วยงานที่มี CQI, R2R หรือนวัตกรรมอย่างน้อย 1 เรื่อง/ปี', target: '100%', status: 'ผ่าน', years: [2565, 2566, 2567, 2568, 2569], history: [80, 88, 94, 98, 100] }
          ]
        }
      ]
    },
    {
      id: 2,
      code: 'Strategy 2',
      title: 'ยุทธศาสตร์ที่ 2 : ต้นแบบการท่องเที่ยวเชิงสุขภาพระดับนานาชาติ',
      subTitle: 'Medical and Wellness Tourism Model',
      progress: 88,
      target: '>= 90%',
      status: 'กำลังดำเนินการ',
      color: 'bg-teal-600',
      kpiSummary: 'ระบบบริการนานาชาติ',
      warningText: 'ℹ️ อยู่ระหว่างประเมินความพร้อมหน่วยบริการเป้าหมาย',
      subStrategies: [
        {
          code: '2.1',
          name: 'พัฒนาต้นแบบระบบบริการพยาบาลตามมาตรฐานสากล',
          progress: 87,
          kpis: [
            { name: 'หน่วยบริการเป้าหมายมี Nursing Service Model', target: '100%', status: 'ผ่าน', years: [2565, 2566, 2567, 2568, 2569], history: [50, 60, 75, 90, 100] }
          ]
        }
      ]
    },
    {
      id: 3,
      code: 'Strategy 3',
      title: 'ยุทธศาสตร์ที่ 3 : ส่งเสริมสุขภาพและป้องกันโรคเชิงรุก สอดคล้องกับบริบทสังคมเมือง',
      subTitle: 'PP&P Excellence',
      progress: 85,
      target: '>= 90%',
      status: 'บรรลุเป้าหมาย',
      color: 'bg-cyan-600',
      kpiSummary: 'คัดกรองและป้องกันโรคเชิงรุก',
      warningText: '⚠️ ติดตามกลุ่มเสี่ยงโรคเรื้อรังในชุมชน',
      subStrategies: [
        {
          code: '3.1',
          name: 'พัฒนาระบบคัดกรองและประเมินความเสี่ยง',
          progress: 91,
          kpis: [
            { name: 'ประชาชนกลุ่มเป้าหมายได้รับการคัดกรองสุขภาพ', target: '>=90%', status: 'ผ่าน', years: [2565, 2566, 2567, 2568, 2569], history: [75, 80, 85, 88, 91] }
          ]
        }
      ]
    },
    {
      id: 4,
      code: 'Strategy 4',
      title: 'ยุทธศาสตร์ที่ 4 : พัฒนาทรัพยากรบุคคล สมรรถนะ ภาวะผู้นำ และสุขภาวะ',
      subTitle: 'People & Workforce Excellence',
      progress: 86,
      target: '>= 80%',
      status: 'บรรลุเป้าหมาย',
      color: 'bg-blue-600',
      kpiSummary: 'สมรรถนะ อัตรากำลัง และสุขภาวะ',
      warningText: '✅ อัตรากำลังและสมรรถนะผ่านเกณฑ์',
      subStrategies: [
        {
          code: '4.1',
          name: 'พัฒนาสมรรถนะบุคลากรตาม Nursing Competency Framework',
          progress: 85,
          kpis: [
            { name: 'บุคลากรผ่านเกณฑ์ Core & Functional Competency', target: '>=80%', status: 'ผ่าน', years: [2565, 2566, 2567, 2568, 2569], history: [72, 76, 80, 82.5, 85] }
          ]
        }
      ]
    },
    {
      id: 5,
      code: 'Strategy 5',
      title: 'ยุทธศาสตร์ที่ 5 : บริหารองค์กรพยาบาลเป็นเลิศด้วยหลักธรรมภิบาล',
      subTitle: 'Governance Excellence & Digital Management',
      progress: 90,
      target: '>= 90%',
      status: 'บรรลุเป้าหมาย',
      color: 'bg-indigo-600',
      kpiSummary: 'ธรรมาภิบาลและความโปร่งใส',
      warningText: '✅ ระบบจัดการความเสี่ยงและข้อมูลถูกต้องครบถ้วน',
      subStrategies: [
        {
          code: '5.1',
          name: 'พัฒนาระบบ Nursing Governance และ Clinical Governance',
          progress: 92,
          kpis: [
            { name: 'หน่วยงานถ่ายทอดยุทธศาสตร์และติดตาม KPI ครบถ้วน', target: '>=90%', status: 'ผ่าน', years: [2565, 2566, 2567, 2568, 2569], history: [78, 82, 86, 90, 92] }
          ]
        }
      ]
    }
  ];

  useEffect(() => {
    setTimeout(() => {
      setStrategicData(mockStrategies);
      setLoading(false);
    }, 300);
  }, []);

  const filteredData = selectedTab === 'all' 
    ? strategicData 
    : strategicData.filter(item => item.id === selectedTab);

  const handleSubTabChange = (strategyId: number, subCode: string) => {
    setSelectedSubTabs(prev => ({
      ...prev,
      [strategyId]: subCode
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 pt-4">
        
        {/* ส่วนหัวพรีเมียมสไตล์ Strategic Intelligence (ตามภาพอ้างอิง) */}
        <div className="bg-[#083334] text-white rounded-3xl p-8 shadow-xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
          
          {/* ฝั่งซ้าย: ข้อความพาดหัวและคำอธิบาย */}
          <div className="space-y-4 max-w-2xl z-10">
            <div className="inline-flex items-center gap-2 bg-emerald-800/60 px-3 py-1 rounded-full text-emerald-200 text-xs font-semibold tracking-wide border border-emerald-700/50">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              STRATEGY INTELLIGENCE • FY 2569
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-white">
              จากแผนยุทธศาสตร์<br />สู่ตัวชี้วัดที่มองเห็นช่องว่าง
            </h1>
            <p className="text-sm text-emerald-100/80 leading-relaxed">
              สำรวจ เปรียบเทียบ และทบทวน KPI ตามยุทธศาสตร์และกลยุทธ์ พร้อมแยกะดับติดตามให้ตัดสินใจได้ชัดเจนขึ้น
            </p>
          </div>

          {/* ฝั่งขวา: การ์ดประเด็นที่ต้องพิจารณา (Live Review Card) */}
          <div className="bg-white text-gray-900 p-6 rounded-2xl shadow-lg w-full lg:w-[380px] space-y-4 z-10 border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ประเด็นที่ควรพิจารณา</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> LIVE REVIEW
              </span>
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-gray-900">15</span>
              <span className="text-xs font-semibold text-gray-600">รายการต้องทบทวนก่อนรับรองแผน</span>
            </div>

            {/* แถบสถานะย่อย */}
            <div className="space-y-2.5 pt-1 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-gray-600 font-medium">
                  <span>ข้อมูลไม่ครบ</span>
                  <span className="font-bold text-gray-800">8</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-700 h-full rounded-full" style={{ width: '55%' }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-gray-600 font-medium">
                  <span>ช่องว่าง (Gap)</span>
                  <span className="font-bold text-gray-800">4</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-600 h-full rounded-full" style={{ width: '30%' }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-gray-600 font-medium">
                  <span>ซ้ำ/ใกล้เคียง</span>
                  <span className="font-bold text-gray-800">3</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-600 h-full rounded-full" style={{ width: '20%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* แถบตัวเลขสรุปสถิติด้านล่าง Banner (Metric Counters) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#083334] text-white p-6 rounded-2xl shadow-md border border-white/10">
          <div className="border-r border-white/10 last:border-none pr-4">
            <span className="text-2xl sm:text-3xl font-black text-white">30</span>
            <p className="text-xs text-emerald-200 mt-0.5">5 ยุทธศาสตร์ ตัวชี้วัดทั้งหมด</p>
          </div>
          <div className="border-r border-white/10 last:border-none px-4">
            <span className="text-2xl sm:text-3xl font-black text-white">21</span>
            <p className="text-xs text-emerald-200 mt-0.5">70% ของทั้งหมด ระดับองค์กร</p>
          </div>
          <div className="border-r border-white/10 last:border-none px-4">
            <span className="text-2xl sm:text-3xl font-black text-white">9</span>
            <p className="text-xs text-emerald-200 mt-0.5">ใช้ติดตามหน้างาน ระดับหน่วยงาน</p>
          </div>
          <div className="pl-4">
            <span className="text-2xl sm:text-3xl font-black text-amber-400">10</span>
            <p className="text-xs text-emerald-200 mt-0.5">ข้อมูลไม่ครบหรือซ้ำ ต้องทบทวน</p>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedTab('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedTab === 'all' 
                ? 'bg-emerald-800 text-white shadow-sm' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            แสดงทุกยุทธศาสตร์ (All)
          </button>
          {strategicData.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedTab(item.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedTab === item.id 
                  ? 'bg-emerald-800 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              ยุทธศาสตร์ที่ {item.id}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">กำลังโหลดข้อมูลยุทธศาสตร์และกลยุทธ์ย่อย...</div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredData.map((item) => {
              const currentSubTab = selectedSubTabs[item.id] || 'all';
              
              const displayedSubStrategies = currentSubTab === 'all'
                ? (item.subStrategies || [])
                : (item.subStrategies || []).filter((sub: any) => sub.code === currentSubTab);

              return (
                <div key={item.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow space-y-4">
                  
                  {/* Main Strategy Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

                  {/* Warning Text & Progress Bar */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg inline-block border border-gray-100">
                      {item.warningText}
                    </div>
                    <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${item.color} transition-all duration-500 rounded-full`} 
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Sub-Strategy Tabs */}
                  <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-emerald-900 mr-2">เลือกกลยุทธ์ย่อย:</span>
                    <button
                      onClick={() => handleSubTabChange(item.id, 'all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        currentSubTab === 'all'
                          ? 'bg-emerald-800 text-white shadow-sm'
                          : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      แสดงทุกกลยุทธ์ย่อย
                    </button>
                    {(item.subStrategies || []).map((sub: any) => (
                      <button
                        key={sub.code}
                        onClick={() => handleSubTabChange(item.id, sub.code)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          currentSubTab === sub.code
                            ? 'bg-emerald-800 text-white shadow-sm'
                            : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        กลยุทธ์ {sub.code}
                      </button>
                    ))}
                  </div>

                  {/* Condition View: All vs Specific Sub-Strategy */}
                  {currentSubTab === 'all' ? (
                    <div className="space-y-4 pt-2">
                      {displayedSubStrategies.map((sub: any, subIdx: number) => (
                        <div key={subIdx} className="bg-gray-50/70 rounded-xl p-4 border border-gray-100 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold px-2 py-0.5 bg-emerald-800 text-white rounded">
                                กลยุทธ์ {sub.code}
                              </span>
                              <span className="text-sm font-semibold text-gray-800">{sub.name}</span>
                            </div>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">
                              ผลงานเฉลี่ย: {sub.progress}%
                            </span>
                          </div>

                          <div className="space-y-2 pl-2 sm:pl-4 border-l-2 border-emerald-200">
                            {(sub.kpis || []).map((kpi: any, kpiIdx: number) => {
                              const historyArr = kpi.history || [];
                              const latestVal = historyArr.length > 0 ? historyArr[historyArr.length - 1] : '-';
                              return (
                                <div key={kpiIdx} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-lg border border-gray-100 text-sm gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-emerald-600 text-xs font-bold">•</span>
                                    <span className="font-medium text-gray-700 text-xs sm:text-sm">{kpi.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs shrink-0">
                                    <span className="text-gray-500">เป้าหมาย: <strong className="text-gray-700">{kpi.target}</strong></span>
                                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">ผลงาน (ปี 69): {latestVal}</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                      kpi.status === 'ผ่าน' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {kpi.status}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* มุมมองกราฟแท่งแนวโน้มย้อนหลัง 5 ปี (Grid 2-3 คอลัมน์ แบบกระชับ) */
                    <div className="bg-gray-50/70 rounded-xl p-6 border border-gray-100 space-y-6 animate-fadeIn">
                      {displayedSubStrategies.map((sub: any, subIdx: number) => (
                        <div key={subIdx} className="space-y-4">
                          <div className="flex items-center justify-between border-b pb-3">
                            <div>
                              <span className="text-xs font-bold px-2 py-0.5 bg-emerald-800 text-white rounded">
                                กลยุทธ์ {sub.code}
                              </span>
                              <h4 className="text-base font-bold text-gray-900 mt-1">{sub.name}</h4>
                            </div>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                              ผลงานเฉลี่ยรวม: {sub.progress}%
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                            {(sub.kpis || []).map((kpi: any, kpiIdx: number) => {
                              const historyArr = kpi.history || [];
                              const latestVal = historyArr.length > 0 ? historyArr[historyArr.length - 1] : 0;
                              
                              return (
                                <div key={kpiIdx} className="bg-white p-4 rounded-xl border border-gray-100 space-y-3 shadow-sm flex flex-col justify-between">
                                  <div>
                                    <div className="text-xs font-bold text-gray-800 line-clamp-2 min-h-[32px]" title={kpi.name}>
                                      {kpi.name}
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] mt-2 text-gray-500 bg-gray-50 px-2 py-1 rounded">
                                      <span>เป้าหมาย: <strong className="text-gray-700">{kpi.target}</strong></span>
                                      <span className="text-emerald-700 font-bold">ล่าสุด: {latestVal}</span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-gray-100 items-end h-28 px-1">
                                    {(kpi.years || [2565, 2566, 2567, 2568, 2569]).map((yr: number, idx: number) => {
                                      const val = historyArr[idx] !== undefined ? historyArr[idx] : 0;
                                      const numericTarget = parseFloat(String(kpi.target).replace(/[^0-9.]/g, '')) || 100;
                                      const heightPercent = Math.min(Math.max((val / (numericTarget > 0 ? numericTarget * 1.2 : 100)) * 100, 10), 100);
                                      const isTargetMet = typeof val === 'number' && numericTarget > 0 && val >= numericTarget * 0.9;

                                      return (
                                        <div key={idx} className="flex flex-col items-center h-full justify-end gap-1 group">
                                          <span className="text-[9px] font-bold text-emerald-900 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {val}
                                          </span>
                                          <div className="w-full bg-gray-100 rounded-t-md h-full flex items-end overflow-hidden">
                                            <div 
                                              className={`w-full rounded-t-md transition-all duration-500 ${
                                                isTargetMet ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-500 hover:bg-amber-400'
                                              }`}
                                              style={{ height: `${heightPercent}%` }}
                                              title={`ปี ${yr}: ${val}`}
                                            ></div>
                                          </div>
                                          <span className="text-[10px] font-semibold text-gray-500 mt-0.5">{yr.toString().slice(-2)}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}