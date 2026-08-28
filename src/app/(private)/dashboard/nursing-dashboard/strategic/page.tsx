'use client';

import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader'; // ปรับ Path ตามโครงสร้างโปรเจกต์จริงของคุณ
import { createClient } from '@/utils/supabase/client';

export default function StrategicDashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [strategicData, setStrategicData] = useState<any[]>([]);

  // ข้อมูลจำลอง (Mock Data) สำหรับแสดงผลเบื้องต้น หากยังไม่ได้ต่อตาราง Database จริง
  const mockStrategies = [
    {
      id: 1,
      code: 'Strategy 1',
      title: 'ยุทธศาสตร์ที่ 1 : พัฒนาระบบบริการพยาบาลให้มีคุณภาพ มุ่งสู่องค์กรพยาบาลที่เป็นเลิศ (Service Excellence)',
      progress: 85,
      target: '>= 90%',
      status: 'บรรลุเป้าหมาย',
      color: 'bg-emerald-600',
      kpis: [
        { name: 'ร้อยละความพึงพอใจของผู้รับบริการ', value: '92.4%', target: '90%', status: 'ผ่าน' },
        { name: 'อุบัติการณ์ความเสี่ยงสำคัญระดับรุนแรง', value: '0 ครั้ง', target: '0', status: 'ผ่าน' }
      ]
    },
    {
      id: 2,
      code: 'Strategy 2',
      title: 'ยุทธศาสตร์ที่ 2 : พัฒนาระบบบริการพยาบาลด้าน Medical & Wellness เพื่อยกระดับประสบการณ์และการเข้าถึงบริการที่เป็นเลิศ',
      progress: 72,
      target: '>= 80%',
      status: 'ต้องเฝ้าระวัง',
      color: 'bg-amber-500',
      kpis: [
        { name: 'Productivity เฉลี่ยรวม', value: '81.5%', target: '80%', status: 'ผ่าน' },
        { name: 'ชั่วโมงพัฒนาความรู้ต่อเนื่อง (CNEU)', value: '38 ชม./คน', target: '40 ชม.', status: 'ใกล้เคียง' }
      ]
    },
    {
      id: 3,
      code: 'Strategy 3',
      title: 'ยุทธศาสตร์ที่ 3 : ส่งเสริมสุขภาพและป้องกันโรคเชิงรุกด้วยระบบการพยาบาลที่มีคุณภาพ (PP&P Excellence)',
      progress: 60,
      target: '>= 75%',
      status: 'กำลังดำเนินการ',
      color: 'bg-blue-600',
      kpis: [
        { name: 'จำนวนนวัตกรรม/R2R ที่นำไปใช้จริง', value: '12 ผลงาน', target: '15 ผลงาน', status: 'ต่ำกว่าเป้า' }
      ]
    },
    {
      id: 4,
      code: 'Strategy 4',
      title: 'ยุทธศาสตร์ที่ 4 : บริหารและพัฒนาศักยภาพบุคลากรทางการพยาบาลสู่ความเป็นเลิศ (People Excellence)',
      progress: 90,
      target: '>= 85%',
      status: 'บรรลุเป้าหมาย',
      color: 'bg-emerald-600',
      kpis: [
        { name: 'ระดับความผูกพันต่อองค์กร (Engagement Score)', value: '88.5%', target: '85%', status: 'ผ่าน' }
      ]
    },
    {
      id: 5,
      code: 'Strategy 5',
      title: 'ยุทธศาสตร์ที่ 5 : บริหารองค์กรพยาบาลตามหลักธรรมาภิบาลและนวัตกรรม สู่ความเป็นเลิศ (Governance Excellence)',
      progress: 95,
      target: '>= 90%',
      status: 'บรรลุเป้าหมาย',
      color: 'bg-emerald-600',
      kpis: [
        { name: 'การประเมินคุณธรรมและความโปร่งใส (ITA)', value: '96.2%', target: '90%', status: 'ผ่าน' }
      ]
    }
  ];

  useEffect(() => {
    // จำลองการโหลดข้อมูล หรือสามารถเปลี่ยนเป็นการดึงจาก Supabase Table จริงได้ที่นี่
    setTimeout(() => {
      setStrategicData(mockStrategies);
      setLoading(false);
    }, 300);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      
        
        {/* ส่วนเนื้อหาหลัก */}
        <div className="mt-6 space-y-6">
          
          {/* การ์ดสรุปภาพรวม */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-emerald-900">ติดตามผลการดำเนินงาน 5 ยุทธศาสตร์การพยาบาล</h2>
              <p className="text-sm text-gray-500 mt-1">ประเมินความก้าวหน้าของตัวชี้วัดตามแผนยุทธศาสตร์ภาพรวมประจำปี</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <span className="block text-xs text-emerald-700 font-medium">ภาพรวมความสำเร็จ</span>
                <span className="text-xl font-bold text-emerald-900">80.4%</span>
              </div>
            </div>
          </div>

          {/* รายละเอียดยุทธศาสตร์ทั้ง 5 */}
          {loading ? (
            <div className="text-center py-12 text-gray-400">กำลังโหลดข้อมูลยุทธศาสตร์...</div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {strategicData.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <span className="text-xs font-semibold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                        {item.code}
                      </span>
                      <h3 className="text-lg font-bold text-gray-800 mt-2">{item.title}</h3>
                    </div>
                    <div className="flex items-center gap-3 self-start md:self-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.status === 'บรรลุเป้าหมาย' ? 'bg-emerald-100 text-emerald-800' :
                        item.status === 'ต้องเฝ้าระวัง' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.status}
                      </span>
                      <span className="text-lg font-extrabold text-emerald-900">{item.progress}%</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden mb-6">
                    <div 
                      className={`h-full ${item.color} transition-all duration-500 rounded-full`} 
                      style={{ width: `${item.progress}%` }}
                    ></div>
                  </div>

                  {/* ตารางตัวชี้วัดย่อยในแต่ละยุทธศาสตร์ */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">ตัวชี้วัดภายใต้ยุทธศาสตร์ (Key Performance Indicators)</h4>
                    <div className="space-y-2">
                      {item.kpis.map((kpi: any, idx: number) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-lg border border-gray-100 text-sm gap-2">
                          <span className="font-medium text-gray-700">• {kpi.name}</span>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-gray-500">เป้าหมาย: <strong className="text-gray-700">{kpi.target}</strong></span>
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded">ผลงาน: {kpi.value}</span>
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