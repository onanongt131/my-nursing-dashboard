'use client';
export const dynamic = 'force-dynamic'; 

import { useState, useEffect, useMemo } from 'react';
import { CheckCircle, XCircle, Loader2, LayoutDashboard, FolderKanban, Building2, Plus, LayoutGrid, ArrowLeft } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface KpiEntry {
  id: string;
  year: number;
  value: number;
  department_id: string;
}

interface Kpi {
  id: string;
  name: string;
  kpi_category: string;
  target_value: number;
  unit: string;
  kpi_entries?: KpiEntry[];
}

interface Department {
  id: number;
  Department: string;
  code: string;
}

interface UserProfile {
  id: string;
  role: 'Admin' | 'Executive' | 'Staff';
  department_id: string;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'part1' | 'part2' | 'part3'>('part1');
  const [groupKpis, setGroupKpis] = useState<Kpi[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedKpiId, setSelectedKpiId] = useState('');
  const [actualValue, setActualValue] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // รายชื่อหมวดหมู่ KPI ทั้ง 6 หมวดตามโครงสร้างมาตรฐานสาธารณสุข
  const kpiCategories = [
    "หมวด 1 ผลลัพธ์ด้านการนำองค์กร",
    "หมวด 2 ผลลัพธ์ด้านกลยุทธ์",
    "หมวด 3 ผลลัพธ์ด้านผู้ใช้บริการ",
    "หมวด 4 ผลลัพธ์ด้านการวัด วิเคราะห์ และจัดการความรู้",
    "หมวด 5 ผลลัพธ์ด้านกำลังคน",
    "หมวด 6 ผลลัพธ์ด้านการปฏิบัติการ"
  ];

  // คำนวณสถิติความสำเร็จสำหรับแสดงผลกล่อง 3 คอลัมน์ด้านบน
  const stats = useMemo(() => {
    if (!groupKpis || groupKpis.length === 0) {
      return { total: 0, passed: 0, failed: 0, percent: 0 };
    }
    const passed = groupKpis.filter(kpi => {
      if (!kpi.kpi_entries || kpi.kpi_entries.length === 0) return false;
      const latest = [...kpi.kpi_entries].sort((a, b) => b.year - a.year)[0];
      return latest && latest.value >= (kpi.target_value || 0);
    }).length;
    
    return {
      total: groupKpis.length,
      passed,
      failed: groupKpis.length - passed,
      percent: Math.round((passed / groupKpis.length) * 100)
    };
  }, [groupKpis]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          if (profile) setUserProfile(profile);
        }
        const { data: allKpis, error: kpiError } = await supabase.from('kpis').select('*, kpi_entries(*)');
        if (kpiError) throw new Error(kpiError.message);
        setGroupKpis(allKpis || []);

        const { data: allDeps } = await supabase.from('departments').select('*');
        setDepartments(allDeps || []);
      } catch (err: any) {
        setError(err?.message || "ไม่สามารถเชื่อมต่อฐานข้อมูลได้");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [submitSuccess]);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.department_id || !selectedKpiId || !actualValue) return;
    try {
      const { error: insertError } = await supabase.from('kpi_entries').insert([{
        kpi_id: selectedKpiId,
        department_id: userProfile.department_id,
        year: new Date().getFullYear(),
        value: parseFloat(actualValue),
      }]);
      if (insertError) throw insertError;
      setSubmitSuccess(prev => !prev);
      setSelectedKpiId('');
      setActualValue('');
      alert("บันทึกข้อมูลผลงานสำเร็จ!");
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-gray-50">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
        <p className="text-gray-600 font-medium">กำลังเปิดระบบควบคุม KPI...</p>
      </div>
    );
  }

  const myDepartmentName = (departments && departments.length > 0 && userProfile?.department_id)
    ? (departments.find(d => String(d.id) === String(userProfile.department_id))?.Department || 'ไม่ระบุหน่วยงาน')
    : 'กำลังโหลดข้อมูลหน่วยงาน...';

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 bg-gray-50/50 min-h-screen">
      
      {/* 🧭 แถบด้านบนและปุ่มสลับเมนู 3 ส่วน */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 gap-4">
        <div>
          <button className="flex items-center text-sm text-gray-500 hover:text-gray-700 font-medium mb-1">
            <ArrowLeft className="w-4 h-4 mr-1" /> กลับหน้าหลัก
          </button>
          <h1 className="text-2xl font-bold text-gray-800">กลุ่มภารกิจด้านการพยาบาล</h1>
          <p className="text-sm text-gray-500">ผลการติดตามตัวชี้วัดภาพรวม ({stats.total} ตัวชี้วัด)</p>
        </div>

        <div className="flex bg-white p-1 rounded-xl border shadow-sm gap-1 self-start md:self-center">
          <button onClick={() => setActiveTab('part1')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'part1' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            ส่วนที่ 1: Dashboard ภาพรวม
          </button>
          <button onClick={() => setActiveTab('part2')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'part2' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            ส่วนที่ 2: รายหมวดหมู่ (6 หมวด)
          </button>
          <button onClick={() => setActiveTab('part3')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'part3' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            ส่วนที่ 3: รายหน่วยงาน
          </button>
        </div>
      </div>

                {/* ========================================================================= */}
          {/* รายการแสดงสรุปผลงานตารางรวมด้านล่าง (ส่วนที่ 1 ฉบับเต็ม) */}
          {/* ========================================================================= */}
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
              <div>
                <h3 className="font-bold text-gray-800 text-base">ตารางประเมินผลงานสรุปภาพรวม</h3>
                <p className="text-xs text-gray-500">ข้อมูลติดตามตัวชี้วัดล่าสุดของกลุ่มภารกิจด้านการพยาบาล</p>
              </div>
              <div className="flex items-center space-x-4 text-xs font-semibold">
                <span className="flex items-center text-green-600">
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full mr-1.5"></span> ผ่านเกณฑ์
                </span>
                <span className="flex items-center text-red-500">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full mr-1.5"></span> ไม่ผ่านเกณฑ์
                </span>
              </div>
            </div>

            <div className="overflow-x-auto text-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b text-gray-600 font-bold text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-2/4">ชื่อตัวชี้วัดหลัก</th>
                    <th className="py-3.5 px-4 w-1/4">เป้าหมายที่กำหนด</th>
                    <th className="py-3.5 px-4 w-1/4 text-center">ผลการดำเนินงานล่าสุด</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-700">
                  {groupKpis.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-gray-400 text-xs">
                        ยังไม่มีรายการตัวชี้วัด KPI บันทึกอยู่ในระบบฐานข้อมูลปัจจุบัน
                      </td>
                    </tr>
                  ) : (
                    groupKpis.map(kpi => {
                      // 🔍 ค้นหาและเรียงลำดับเพื่อดึงผลงานปีล่าสุดของตัวชี้วัดนี้
                      const latestEntry = kpi.kpi_entries && kpi.kpi_entries.length > 0
                        ? [...kpi.kpi_entries].sort((a, b) => b.year - a.year)[0]
                        : null;

                      // 🧮 ตรวจสอบเงื่อนไขการผ่านเกณฑ์ (ผลงานล่าสุดต้องมากกว่าหรือเท่ากับเป้าหมาย)
                      const isPassed = latestEntry && latestEntry.value >= kpi.target_value;

                      return (
                        <tr key={kpi.id} className="hover:bg-gray-50/80 transition-colors group">
                          <td className="py-3.5 px-4 font-medium text-gray-800 group-hover:text-purple-700 transition-colors">
                            {kpi.name}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-gray-600">
                            {kpi.target_value.toLocaleString()} <span className="text-xs font-normal text-gray-400">{kpi.unit}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {latestEntry ? (
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                isPassed 
                                  ? 'bg-green-50 text-green-700 border border-green-200' 
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isPassed ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                {latestEntry.value.toLocaleString()} {kpi.unit}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs italic bg-gray-100 px-2.5 py-1 rounded-md">
                                ยังไม่มีข้อมูลบันทึก
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

                {/* ========================================================================= */}
      {/* ส่วนที่ 2: เมนูแสดงรายหมวด (จัดโครงสร้างแยกกล่องบล็อกครบ 6 หมวดฉบับเต็ม) */}
      {/* ========================================================================= */}
      {activeTab === 'part2' && (
        <div className="animate-fadeIn space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-3 gap-2">
            <div>
              <h2 className="text-xl font-bold text-gray-800">แยกตามหมวดหมู่ผลลัพธ์องค์กร</h2>
              <p className="text-xs text-gray-500">สรุปคะแนนการดำเนินงานแยกตาม 6 หมวดหมู่มาตรฐานสาธารณสุข</p>
            </div>
            {/* ตรวจสิทธิ์: แสดงปุ่มเพิ่มข้อมูลเฉพาะกลุ่ม Admin / Executive เท่านั้น */}
            {userProfile?.role !== 'Staff' && (
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm active:scale-95">
                <Plus className="w-3.5 h-3.5" /> <span>สร้างหมวดหมู่ / เพิ่มเป้าหมาย KPI</span>
              </button>
            )}
          </div>
          
          {/* ตรรกะล็อกความปลอดภัยสำหรับพนักงานทั่วไป (Staff) ให้ดูได้แบบ Read-only หรือคุมระดับการเข้าถึง */}
          {userProfile?.role === 'Staff' && (
            <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 text-blue-800 text-xs font-medium">
              ℹ️ บัญชีของคุณเข้าใช้งานในสิทธิ์เจ้าหน้าที่ปฏิบัติการทั่วไป (Staff) สามารถรับชมรายงานสถิติแยกรายหมวดหมู่ได้แบบอ่านอย่างเดียว
            </div>
          )}

          {/* 📊 บล็อก Grid แสดงกล่องทั้ง 6 หมวดหมู่แบบสมบูรณ์ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kpiCategories.map((category, index) => {
              // 🔍 1. กรองหา KPI ทั้งหมดที่จัดอยู่ในหมวดนี้ (ดักจับเช็คคำนำหน้า เช่น หมวด 1, หมวด 2)
              const currentKpis = groupKpis.filter(k => 
                k.kpi_category && k.kpi_category.includes(category.substring(0, 6))
              );

              // 🧮 2. คำนวณหาจำนวน KPI ภายในหมวดที่ทำผลงานบรรลุตามเป้าหมาย (Passed)
              const passedCount = currentKpis.filter(kpi => {
                if (!kpi.kpi_entries || kpi.kpi_entries.length === 0) return false;
                const latest = [...kpi.kpi_entries].sort((a, b) => b.year - a.year)[0];
                return latest && latest.value >= kpi.target_value;
              }).length;

              // 📈 3. หาเปอร์เซ็นต์ความสำเร็จของหมวดหมู่เพื่อนำไปวาดหลอด Progress Bar
              const progressPercent = currentKpis.length > 0 
                ? Math.round((passedCount / currentKpis.length) * 100) 
                : 0;

              return (
                <div key={category} className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col justify-between hover:shadow-md hover:border-purple-200 transition-all duration-300 group">
                  <div className="space-y-3">
                    {/* ส่วนหัวของแต่ละกล่องหมวดหมู่ */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 max-w-[80%]">
                        <h3 className="font-bold text-gray-800 text-sm leading-snug group-hover:text-purple-700 transition-colors">
                          {category}
                        </h3>
                        <p className="text-xs text-gray-400 font-medium">
                          มีทั้งหมด <strong className="text-gray-600 font-bold">{currentKpis.length}</strong> ตัวชี้วัดย่อย
                        </p>
                      </div>
                      <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl font-bold text-xs">
                        ม.{index + 1}
                      </div>
                    </div>

                    {/* รายการตัวชี้วัดย่อยแอบซ่อนแสดงสถานะในกล่อง */}
                    <div className="space-y-1.5 pt-2 border-t max-h-32 overflow-y-auto">
                      {currentKpis.length === 0 ? (
                        <p className="text-gray-400 text-[11px] italic py-2">ยังไม่มีการผูกตัวชี้วัดในหมวดนี้</p>
                      ) : (
                        currentKpis.map(kpi => {
                          const latest = kpi.kpi_entries && [...kpi.kpi_entries].sort((a,b)=>b.year-a.year)[0];
                          const isKpiPassed = latest && latest.value >= kpi.target_value;
                          return (
                            <div key={kpi.id} className="flex justify-between items-center text-xs bg-gray-50/50 p-2 rounded-lg">
                              <span className="text-gray-600 truncate max-w-[65%]" title={kpi.name}>{kpi.name}</span>
                              <span className={`font-bold shrink-0 ${isKpiPassed ? 'text-green-600' : 'text-red-500'}`}>
                                {latest ? `${latest.value}/${kpi.target_value}` : `เป้า ${kpi.target_value}`}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  
                  {/* หลอดแถบความคืบหน้าแสดงสัดส่วนการผ่านเกณฑ์ด้านล่างสุดของกล่อง */}
                  <div className="space-y-1.5 pt-4">
                    <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
                      <span>ผลลัพธ์การดำเนินงาน</span>
                      <span className="font-bold text-gray-800">
                        {passedCount}/{currentKpis.length} ({progressPercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-700 ease-out ${
                          progressPercent >= 50 ? 'bg-green-500' : progressPercent >= 20 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

            {/* ========================================================================= */}
      {/* ส่วนที่ 3: แสดงรายหน่วยงาน (แบบฟอร์มลงคะแนนและกรองสิทธิ์ดูผลประวัติแยกฝั่งชัดเจน ฉบับเต็ม) */}
      {/* ========================================================================= */}
      {activeTab === 'part3' && (
        <div className="animate-fadeIn grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 📝 ฝั่งซ้าย: แบบฟอร์มลงบันทึกคะแนนผลงานจริง (Actual) ประจำปีงบประมาณ */}
          <div className="bg-white p-6 rounded-2xl border shadow-sm lg:col-span-1 h-fit">
            <div className="border-b pb-2 mb-4">
              <h2 className="text-lg font-bold text-gray-800">ฟอร์มส่งบันทึกเล่มผลงาน</h2>
              <p className="text-xs text-purple-600 font-bold mt-1">สังกัดหน่วยงาน: {myDepartmentName}</p>
            </div>
            
            <form onSubmit={handleAddEntry} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  เลือกเป้าหมายตัวชี้วัด KPI
                </label>
                <select 
                  required 
                  value={selectedKpiId} 
                  onChange={(e) => setSelectedKpiId(e.target.value)} 
                  className="w-full px-3 py-2.5 border rounded-xl bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                >
                  <option value="">-- กรุณาเลือกรายการตัวชี้วัด --</option>
                  {groupKpis.map(k => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  ผลงานทำได้จริง (Actual Value)
                </label>
                <input 
                  type="number" 
                  step="any" 
                  required 
                  placeholder="ระบุตัวเลขผลคะแนนที่ทำได้..." 
                  value={actualValue} 
                  onChange={(e) => setActualValue(e.target.value)} 
                  className="w-full px-3 py-2.5 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-sm active:scale-95 flex items-center justify-center space-x-1"
              >
                <span>ส่งบันทึกคะแนนตัวชี้วัด</span>
              </button>
            </form>
          </div>

          {/* 📊 ฝั่งขวา: ตารางแสดงผลงานย้อนหลัง (กรองระดับความปลอดภัยสูงสุด พนักงานแผนกอื่นจะมองไม่เห็น) */}
          <div className="bg-white p-6 rounded-2xl border shadow-sm lg:col-span-2">
            <div className="border-b pb-2 mb-4">
              <h2 className="text-lg font-bold text-gray-800">ผลการดำเนินงานรายหน่วยงานย้อนหลัง</h2>
              <p className="text-xs text-gray-400 mt-1">ระบบคัดกรองความปลอดภัย: แสดงข้อมูลเฉพาะแถวของ {myDepartmentName}</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b text-gray-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-3/5">ชื่อตัวชี้วัด KPI</th>
                    <th className="py-3 px-4 w-1/5 text-center">ปีงบประมาณ</th>
                    <th className="py-3 px-4 w-1/5 text-center">ผลงานที่กรอกบันทึก</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-700">
                  {groupKpis.flatMap(kpi => 
                    (kpi.kpi_entries || [])
                      // 🔒 ฟังก์ชันเช็คไอดีแผนก: บังคับแปลงเป็น String ทั้งคู่เพื่อป้องกันปัญหาชนิดข้อมูลหลุดตำแหน่งบน Vercel
                      .filter(entry => String(entry.department_id) === String(userProfile?.department_id))
                      .map(entry => (
                        <tr key={entry.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-gray-800">{kpi.name}</td>
                          <td className="py-3.5 px-4 text-center text-gray-500 font-semibold">{entry.year}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-block bg-purple-50 text-purple-700 font-black px-3 py-1 rounded-lg border border-purple-100 min-w-[70px]">
                              {entry.value.toLocaleString()} <span className="text-[10px] font-normal text-purple-400">{kpi.unit}</span>
                            </span>
                          </td>
                        </tr>
                      ))
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-gray-400 text-xs italic bg-gray-50/30">
                        ยังไม่มีรายการบันทึกผลงานของหน่วยงานนี้ในฐานข้อมูลรอบปีปัจจุบัน
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div> /* 👈 ปิด <div className="space-y-6 max-w-7xl mx-auto p-4..."> ใหญ่สุดของหน้าจอ */
  ); /* 👈 ปิดคำสั่ง return ( ... ) */
} /* 👈 ปิดปีกกาตัวสุดท้ายของฟังก์ชัน DashboardPage() */
