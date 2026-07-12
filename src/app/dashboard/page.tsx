'use client';
export const dynamic = 'force-dynamic'; 

import { useState, useEffect, useMemo } from 'react';
import { CheckCircle, XCircle, Loader2, LayoutDashboard, FolderKanban, Building2, Plus, LayoutGrid } from 'lucide-react';
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
  id: string;
  department_name: string;
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

  // สเตตสำหรับ ฟอร์มบันทึกข้อมูล (ส่วนที่ 3)
  const [selectedKpiId, setSelectedKpiId] = useState('');
  const [actualValue, setActualValue] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // คำนวณสรุปสถิติสำหรับ ส่วนที่ 1
  const stats = useMemo(() => {
    const passed = groupKpis.filter(kpi => {
      if (!kpi.kpi_entries?.length) return false;
      const latest = [...kpi.kpi_entries].sort((a, b) => b.year - a.year)[0];
      return latest && latest.value >= (kpi.target_value || 0);
    }).length;
    
    return {
      passed,
      failed: groupKpis.length - passed,
      percent: groupKpis.length > 0 ? Math.round((passed / groupKpis.length) * 100) : 0
    };
  }, [groupKpis]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // 1. ดึงข้อมูล User Session ปัจจุบันเพื่อเช็คสิทธิ์ (Role) จากฐานข้อมูล
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (profile) setUserProfile(profile);
        }

        // 2. ดึงข้อมูล KPI พร้อมรายการผลงาน
        const { data: allKpis, error: kpiError } = await supabase
          .from('kpis')
          .select('*, kpi_entries(*)');
        if (kpiError) throw new Error(kpiError.message);
        setGroupKpis(allKpis || []);

        // 3. ดึงรายชื่อหน่วยงานทั้งหมด
        const { data: allDeps } = await supabase.from('departments').select('*');
        setDepartments(allDeps || []);

      } catch (err: any) {
        console.error("Dashboard error:", err);
        setError(err?.message || "ไม่สามารถดึงข้อมูลระบบได้");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [submitSuccess]);

  // ฟังก์ชันลงบันทึกข้อมูลผลงานประจำหน่วยงาน (ส่วนที่ 3)
  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.department_id || !selectedKpiId || !actualValue) return;

    try {
      const { error: insertError } = await supabase
        .from('kpi_entries')
        .insert([{
          kpi_id: selectedKpiId,
          department_id: userProfile.department_id,
          year: new Date().getFullYear(),
          value: parseFloat(actualValue),
        }]);

      if (insertError) throw insertError;
      setSubmitSuccess(prev => !prev);
      setSelectedKpiId('');
      setActualValue('');
      alert("บันทึกข้อมูลผลงานของหน่วยงานสำเร็จ!");
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-gray-50">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
        <p className="text-gray-600 font-medium">กำลังโหลดข้อมูลระบบทั้ง 3 ส่วน...</p>
      </div>
    );
  }

  if (error) return <div className="p-8 text-red-600 font-bold bg-red-50 border rounded-xl">{error}</div>;

  const myDepartmentName = departments.find(d => d.id === userProfile?.department_id)?.department_name || 'ไม่ระบุหน่วยงาน';

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      {/* 🧭 แถบสลับเมนู 3 ส่วนหลัก */}
      <div className="flex flex-wrap border-b border-gray-200 gap-2">
        <button
          onClick={() => setActiveTab('part1')}
          className={`flex items-center space-x-2 py-3 px-4 font-semibold text-sm border-b-2 transition ${activeTab === 'part1' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>1. แดชบอร์ดภาพรวม (ทุกคน)</span>
        </button>

        <button
          onClick={() => setActiveTab('part2')}
          className={`flex items-center space-x-2 py-3 px-4 font-semibold text-sm border-b-2 transition ${activeTab === 'part2' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <FolderKanban className="w-4 h-4" />
          <span>2. KPI ตามหมวด (ผู้บริหาร/ผู้รับผิดชอบ)</span>
        </button>

        <button
          onClick={() => setActiveTab('part3')}
          className={`flex items-center space-x-2 py-3 px-4 font-semibold text-sm border-b-2 transition ${activeTab === 'part3' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Building2 className="w-4 h-4" />
          <span>3. บันทึกข้อมูลหน่วยงาน (เฉพาะตนเอง)</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* ส่วนที่ 1: เมนูแสดงแดชบอร์ดสรุป KPI (ทุกคนเข้าดูได้แบบ Read-only) */}
      {/* ========================================================= */}
      {activeTab === 'part1' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-green-50 rounded-xl text-green-600"><CheckCircle className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-medium text-gray-500">KPI ภาพรวมที่ผ่านเกณฑ์</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.passed} รายการ</h3>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-red-50 rounded-xl text-red-600"><XCircle className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-medium text-gray-500">KPI ภาพรวมที่ไม่ผ่านเกณฑ์</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.failed} รายการ</h3>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-purple-50 rounded-xl text-purple-600"><LayoutDashboard className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-medium text-gray-500">คิดเป็นความสำเร็จ</p>
                <h3 className="text-2xl font-bold text-purple-600">{stats.percent}%</h3>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4">ตารางรายงานสรุปตัวชี้วัด KPI ของทุกกลุ่มงาน</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b text-gray-600 font-bold">
                    <th className="py-3 px-4">ชื่อตัวชี้วัด KPI</th>
                    <th className="py-3 px-4">หมวดหมู่</th>
                    <th className="py-3 px-4 text-center">เป้าหมาย</th>
                    <th className="py-3 px-4 text-center">ผลงานล่าสุด</th>
                    <th className="py-3 px-4 text-center">หน่วยนับ</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {groupKpis.map(kpi => {
                    const latestEntry = kpi.kpi_entries && [...kpi.kpi_entries].sort((a,b) => b.year - a.year)[0];
                    return (
                      <tr key={kpi.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-800">{kpi.name}</td>
                        <td className="py-3 px-4 text-gray-500">{kpi.kpi_category}</td>
                        <td className="py-3 px-4 text-center font-bold text-gray-700">{kpi.target_value}</td>
                        <td className={`py-3 px-4 text-center font-bold ${latestEntry && latestEntry.value >= kpi.target_value ? 'text-green-600' : 'text-red-500'}`}>
                          {latestEntry ? latestEntry.value : '-'}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-500">{kpi.unit}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

            {/* ========================================================= */}
      {/* ส่วนที่ 2: เมนูแสดง KPI ตามหมวด (ล็อกสิทธิ์เฉพาะผู้รับผิดชอบ และผู้บริหารเท่านั้น) */}
      {/* ========================================================= */}
      {activeTab === 'part2' && (
        <div className="animate-fadeIn space-y-6">
          {userProfile?.role === 'Staff' ? (
            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 text-amber-800 text-center font-medium">
              🔒 ส่วนนี้จำกัดสิทธิ์การเข้าใช้งานเฉพาะ กลุ่มผู้บริหาร และ ผู้ควบคุมตัวชี้วัดหลัก เท่านั้น
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">จัดการข้อมูลตัวชี้วัดแยกตามรายหมวดหมู่เชิงลึก</h2>
                  <p className="text-sm text-gray-500">สิทธิ์สำหรับตำแหน่งผู้บริหาร/ผู้ดูแลระบบ: {userProfile?.role}</p>
                </div>
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center space-x-1">
                  <span>+ สร้างหมวดหมู่/เพิ่มเป้าหมาย KPI</span>
                </button>
              </div>

              {/* วนลูปแยกกลุ่มกล่องตามหมวดหมู่ข้อมูล KPI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from(new Set(groupKpis.map(k => k.kpi_category))).map(category => (
                  <div key={category} className="border p-5 rounded-2xl bg-gray-50 space-y-3">
                    <h3 className="font-bold text-purple-700 border-b pb-2 flex items-center space-x-2">
                      <span>📊 {category}</span>
                    </h3>
                    <div className="space-y-2">
                      {groupKpis.filter(k => k.kpi_category === category).map(kpi => (
                        <div key={kpi.id} className="flex justify-between text-sm bg-white p-2 rounded-lg shadow-sm">
                          <span className="text-gray-700">{kpi.name}</span>
                          <span className="font-bold text-gray-600">เป้า: {kpi.target_value} {kpi.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

            {/* ========================================================= */}
      {/* ส่วนที่ 3: เมนูบันทึกข้อมูลหน่วยงาน (ลงและดูได้เฉพาะหน่วยงานตัวเอง) */}
      {/* ========================================================= */}
      {activeTab === 'part3' && (
        <div className="animate-fadeIn grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 📝 ฝั่งซ้าย: แบบฟอร์มกรอกและส่งข้อมูลผลงานเข้าระบบฐานข้อมูล */}
          <div className="bg-white p-6 rounded-2xl border shadow-sm lg:col-span-1 h-fit">
            <h2 className="text-lg font-bold text-gray-800 mb-2">แบบฟอร์มลงบันทึกผลงาน</h2>
            <p className="text-sm text-purple-600 font-semibold mb-4">สังกัด: {myDepartmentName}</p>
            
            <form onSubmit={handleAddEntry} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  เลือกรายการ KPI ที่ต้องการบันทึกข้อมูล
                </label>
                <select 
                  required
                  value={selectedKpiId}
                  onChange={(e) => setSelectedKpiId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- กรุณาเลือกตัวชี้วัด --</option>
                  {groupKpis.map(k => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ระบุตัวเลขผลงานที่ทำได้จริง (Actual)
                </label>
                <input 
                  type="number" 
                  step="any"
                  required
                  placeholder="กรอกเฉพาะตัวเลขผลงาน..."
                  value={actualValue}
                  onChange={(e) => setActualValue(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm active:scale-95"
              >
                ส่งบันทึกข้อมูลของหน่วยงานตนเอง
              </button>
            </form>
          </div>

          {/* 📊 ฝั่งขวา: ตารางแสดงประวัติข้อมูลผลงานย้อนหลัง (กรองสิทธิ์ดูได้เฉพาะแผนกตัวเอง) */}
          <div className="bg-white p-6 rounded-2xl border shadow-sm lg:col-span-2">
            <h2 className="text-lg font-bold text-gray-800 mb-1">ประวัติผลการดำเนินงานย้อนหลัง</h2>
            <p className="text-sm text-gray-500 mb-4">แสดงเฉพาะบันทึกข้อมูลของ {myDepartmentName} เท่านั้น</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b text-gray-600 font-bold">
                    <th className="py-2.5 px-3">ชื่อตัวชี้วัด KPI</th>
                    <th className="py-2.5 px-3 text-center">ปีงบประมาณ</th>
                    <th className="py-2.5 px-3 text-center">ผลงานจริงที่บันทึก</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {groupKpis.flatMap(kpi => 
                    (kpi.kpi_entries || [])
                      // 🔒 ฟังก์ชันล็อกสิทธิ์สากล: กรองให้แสดงผลเฉพาะรายการที่รหัสแผนกตรงกับผู้ใช้งานปัจจุบันเท่านั้น
                      .filter(entry => entry.department_id === userProfile?.department_id)
                      .map(entry => (
                        <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-3 text-gray-800 font-medium">{kpi.name}</td>
                          <td className="py-3 px-3 text-center text-gray-600">{entry.year}</td>
                          <td className="py-3 px-3 text-center font-bold text-purple-700 bg-purple-50/30 rounded-lg">
                            {entry.value}
                          </td>
                        </tr>
                      ))
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-500 text-xs">
                        ยังไม่มีประวัติการส่งข้อมูลบันทึกของหน่วยงานนี้ในรอบปีปัจจุบัน
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}
  </div> /* 👈 ปิดตัวคลุมใหญ่สุดของหน้าจอ (main) */
  ); /* 👈 ปิด return */
} /* 👈 ปิดฟังก์ชัน DashboardPage */