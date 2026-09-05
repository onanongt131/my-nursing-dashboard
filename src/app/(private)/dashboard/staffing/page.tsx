'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function StaffingDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  // กำหนดค่าเริ่มต้นเป็นวันปัจจุบันในรูปแบบ YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedShift, setSelectedShift] = useState('เวรดึก');

  const [summaryData, setSummaryData] = useState({
    totalStaff: '-', 
    actualOnDuty: 0,
    leaveCount: 12,
    shortageUnits: 0,
  });

  const [departmentStaffing, setDepartmentStaffing] = useState<any[]>([]);

  // รายการ Tabs สำหรับสลับหน้า
  const tabs = [
    { label: 'บุคลากรและสมรรถนะ', path: '/dashboard/staffing' },
    { label: 'Ward Command Center', path: '/dashboard/staffing/command-center' },
    { label: 'ตารางเวร', path: '/dashboard/staffing/schedule' },
    { label: 'ภาพรวมอัตรากำลัง', path: '/dashboard/staffing/overview' },
    { label: 'รายงานเวรตรวจการ', path: '/dashboard/staffing/inspection-report' }, // หน้าใหม่ที่เพิ่มเข้ามา
  ];

  useEffect(() => {
    async function fetchDailyStaffing() {
      try {
        setLoading(true);
        const supabase = createClient();

        // 1. ดึงข้อมูลรายชื่อหน่วยงานทั้งหมดจากตาราง departments
        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .select('*');

        if (deptError) {
          console.error('Error fetching departments:', deptError);
        }

        const deptMap = new Map();
        if (deptData) {
          deptData.forEach((d: any) => {
            const deptId = Number(d.id);
            const deptName = d.Department || d.department_name || d.name || `หน่วยงาน ID: ${d.id}`;
            deptMap.set(deptId, deptName);
            deptMap.set(String(d.id), deptName);
          });
        }

        // 2. ดึงข้อมูล daily_staffing ตามวันที่และเวรที่เลือก
        let query = supabase.from('daily_staffing').select('*');

        if (selectedDate) {
          query = query.eq('date', selectedDate);
        }
        if (selectedShift && selectedShift !== 'all') {
          query = query.eq('shift', selectedShift);
        }

        const { data: staffingData, error: staffingError } = await query;

        if (staffingError) {
          console.error('Supabase error:', staffingError);
        }

        let totalActual = 0;
        let warningCount = 0;
        const formattedData: any[] = [];

        // 3. กรองเฉพาะหน่วยงานที่มีข้อมูลเวรในวันนั้นๆ
        if (staffingData && staffingData.length > 0) {
          staffingData.forEach((item: any) => {
            const rawDeptId = Number(item.department_id || item.dept_id || item.id_department);
            const departmentName = deptMap.get(rawDeptId) || deptMap.get(String(rawDeptId)) || `หน่วยงาน ID: ${rawDeptId}`;

            const actual = (item.rn_count || 0) + (item.tn_count || 0);
            const required = item.required_staff || 0;
            const shortage = required > actual ? required - actual : 0;
            const status = shortage > 0 ? 'warning' : 'normal';

            // ยอดผู้ป่วย
            const patientCount = item.nursing_count ?? '-';

            // ประเภท (4+5)
            const s4 = Number(item.score_4) || 0;
            const s5 = Number(item.score_5) || 0;
            const sGt5 = Number(item.score_gt_5) || 0;
            const categorySum = s4 + s5 + sGt5;
            const category = (item.score_4 !== null || item.score_5 !== null || item.score_gt_5 !== null) ? categorySum : '-';

            // ดึงค่า High Flow, Ventilator, NP ตามชื่อคอลัมน์ในฐานข้อมูลจริง
            const highFlow = item.high_flow ?? 0;
            const ventilator = item.ventilator ?? 0;
            const np = item.np ?? 0;

            totalActual += actual;
            if (status === 'warning') {
              warningCount++;
            }

            formattedData.push({
              name: departmentName,
              required: required,
              actual: actual,
              shortage: shortage,
              status: status,
              patientCount: patientCount,
              category: category,
              highFlow: highFlow,
              ventilator: ventilator,
              np: np,
            });
          });
        }

        // 4. เรียงลำดับชื่อหน่วยงานตามตัวอักษร
        formattedData.sort((a, b) => a.name.localeCompare(b.name, 'th'));

        setDepartmentStaffing(formattedData);
        setSummaryData(prev => ({
          ...prev,
          actualOnDuty: totalActual,
          shortageUnits: warningCount,
        }));

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDailyStaffing();
  }, [selectedDate, selectedShift]);

  return (
    <div className="space-y-4">
      {/* ส่วนหัวข้อหน้าเว็บ พร้อมแถบ Tabs สลับหน้า */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          
          {/* หัวข้อและคำอธิบาย */}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-emerald-900">บุคลากรและสมรรถนะ (Staffing Overview)</h1>
            <p className="text-sm text-gray-500 mt-1">ติดตามข้อมูลอัตรากำลัง กำลังคนจริง และสถานการณ์การปฏิบัติงานภาพรวม</p>
          </div>

         {/* แถบ Tabs สลับหน้า */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {tabs.map((tab) => {
              const isActive = pathname === tab.path;
              return (
                <button
                  key={tab.path}
                  onClick={() => router.push(tab.path)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all shadow-xs whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-800 text-white shadow-emerald-900/20'
                      : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* Cards สรุปข้อมูลตัวเลขสำคัญ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">บุคลากรทั้งหมด</p>
            <h3 className="text-2xl font-extrabold text-emerald-900 mt-2">{summaryData.totalStaff} <span className="text-sm font-normal text-gray-500">คน</span></h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ปฏิบัติงานจริง (เวรปัจจุบัน)</p>
            <h3 className="text-2xl font-extrabold text-emerald-900 mt-2">{summaryData.actualOnDuty} <span className="text-sm font-normal text-gray-500">คน</span></h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2m-6 9l2 2 4-4" />
            </svg>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ลา / ศึกษาต่อ / อื่นๆ</p>
            <h3 className="text-2xl font-extrabold text-amber-600 mt-2">{summaryData.leaveCount} <span className="text-sm font-normal text-gray-500">คน</span></h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">หน่วยงานที่อัตรากำลังวิกฤต</p>
            <h3 className="text-2xl font-extrabold text-rose-600 mt-2">{summaryData.shortageUnits} <span className="text-sm font-normal text-gray-500">แห่ง</span></h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
      </div>

      {/* ตารางแสดงรายละเอียดกำลังพลแยกตามหน่วยงาน */}
      <div className="bg-white rounded-2xl shadow-xs border border-emerald-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h3 className="font-bold text-emerald-900">สถานะอัตรากำลังรายหน่วยงาน / หอผู้ป่วย</h3>
          
          {/* แถบตัวกรองวันที่และเวร */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-emerald-900">วันที่:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2.5 py-1 border border-emerald-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-emerald-900">เวร:</label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="px-2.5 py-1 border border-emerald-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700 bg-white"
              >
                <option value="all">ทุกเวร</option>
                <option value="เวรดึก">เวรดึก</option>
                <option value="เวรเช้า">เวรเช้า</option>
                <option value="เวรบ่าย">เวรบ่าย</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-emerald-900/5 text-emerald-900 text-xs uppercase tracking-wider font-semibold">
                <th className="px-6 py-3">หน่วยงาน / กลุ่มงาน</th>
                <th className="px-6 py-3 text-center">ยอดผู้ป่วย</th>
                <th className="px-6 py-3 text-center">ประเภท 4+5</th>
                <th className="px-6 py-3 text-center">High Flow</th>
                <th className="px-6 py-3 text-center">Ventilator</th>
                <th className="px-6 py-3 text-center">NP</th>
                <th className="px-6 py-3 text-center">ปฏิบัติงานจริง</th>
                <th className="px-6 py-3 text-center">อัตราตามเกณฑ์</th>
                <th className="px-6 py-3 text-center">ขาด / เกิน</th>
                <th className="px-6 py-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500">กำลังโหลดข้อมูลจากฐานข้อมูล...</td>
                </tr>
              ) : departmentStaffing.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                    ไม่พบข้อมูลอัตรากำลังในวันที่และเวรดังกล่าว
                  </td>
                </tr>
              ) : (
                departmentStaffing.map((item, index) => (
                  <tr key={index} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">{item.name}</td>
                    <td className="px-6 py-4 text-center text-gray-700">{item.patientCount}</td>
                    <td className="px-6 py-4 text-center text-gray-700">{item.category}</td>
                    <td className="px-6 py-4 text-center text-gray-700">{item.highFlow}</td>
                    <td className="px-6 py-4 text-center text-gray-700">{item.ventilator}</td>
                    <td className="px-6 py-4 text-center text-gray-700">{item.np}</td>
                    <td className="px-6 py-4 text-center font-semibold text-emerald-900">{item.actual}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{item.required}</td>
                    <td className="px-6 py-4 text-center">
                      {item.shortage > 0 ? (
                        <span className="text-rose-600 font-bold">ขาด {item.shortage}</span>
                      ) : (
                        <span className="text-emerald-600 font-medium">ปกติ</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.status === 'warning' ? (
                        <span className="px-2.5 py-1 text-xs font-semibold bg-rose-100 text-rose-700 rounded-full">ต้องเฝ้าระวัง</span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">สมดุล</span>
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