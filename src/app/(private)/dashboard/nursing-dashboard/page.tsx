'use client';

import React from 'react';
import Link from 'next/link';

export default function NursingDashboardHubPage() {
  // ข้อมูล 6 แดชบอร์ดหลักตามโครงสร้างการบริหารงานพยาบาล
  const dashboardMenus = [
    {
      id: 'executive',
      title: '1. Executive Dashboard',
      subtitle: 'ภาพรวมองค์กร',
      description: 'สรุปสถานการณ์ตัวชี้วัดสำคัญระดับองค์กร อัตราครองเตียง และสถานะภาพรวมแบบเรียลไทม์เพื่อการตัดสินใจของผู้บริหาร',
      path: '/dashboard/nursing-dashboard/executive',
      borderColor: 'border-emerald-500',
      bgColor: 'bg-emerald-50/40',
      badgeColor: 'bg-emerald-700 text-white',
      hoverColor: 'hover:border-emerald-700 hover:bg-emerald-50'
    },
    {
      id: 'strategic',
      title: '2. Strategic Dashboard',
      subtitle: 'เป้าหมาย 5 ยุทธศาสตร์',
      description: 'ติดตามความก้าวหน้าของแผนยุทธศาสตร์ 5 ด้าน เป้าหมายประจำปี และโครงการ Quick Win ของกลุ่มภารกิจด้านการพยาบาล',
      path: '/dashboard/nursing-dashboard/strategic',
      borderColor: 'border-blue-500',
      bgColor: 'bg-blue-50/40',
      badgeColor: 'bg-blue-700 text-white',
      hoverColor: 'hover:border-blue-700 hover:bg-blue-50'
    },
    {
      id: 'quality-safety',
      title: '3. Quality & Safety Dashboard',
      subtitle: 'จุดเสี่ยงทางการพยาบาล',
      description: 'วิเคราะห์อุบัติการณ์ความเสี่ยง (Clinical Incident) ตัวชี้วัดคุณภาพการพยาบาลตามมาตรฐาน HA และความปลอดภัยของผู้ป่วย',
      path: '/dashboard/nursing-dashboard/quality-safety',
      borderColor: 'border-amber-500',
      bgColor: 'bg-amber-50/40',
      badgeColor: 'bg-amber-700 text-white',
      hoverColor: 'hover:border-amber-700 hover:bg-amber-50'
    },
    {
      id: 'workforce',
      title: '4. Workforce Dashboard',
      subtitle: 'Productivity / PCS / Skill Mix',
      description: 'วิเคราะห์ภาระงานของผู้ป่วย (Patient Classification System), สัดส่วนบุคลากร (Skill Mix) และอัตรากำลังในแต่ละหอผู้ป่วย',
      path: '/dashboard/nursing-dashboard/workforce',
      borderColor: 'border-purple-500',
      bgColor: 'bg-purple-50/40',
      badgeColor: 'bg-purple-700 text-white',
      hoverColor: 'hover:border-purple-700 hover:bg-purple-50'
    },
    {
      id: 'people-excellence',
      title: '5. People Excellence Dashboard',
      subtitle: 'Competency, IDP, Engagement, Supervision',
      description: 'ติดตามสมรรถนะพยาบาล การพัฒนาตามแผนรายบุคคล (IDP), ความผูกพันต่อองค์กร และผลการนิเทศทางการพยาบาล',
      path: '/dashboard/nursing-dashboard/people-excellence',
      borderColor: 'border-rose-500',
      bgColor: 'bg-rose-50/40',
      badgeColor: 'bg-rose-700 text-white',
      hoverColor: 'hover:border-rose-700 hover:bg-rose-50'
    },
    {
      id: 'action-risk',
      title: '6. Action & Risk Dashboard',
      subtitle: 'เรื่องใดต้องแก้ ใครรับผิดชอบ และครบกำหนดเมื่อใด',
      description: 'ติดตามข้อสั่งการ ประเด็นข้อเสนอแนะจากการเยี่ยมสำรวจ และแผนการจัดการความเสี่ยงที่ต้องเร่งดำเนินการแก้ไข',
      path: '/dashboard/nursing-dashboard/action-risk',
      borderColor: 'border-teal-500',
      bgColor: 'bg-teal-50/40',
      badgeColor: 'bg-teal-700 text-white',
      hoverColor: 'hover:border-teal-700 hover:bg-teal-50'
    },
  ];

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* ส่วนหัวต้อนรับและภาพรวม */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none"></div>
        <div className="max-w-3xl relative z-10">
          <span className="bg-amber-400 text-emerald-950 font-bold text-xs px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
            Private Management Zone
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mt-3 tracking-tight">
            Nursing Dashboard System
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base mt-2.5 leading-relaxed font-light">
            ระบบสารสนเทศเพื่อการบริหารจัดการเชิงกลยุทธ์และการพยาบาลยุคดิจิทัล 
            บูรณาการข้อมูลเพื่อการขับเคลื่อนคุณภาพบริการและสนับสนุนการตัดสินใจของผู้บริหารระดับสูง
          </p>
        </div>
      </div>

      {/* Grid แสดงรายการแดชบอร์ดทั้ง 6 ส่วน */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardMenus.map((item) => (
          <Link 
            key={item.id} 
            href={item.path}
            className={`group flex flex-col justify-between p-6 rounded-2xl border-2 ${item.borderColor} ${item.bgColor} bg-white shadow-sm ${item.hoverColor} hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs font-bold px-3 py-1 rounded-xl shadow-2xs ${item.badgeColor}`}>
                  Dashboard
                </span>
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 group-hover:text-emerald-800 group-hover:bg-emerald-50 transition-all shadow-2xs">
                  <svg className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-900 transition-colors">
                {item.title}
              </h3>
              
              <div className="text-xs font-semibold text-emerald-800 mt-1">
                "{item.subtitle}"
              </div>

              <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-emerald-800">
              <span className="text-gray-500 font-normal">สถานะระบบ: พร้อมใช้งาน</span>
              <span className="bg-emerald-100/70 text-emerald-900 px-3 py-1 rounded-xl group-hover:bg-emerald-800 group-hover:text-amber-200 transition-colors">
                เข้าสู่ระบบ &rarr;
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}