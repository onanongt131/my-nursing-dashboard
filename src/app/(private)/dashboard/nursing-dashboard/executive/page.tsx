'use client';

import React, { useState } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';

export default function NursingExecutiveDashboard() {
  // State สำหรับ Filter เบื้องต้น
  const [fiscalYear, setFiscalYear] = useState('2570');
  const [month, setMonth] = useState('all');
  const [group, setGroup] = useState('all');
  const [department, setDepartment] = useState('all');

  return (
    <div className="min-h-screen bg-gray-100/60 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* หัวข้อหน้าแดชบอร์ด */}
        <DashboardHeader title="NURSING EXECUTIVE DASHBOARD" activeTab="nursing-dashboard" />

        {/* 1. FILTER BAR SECTION */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* ปีงบประมาณ */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm">
              <span className="text-gray-500 font-medium">ปีงบประมาณ:</span>
              <select 
                value={fiscalYear} 
                onChange={(e) => setFiscalYear(e.target.value)}
                className="bg-transparent font-semibold text-gray-800 focus:outline-none cursor-pointer"
              >
                <option value="2570">2570</option>
                <option value="2569">2569</option>
              </select>
            </div>

            {/* เดือน */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm">
              <span className="text-gray-500 font-medium">เดือน:</span>
              <select 
                value={month} 
                onChange={(e) => setMonth(e.target.value)}
                className="bg-transparent font-semibold text-gray-800 focus:outline-none cursor-pointer"
              >
                <option value="all">ทุกเดือน</option>
                <option value="1">ตุลาคม</option>
                <option value="2">พฤศจิกายน</option>
                <option value="3">ธันวาคม</option>
              </select>
            </div>

            {/* กลุ่มงาน */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm">
              <span className="text-gray-500 font-medium">กลุ่มงาน:</span>
              <select 
                value={group} 
                onChange={(e) => setGroup(e.target.value)}
                className="bg-transparent font-semibold text-gray-800 focus:outline-none cursor-pointer"
              >
                <option value="all">ทุกกลุ่มงาน</option>
                <option value="ipd">กลุ่มงานผู้ป่วยใน</option>
                <option value="opd">กลุ่มงานผู้ป่วยนอก</option>
              </select>
            </div>

            {/* หน่วยงาน */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm">
              <span className="text-gray-500 font-medium">หน่วยงาน:</span>
              <select 
                value={department} 
                onChange={(e) => setDepartment(e.target.value)}
                className="bg-transparent font-semibold text-gray-800 focus:outline-none cursor-pointer"
              >
                <option value="all">ทุกหน่วยงาน</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-gray-400 font-medium">
            ข้อมูลล่าสุด: 28/02/2026
          </div>
        </div>

        {/* 2. TOP METRICS CARDS (5 ด้าน) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { title: 'Strategic KPI', val: '88%', change: '▲ 3%', status: 'bg-emerald-500' },
            { title: 'Action Plan', val: '82%', change: '▲ 5%', status: 'bg-emerald-500' },
            { title: 'Quality & Safety', val: '91%', change: '▲ 2%', status: 'bg-emerald-500' },
            { title: 'Workforce', val: '76%', change: '▼ 4%', status: 'bg-rose-500' },
            { title: 'Competency', val: '93%', change: '▲ 6%', status: 'bg-emerald-500' },
          ].map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase">{item.title}</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-extrabold text-gray-800">{item.val}</span>
                  <span className={`w-3 h-3 rounded-full ${item.status}`}></span>
                </div>
              </div>
              <span className={`text-xs font-semibold mt-3 ${item.change.includes('▲') ? 'text-emerald-600' : 'text-rose-600'}`}>
                {item.change} จากเดือนก่อน
              </span>
            </div>
          ))}
        </div>

        {/* 3. 5 STRATEGIC PERFORMANCE */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">5 STRATEGIC PERFORMANCE</h3>
          <div className="space-y-4">
            {[
              { code: 'ยุทธศาสตร์ 1', name: 'Clinical Excellence', score: 91, status: 'bg-emerald-500' },
              { code: 'ยุทธศาสตร์ 2', name: 'Medical & Wellness', score: 78, status: 'bg-amber-400' },
              { code: 'ยุทธศาสตร์ 3', name: 'PP&P Excellence', score: 86, status: 'bg-emerald-500' },
              { code: 'ยุทธศาสตร์ 4', name: 'People Excellence', score: 68, status: 'bg-rose-500' },
              { code: 'ยุทธศาสตร์ 5', name: 'Governance Excellence', score: 92, status: 'bg-emerald-500' },
            ].map((st, i) => (
              <div key={i} className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="flex items-center gap-3 w-72">
                  <span className="text-xs font-bold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg">{st.code}</span>
                  <span className="text-sm font-semibold text-gray-700">{st.name}</span>
                </div>
                <div className="flex-1 flex items-center gap-4">
                  <div className="flex-1 bg-gray-100 h-3 rounded-full overflow-hidden">
                    <div className="bg-emerald-700 h-full rounded-full" style={{ width: `${st.score}%` }}></div>
                  </div>
                  <span className="text-sm font-bold text-gray-800 w-12 text-right">{st.score}%</span>
                  <span className={`w-3 h-3 rounded-full ${st.status}`}></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. KPI TREND & MANAGEMENT ATTENTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ซ้าย: KPI Trend */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">KPI TREND</h3>
            <div className="h-48 flex flex-col justify-center items-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400">
              <p className="text-sm font-medium">กราฟแสดงแนวโน้ม 12 เดือน</p>
              <div className="flex gap-4 mt-2 text-xs">
                <span className="flex items-center gap-1">― Actual</span>
                <span className="flex items-center gap-1">--- Target</span>
              </div>
            </div>
          </div>

          {/* ขวา: Management Attention */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">MANAGEMENT ATTENTION</h3>
            <div className="space-y-3">
              {[
                { name: 'Skill Mix', val: '72%', status: 'bg-rose-500' },
                { name: 'Productivity', val: '118%', status: 'bg-rose-500' },
                { name: 'NEWS/EWS', val: '91%', status: 'bg-amber-400' },
                { name: 'Action overdue', val: '8 เรื่อง', status: 'bg-amber-400' },
              ].map((att, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-3 h-3 rounded-full ${att.status}`}></span>
                    <span className="font-medium text-gray-700">{att.name}</span>
                  </div>
                  <span className="font-bold text-gray-900">{att.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5. NURSING QUALITY & SAFETY */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">NURSING QUALITY & SAFETY</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { label: 'Fall (พลัดตกหกล้ม)', status: 'bg-emerald-500' },
              { label: 'PI (แผลกดทับ)', status: 'bg-amber-400' },
              { label: 'Med Error (ความคลาดเคลื่อนยา)', status: 'bg-rose-500' },
              { label: 'IV (ภาวะแทรกซ้อน IV)', status: 'bg-emerald-500' },
              { label: 'Unplanned CPR', status: 'bg-rose-500' },
              { label: 'Infection (การติดเชื้อ)', status: 'bg-emerald-500' },
            ].map((q, idx) => (
              <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col items-center text-center gap-2">
                <span className="text-xs font-semibold text-gray-600">{q.label}</span>
                <span className={`w-4 h-4 rounded-full ${q.status} shadow-sm`}></span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}