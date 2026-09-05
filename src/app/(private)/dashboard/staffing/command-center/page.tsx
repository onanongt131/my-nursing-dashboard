'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function WardCommandCenterPage() {
  const [loading, setLoading] = useState(true);
  const todayStr = new Date().toISOString().split('T')[0];
  
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedShift, setSelectedShift] = useState('เวรเช้า');
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  const [staffNames, setStaffNames] = useState<string>('-');

  const [wardData, setWardData] = useState({
    name: '-',
    patientCount: 0,
    occupancyRate: '0.0%',
    occupancyVal: 0,
    score4_5: 0,
    highFlow: 0,
    ventilator: 0,
    np: 0,
    admissionTotal: 0,
    dischargeTotal: 0,
    transferTotal: 0,
    shifts: [] as any[],
    acuityLevels: [
      { level: 1, name: 'ดูแลตนเองได้', count: 0, standardHours: 1.5, totalHours: 0, color: 'bg-emerald-500' },
      { level: 2, name: 'ต้องช่วยเหลือเล็กน้อย', count: 0, standardHours: 3.5, totalHours: 0, color: 'bg-cyan-500' },
      { level: 3, name: 'ต้องช่วยเหลือปานกลาง', count: 0, standardHours: 5.5, totalHours: 0, color: 'bg-amber-500' },
      { level: 4, name: 'ต้องช่วยเหลือมาก', count: 0, standardHours: 7.5, totalHours: 0, color: 'bg-orange-500' },
      { level: 5, name: 'วิกฤต', count: 0, standardHours: 12.0, totalHours: 0, color: 'bg-rose-500' },
    ],
  });

  useEffect(() => {
    async function initDepts() {
      const supabase = createClient();
      const { data: deptData } = await supabase.from('departments').select('*');

      if (deptData) {
        const validDepts = deptData.filter((d: any) => {
          const name = (d.Department || d.department_name || d.name || '').trim();
          const isOPD = name.toUpperCase().startsWith('OPD');
          const excludedNames = [
            'อายุรกรรมชาย 1',
            'พิเศษอายุรกรรมชั้น 4',
            'พิเศษอายุรกรรมชั้น 5',
            'ศูนย์ใจรักษ์',
            'ศูนย์ดูแลบาดแผล',
            'อายุรกรรมหญิง'
          ];
          const isExcluded = excludedNames.some(exc => name.includes(exc));
          return !isOPD && !isExcluded;
        });

        setDepartments(validDepts);
        if (validDepts.length > 0 && !selectedDeptId) {
          setSelectedDeptId(String(validDepts[0].id));
        }
      }
    }
    initDepts();
  }, []);

  useEffect(() => {
    async function fetchWardDetails() {
      if (!selectedDeptId) return;
      try {
        setLoading(true);
        const supabase = createClient();

        const currentDept = departments.find((d: any) => String(d.id) === selectedDeptId);
        const deptName = currentDept ? (currentDept.Department || currentDept.department_name || currentDept.name) : 'หอผู้ป่วย';
        const totalBeds = Number(currentDept?.total_beds || currentDept?.beds || currentDept?.bed_count || 0);

        const { data: staffingRows } = await supabase
          .from('daily_staffing')
          .select('*')
          .eq('department_id', selectedDeptId);

        let matchedRow = staffingRows?.find((r: any) => r.date === selectedDate && r.shift === selectedShift);
        if (!matchedRow && staffingRows && staffingRows.length > 0) {
          matchedRow = staffingRows[0];
        }

        if (matchedRow && (matchedRow.staff_names || matchedRow.staff || matchedRow.names)) {
          setStaffNames(matchedRow.staff_names || matchedRow.staff || matchedRow.names);
        } else {
          setStaffNames('ยังไม่มีรายชื่อผู้ปฏิบัติงานในเวรนี้');
        }

        const pCount = matchedRow?.nursing_count ?? 0;

        let calculatedOccupancy = 0;
        if (totalBeds > 0) {
          calculatedOccupancy = (pCount / totalBeds) * 100;
        }

        if (!matchedRow) {
          setWardData({
            name: deptName,
            patientCount: 0,
            occupancyRate: '0.0%',
            occupancyVal: 0,
            score4_5: 0,
            highFlow: 0,
            ventilator: 0,
            np: 0,
            admissionTotal: 0,
            dischargeTotal: 0,
            transferTotal: 0,
            shifts: [
              {
                shiftName: selectedShift,
                required: 0,
                rn: 0,
                pnNa: '-',
                staffMix: '0.0%',
                status: 'ไม่มีข้อมูล',
                statusBg: 'bg-slate-100 text-slate-500 border border-slate-200'
              }
            ],
            acuityLevels: [
              { level: 1, name: 'ดูแลตนเองได้', count: 0, standardHours: 1.5, totalHours: 0, color: 'bg-emerald-500' },
              { level: 2, name: 'ต้องช่วยเหลือเล็กน้อย', count: 0, standardHours: 3.5, totalHours: 0, color: 'bg-cyan-500' },
              { level: 3, name: 'ต้องช่วยเหลือปานกลาง', count: 0, standardHours: 5.5, totalHours: 0, color: 'bg-amber-500' },
              { level: 4, name: 'ต้องช่วยเหลือมาก', count: 0, standardHours: 7.5, totalHours: 0, color: 'bg-orange-500' },
              { level: 5, name: 'วิกฤต', count: 0, standardHours: 12.0, totalHours: 0, color: 'bg-rose-500' },
            ]
          });
          return;
        }

        const s1 = Number(matchedRow?.score_1) || 0;
        const s2 = Number(matchedRow?.score_2) || 0;
        const s3 = Number(matchedRow?.score_3) || 0;
        const s4 = Number(matchedRow?.score_4) || 0;
        const s5 = Number(matchedRow?.score_5) || 0;
        const sGt5 = Number(matchedRow?.score_gt_5) || 0;
        const total4_5 = s4 + s5 + sGt5;

        const hf = matchedRow?.high_flow ?? matchedRow?.HIGH_FLOW ?? 0;
        const vent = matchedRow?.ventilator ?? matchedRow?.VENTILATOR ?? 0;
        const npVal = matchedRow?.np ?? matchedRow?.NP ?? 0;

        const newAdm = Number(matchedRow?.new_admission) || Number(matchedRow?.ew_admission) || 0;
        const tIn = Number(matchedRow?.transfer_in) || 0;
        const dis = Number(matchedRow?.discharge) || 0;
        const tOut = Number(matchedRow?.transfer_out) || 0;
        const ref = Number(matchedRow?.refer) || 0;

        const admissionTotal = newAdm + tIn;
        const dischargeTotal = dis + tOut; 
        const transferTotal = ref;         

        const req = matchedRow?.required_staff || 4;
        const act = (matchedRow?.rn_count || 0) + (matchedRow?.tn_count || 0);
        const isNormal = act >= req;

        const currentStaffMixVal = act > 0 ? ((matchedRow?.rn_count || 0) / act) * 100 : 0;

        let shiftList = [
          {
            shiftName: selectedShift,
            required: req,
            rn: matchedRow?.rn_count || 0,
            pnNa: '-',
            staffMix: `${currentStaffMixVal.toFixed(1)}%`,
            status: isNormal ? 'ผ่าน' : 'ต้องแก้ไข',
            statusBg: isNormal ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'
          }
        ];

        setWardData({
          name: deptName,
          patientCount: pCount,
          occupancyRate: `${calculatedOccupancy.toFixed(1)}%`,
          occupancyVal: calculatedOccupancy,
          score4_5: total4_5,
          highFlow: hf,
          ventilator: vent,
          np: npVal,
          admissionTotal,
          dischargeTotal,
          transferTotal,
          shifts: shiftList,
          acuityLevels: [
            { level: 1, name: 'ดูแลตนเองได้', count: s1, standardHours: 1.5, totalHours: s1 * 1.5, color: 'bg-emerald-500' },
            { level: 2, name: 'ต้องช่วยเหลือเล็กน้อย', count: s2, standardHours: 3.5, totalHours: s2 * 3.5, color: 'bg-cyan-500' },
            { level: 3, name: 'ต้องช่วยเหลือปานกลาง', count: s3, standardHours: 5.5, totalHours: s3 * 5.5, color: 'bg-amber-500' },
            { level: 4, name: 'ต้องช่วยเหลือมาก', count: s4, standardHours: 7.5, totalHours: s4 * 7.5, color: 'bg-orange-500' },
            { level: 5, name: 'วิกฤต', count: s5 + sGt5, standardHours: 12.0, totalHours: (s5 + sGt5) * 12.0, color: 'bg-rose-500' },
          ]
        });

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchWardDetails();
  }, [selectedDeptId, selectedDate, selectedShift, departments]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 space-y-4 font-sans">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Header แถบบนสุด พร้อมโลโก้โรงพยาบาลวชิระภูเก็ต และปุ่มกลับหน้าภาพรวม */}
        <div className="flex flex-wrap items-center justify-between bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
          <div className="flex items-center space-x-3">
            <span className="bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-sm shadow-xs">N</span>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-sm font-bold text-emerald-900">กลุ่มภารกิจด้านการพยาบาล โรงพยาบาลวชิระภูเก็ต</h1>
                <a href="/dashboard/staffing" className="text-xs px-2.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-medium">
                  ← กลับหน้าภาพรวม
                </a>
              </div>
              <p className="text-xs text-gray-500">Ward Command Center - ระบบศูนย์สั่งการหอผู้ป่วยแบบเรียลไทม์</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-3 sm:mt-0">
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="bg-white border border-slate-300 text-slate-700 text-xs rounded-xl px-3 py-2 w-48 sm:w-56 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs truncate"
            >
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.Department || d.department_name || d.name}
                </option>
              ))}
            </select>

            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="bg-white border border-slate-300 text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            >
              <option value="เวรเช้า">เวรเช้า</option>
              <option value="เวรบ่าย">เวรบ่าย</option>
              <option value="เวรดึก">เวรดึก</option>
            </select>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border border-slate-300 text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />
          </div>
        </div>

        {/* Alert Banner / รายชื่อผู้ปฏิบัติงานประจำเวร */}
        <div className="bg-white border-l-4 border-emerald-500 p-4 rounded-xl flex items-center justify-between text-sm shadow-xs border-y border-r border-slate-200">
          <div>
            <span className="font-bold text-slate-900">{wardData.name}</span>
            <span className="text-slate-400 mx-2">|</span>
            <span className="text-slate-600">{selectedDate} - {selectedShift}</span>
            <span className="text-slate-400 mx-2">|</span>
            <span className="text-emerald-700 font-semibold">{staffNames}</span>
          </div>
          <span className="text-xs text-slate-400">ปรับปรุงล่าสุด {todayStr} • ข้อมูลจากการบันทึกในระบบ</span>
        </div>

        {/* Cards สรุปตัวเลขหลัก 4 ช่อง */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">ผู้ป่วยในหน่วยงาน</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-slate-900">{wardData.patientCount}</span>
              <span className="text-xs text-slate-500">ราย</span>
            </div>
            <span className="text-xs text-slate-400 mt-2 block">
              อัตราครองเตียง{' '}
              <strong className={wardData.occupancyVal > 100 ? 'text-rose-600' : 'text-blue-600'}>
                {wardData.occupancyRate}
              </strong>
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">ผู้ป่วยระดับ 4-5 / Ventilator / High Flow</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-slate-900">{wardData.score4_5}</span>
              <span className="text-xs text-slate-500">ราย (Vent: <strong className="text-rose-600">{wardData.ventilator}</strong> | HF: <strong className="text-amber-600">{wardData.highFlow}</strong>)</span>
            </div>
            <span className="text-xs text-amber-600 mt-2 block">เฝ้าระวัง 1:1 จำนวน 0 ราย</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">ค่า NP (Nursing Productivity)</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-emerald-600">{Number(wardData.np).toFixed(2)}</span>
              <span className="text-xs text-slate-500">%</span>
            </div>
            <span className="text-xs text-emerald-600 mt-2 block">สมรรถนะตามเกณฑ์กำหนด</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Admission / Discharge / Refer</span>
            <div className="grid grid-cols-3 gap-1 mt-2 text-center">
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Adm</span>
                <span className="text-base font-bold text-slate-800">{wardData.admissionTotal}</span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Dis</span>
                <span className="text-base font-bold text-slate-800">{wardData.dischargeTotal}</span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Trf</span>
                <span className="text-base font-bold text-slate-800">{wardData.transferTotal}</span>
              </div>
            </div>
            <span className="text-xs text-slate-400 mt-2 block">ข้อมูลรวมในวันนี้</span>
          </div>

        </div>

        {/* ส่วนล่าง: ตารางเปรียบเทียบเวร และ กราฟส่วนผสม Acuity */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Required เทียบ Actual รายเวร</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5">เวร</th>
                    <th className="py-2.5 text-center">ต้องการ (คน)</th>
                    <th className="py-2.5 text-center">RN จริง</th>
                    <th className="py-2.5 text-center">PN+NA</th>
                    <th className="py-2.5 text-center">Staff Mix</th>
                    <th className="py-2.5 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wardData.shifts.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 font-medium text-slate-700">{s.shiftName}</td>
                      <td className="py-3 text-center text-slate-600">{s.required}</td>
                      <td className="py-3 text-center text-slate-600">{s.rn}</td>
                      <td className="py-3 text-center text-slate-600">{s.pnNa}</td>
                      <td className="py-3 text-center text-slate-600">{s.staffMix}</td>
                      <td className="py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${s.statusBg}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">ส่วนผสมผู้ป่วยตามระดับ Acuity</h3>
            
            <div className="h-32 flex items-end justify-around gap-2 px-4 pt-4 bg-slate-50 rounded-xl border border-slate-200">
              {wardData.acuityLevels.map((lvl) => (
                <div key={lvl.level} className="flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[10px] text-slate-500 font-semibold">{lvl.count}</span>
                  <div 
                    style={{ height: lvl.count === 0 ? '0px' : `${Math.max(lvl.count * 14, 8)}px` }} 
                    className={`w-8 rounded-t-lg ${lvl.color} transition-all`}
                  ></div>
                  <span className="text-[10px] text-slate-500 mt-1">ระดับ {lvl.level}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}