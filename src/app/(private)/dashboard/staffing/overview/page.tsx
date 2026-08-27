'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Activity, 
  Calendar 
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function StaffingOverviewPage() {
  const [selectedWard, setSelectedWard] = useState('all');
  const [selectedShift, setSelectedShift] = useState('เวรเช้า');

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalPatients: 0,
    wardCount: 0,
    totalRequiredHours: 0,
    totalActualHours: 0,
    avgProductivity: 0,
    totalFteGap: 0,
    activeAlerts: 0,
    criticalAlerts: 0,
  });

  const [departmentList, setDepartmentList] = useState<any[]>([]);
  const [wardsFilterOptions, setWardsFilterOptions] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const supabase = createClient();

        const { data: deptData, error: deptError } = await supabase.from('departments').select('*');
        if (deptError) {
          console.error('Error fetching departments:', deptError);
        }

        const deptMap = new Map();
        if (deptData) {
          const sortedDeptData = deptData.sort((a: any, b: any) => {
            return (a.Department || '').localeCompare(b.Department || '', 'th');
          });

          sortedDeptData.forEach((d: any) => {
            const deptName = d.Department || `หน่วยงาน ID: ${d.id}`;
            deptMap.set(Number(d.id), deptName);
          });
          setWardsFilterOptions(sortedDeptData);
        }

        let query = supabase.from('daily_staffing').select('*');

        if (selectedDate) {
          query = query.eq('date', selectedDate);
        }
        if (selectedShift && selectedShift !== 'all') {
          query = query.eq('shift', selectedShift);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching daily_staffing:', error);
          setLoading(false);
          return;
        }

        if (data && data.length > 0) {
          let patientsSum = 0;
          let reqHoursSum = 0;
          let actHoursSum = 0;
          let fteGapSum = 0;
          let productivitySum = 0;
          const formattedDepts: any[] = [];

          data.forEach((item: any) => {
            const deptIdNum = Number(item.department_id);
            const deptName = deptMap.get(deptIdNum) || `หน่วยงาน ID: ${item.department_id}`;

            const patientCount = Number(item.nursing_count || 0);
            const npValue = Number(item.np || 0);

            const requiredStaff = Number(item.required_staff || 0);
            const rnCount = Number(item.rn_count || 0);
            const tnCount = Number(item.tn_count || 0);
            const actualStaffCount = rnCount + tnCount;

            const requiredHours = requiredStaff * 8;
            const actualHours = actualStaffCount * 8;
            const gap = requiredStaff - actualStaffCount;

            patientsSum += patientCount;
            reqHoursSum += requiredHours;
            actHoursSum += actualHours;
            fteGapSum += gap;
            productivitySum += npValue;

            const wisnVal = requiredStaff > 0 ? (actualStaffCount / requiredStaff).toFixed(2) : '0.00';

            if (selectedWard === 'all' || String(item.department_id) === selectedWard) {
              formattedDepts.push({
                name: deptName,
                patients: patientCount,
                requiredHours: requiredHours,
                actualHours: actualHours,
                productivity: npValue.toFixed(1),
                requiredFte: requiredStaff.toFixed(2),
                actualFte: actualStaffCount.toFixed(2),
                gap: gap.toFixed(2),
                wisn: wisnVal,
                status: gap > 0 ? 'กำลังคนต่ำกว่าความต้องการตามภาระงาน' : 'สมดุล',
              });
            }
          });

          formattedDepts.sort((a, b) => a.name.localeCompare(b.name, 'th'));

          const avgProd = formattedDepts.length > 0 ? (productivitySum / formattedDepts.length).toFixed(1) : '0';

          setDashboardData({
            totalPatients: patientsSum,
            wardCount: formattedDepts.length,
            totalRequiredHours: reqHoursSum,
            totalActualHours: actHoursSum,
            avgProductivity: Number(avgProd),
            totalFteGap: Number(fteGapSum.toFixed(2)),
            activeAlerts: formattedDepts.filter(i => Number(i.gap) > 0).length,
            criticalAlerts: formattedDepts.filter(i => Number(i.gap) > 2).length,
          });

          setDepartmentList(formattedDepts);
        } else {
          setDashboardData({
            totalPatients: 0,
            wardCount: 0,
            totalRequiredHours: 0,
            totalActualHours: 0,
            avgProductivity: 0,
            totalFteGap: 0,
            activeAlerts: 0,
            criticalAlerts: 0,
          });
          setDepartmentList([]);
        }

      } catch (err) {
        console.error('Error loading staffing overview:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [selectedDate, selectedShift, selectedWard]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6 font-sans">
      
      {/* ส่วนหัวแถบเลือก Ward, Shift, Date */}
      <div className="flex flex-wrap items-center justify-between bg-white p-4 rounded-2xl border border-emerald-100 mb-6 shadow-xs">
        <div className="flex items-center space-x-3">
          <span className="bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-sm shadow-xs">N</span>
          <div>
            <h1 className="text-sm font-bold text-emerald-900">โรงพยาบาลวชิระภูเก็ต</h1>
            <p className="text-xs text-gray-500">ระบบบริหารอัตรากำลังพยาบาล</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 mt-3 md:mt-0">
          <select 
            value={selectedWard} 
            onChange={(e) => setSelectedWard(e.target.value)}
            className="bg-gray-50 text-gray-700 text-xs px-3 py-2 rounded-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">ทุกหอผู้ป่วย / หน่วยงาน</option>
            {wardsFilterOptions.map((ward) => (
              <option key={ward.id} value={String(ward.id)}>
                {ward.Department}
              </option>
            ))}
          </select>

          <select 
            value={selectedShift} 
            onChange={(e) => setSelectedShift(e.target.value)}
            className="bg-gray-50 text-gray-700 text-xs px-3 py-2 rounded-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="เวรดึก">เวรดึก</option>
            <option value="เวรเช้า">เวรเช้า</option>
            <option value="เวรบ่าย">เวรบ่าย</option>
          </select>

          <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs text-gray-700">
            <Calendar className="w-4 h-4 mr-2 text-emerald-700" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-gray-700 focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* แถบแจ้งสถานะการเชื่อมต่อ */}
      <div className="bg-emerald-50/60 border border-emerald-200 px-4 py-2.5 rounded-xl mb-6 text-xs flex flex-wrap items-center justify-between text-emerald-900">
        <div>
          แสดงข้อมูลอัตรากำลังประจำวันที่ <span className="font-semibold">{selectedDate}</span>
        </div>
        <div className="text-emerald-700 flex items-center mt-1 sm:mt-0 font-medium">
          <Activity className="w-3.5 h-3.5 mr-1" /> พร้อมใช้งาน
        </div>
      </div>

      {/* KPI Cards โทนสว่าง */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border border-emerald-100 p-4 rounded-2xl shadow-xs">
          <p className="text-xs text-gray-500 mb-1">ยอดผู้ป่วย</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-emerald-900">{dashboardData.totalPatients}</span>
            <span className="text-xs text-gray-500">ราย</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">{dashboardData.wardCount} หน่วยงาน</p>
        </div>

        <div className="bg-white border border-emerald-100 p-4 rounded-2xl shadow-xs">
          <p className="text-xs text-gray-500 mb-1">Required Nursing Hours</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-emerald-900">{dashboardData.totalRequiredHours}</span>
            <span className="text-xs text-gray-500">ชม.</span>
          </div>
          <p className="text-[11px] text-emerald-600 mt-2">Actual: {dashboardData.totalActualHours} ชม.</p>
        </div>

        <div className="bg-white border border-emerald-100 p-4 rounded-2xl shadow-xs">
          <p className="text-xs text-gray-500 mb-1">Productivity</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-emerald-700">{dashboardData.avgProductivity}</span>
            <span className="text-xs text-emerald-700">%</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">ค่าเฉลี่ยจากฟิลด์ np</p>
        </div>

        <div className="bg-white border border-emerald-100 p-4 rounded-2xl shadow-xs">
        <p className="text-xs text-gray-500 mb-1">FTE Gap รวม</p>
        <div className="flex items-baseline space-x-2">
            <span className={`text-2xl font-extrabold ${
            Number(dashboardData.totalFteGap) < 0 ? 'text-blue-600' : 'text-red-600'
            }`}>
            {dashboardData.totalFteGap}
            </span>
            <span className="text-xs text-gray-500">FTE</span>
        </div>
        <p className="text-[11px] text-rose-500 mt-2">ผลต่างกำลังคน</p>
        </div>

        <div className="bg-white border border-emerald-100 p-4 rounded-2xl shadow-xs">
          <p className="text-xs text-gray-500 mb-1">แจ้งเตือนที่ยังเปิดอยู่</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-rose-600">{dashboardData.activeAlerts}</span>
            <span className="text-xs text-gray-500">รายการ</span>
          </div>
          <p className="text-[11px] text-amber-600 mt-2">ระดับ Critical {dashboardData.criticalAlerts} รายการ</p>
        </div>
      </div>

      {/* ตารางแสดงข้อมูลรายหน่วยงาน */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-xs">
        <h2 className="text-sm font-bold text-emerald-900 mb-1">หน่วยงานที่ต้องให้ความสำคัญ</h2>
        

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-emerald-900 bg-emerald-50/50 font-semibold">
                <th className="py-3 px-4 rounded-l-xl">หน่วยงาน</th>
                <th className="py-3 px-2 text-center">ยอดผู้ป่วย</th>
                <th className="py-3 px-2 text-center">Required (ชม.)</th>
                <th className="py-3 px-2 text-center">Actual (ชม.)</th>
                <th className="py-3 px-2 text-center">Productivity</th>
                <th className="py-3 px-2 text-center">Required FTE</th>
                <th className="py-3 px-2 text-center">Actual FTE</th>
                <th className="py-3 px-2 text-center">Gap</th>
                <th className="py-3 px-2 text-center">WISN</th>
                <th className="py-3 px-4 rounded-r-xl">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-400">กำลังโหลดข้อมูล...</td>
                </tr>
              ) : departmentList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-400">ไม่พบข้อมูลอัตรากำลังในวันที่เลือก</td>
                </tr>
              ) : (
                departmentList.map((item, index) => (
                  <tr key={index} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-emerald-900">{item.name}</td>
                    <td className="py-3 px-2 text-center">{item.patients}</td>
                    <td className="py-3 px-2 text-center">{item.requiredHours}</td>
                    <td className="py-3 px-2 text-center">{item.actualHours}</td>
                    <td className="py-3 px-2 text-center text-emerald-700 font-medium">{item.productivity}%</td>
                    <td className="py-3 px-2 text-center">{item.requiredFte}</td>
                    <td className="py-3 px-2 text-center">{item.actualFte}</td>
                    <td className={`text-right pr-2 tabular-nums ${
                        Number(item.gap) < 0 
                            ? 'text-blue-600' 
                            : Number(item.gap) > 0 
                            ? 'text-red-600' 
                            : 'text-gray-800'
                        }`}>
                        {Number(item.gap).toFixed(2)}
                        </td>
                    <td className="py-3 px-2 text-center">{item.wisn}</td>
                    <td className="py-3 px-4">
                      {item.status === 'สมดุล' ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-medium">
                          {item.status}
                        </span>
                      ) : (
                        <span className="bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-1 rounded-full text-[10px] font-medium">
                          {item.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}