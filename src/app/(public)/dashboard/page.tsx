'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { LayoutDashboard, CheckCircle2, XCircle } from 'lucide-react';
import AddEntryForm from '@/components/AddEntryForm';
import KpiCard from "@/components/KpiCard";
import { getButtonStyle } from "@/utils/kpiCalculations";
import { CheckCircleIcon as IconCheck, XCircleIcon as XIcon } from '@heroicons/react/24/solid';

export const categories = [
  { id: 1, name: "หมวด 1 ผลลัพธ์ด้านการนำองค์กร", icon: "🏛️" },
  { id: 2, name: "หมวด 2 ผลลัพธ์ด้านประสิทธิภาพ", icon: "🎯" },
  { id: 3, name: "หมวด 3 ผลลัพธ์ด้านผู้ใช้บริการ", icon: "👥" },
  { id: 4, name: "หมวด 4 ผลลัพธ์ด้านบุคลากร", icon: "📊" },
  { id: 5, name: "หมวด 5 ผลลัพธ์ด้านระบบงานและกระบวนการสำคัญ", icon: "👩‍⚕️" },
  { id: 6, name: "หมวด 6 ผลลัพธ์ด้านบริการพยาบาล", icon: "📝" },
];

export const strategicGoals = [
  { 
    id: '1', 
    name: 'Service Excellence', 
    description: 'ยุทธศาสตร์ที่ 1 : พัฒนาระบบบริการพยาบาลให้มีคุณภาพ มุ่งสู่องค์กรพยาบาลที่เป็นเลิศ', 
    year_range: '2567-2571' 
  },
  { 
    id: '2', 
    name: 'Medical & Wellness Excellence', 
    description: 'ยุทธศาสตร์ที่ 2 : พัฒนาระบบบริการพยาบาลด้าน Medical & Wellness เพื่อยกระดับประสบการณ์และการเข้าถึงบริการที่เป็นเลิศ', 
    year_range: '2567-2571' 
  },
  { 
    id: '3', 
    name: 'PP&P Excellence', 
    description: 'ยุทธศาสตร์ที่ 3 : ส่งเสริมสุขภาพและป้องกันโรคเชิงรุกด้วยระบบการพยาบาลที่มีคุณภาพ', 
    year_range: '2567-2571' 
  },
  { 
    id: '4', 
    name: 'People Excellence', 
    description: 'ยุทธศาสตร์ที่ 4 : บริหารและพัฒนาศักยภาพบุคลากรทางการพยาบาลสู่ความเป็นเลิศ', 
    year_range: '2567-2571' 
  },
  { 
    id: '5', 
    name: 'Governance Excellence', 
    description: 'ยุทธศาสตร์ที่ 5 : บริหารองค์กรพยาบาลตามหลักธรรมาภิบาลและนวัตกรรม สู่ความเป็นเลิศ', 
    year_range: '2567-2571' 
  },
];

export default function DashboardPage() {
  const supabase = createClient();
  const [groupKpis, setGroupKpis] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedKpi, setSelectedKpi] = useState<any | null>(null);
  const [selectedStrategic, setSelectedStrategic] = useState<string | null>(null);
  const [selectedDisease, setSelectedDisease] = useState("ทั้งหมด");
  const [selectedGroup, setSelectedGroup] = useState<string | null>('');
  const [selectedDept, setSelectedDept] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [userDisplayName, setUserDisplayName] = useState<string>('');
  
  const uniqueGroups = useMemo(() => Array.from(new Set(departments.map(d => d.group_name))), [departments]);
  const filteredDepartments = useMemo(() => departments.filter(d => d.group_name === selectedGroup), [departments, selectedGroup]);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('email', user.email)
        .maybeSingle();

      if (profile?.full_name) {
        setUserDisplayName(profile.full_name);
      } else {
        setUserDisplayName(user.email.split('@')[0]);
      }
    }

    const { data: allKpis } = await supabase.from('kpis').select('*, kpi_entries(*)');
    const { data: depts } = await supabase.from('departments').select('*');
    if (allKpis) setGroupKpis(allKpis.filter((k: any) => k.departments_id === null));
    if (depts) setDepartments(depts);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = useMemo(() => {
    const passed = groupKpis.filter(kpi => {
      const entries = kpi.kpi_entries || [];
      const latest = [...entries].sort((a: any, b: any) => b.year - a.year)[0];
      return latest && latest.value >= (kpi.target_value || 0);
    }).length;
    return { total: groupKpis.length, passed, failed: groupKpis.length - passed, percent: groupKpis.length > 0 ? Math.round((passed / groupKpis.length) * 100) : 0 };
  }, [groupKpis]);

  if (loading) return <main className="p-8 text-center text-emerald-900">กำลังโหลดข้อมูล...</main>;

  return (
    <main className="px-4 py-2 max-w-full mx-auto space-y-3 bg-gradient-to-b from-emerald-50/40 via-white to-amber-50/20 min-h-screen">
      
      {/* --- ส่วนแสดง วิสัยทัศน์ พันธกิจ และเป้าหมาย --- */}
      <div className="space-y-4">
        
        {/* 1. กล่องวิสัยทัศน์ (Vision) รูปแบบตารางฝั่งซ้าย-ขวา */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-2 rounded-2xl shadow-lg border border-amber-500/30 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-amber-400/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex flex-col lg:flex-row items-stretch justify-between gap-4 relative z-10">
            
            {/* ตารางจำลอง 2 คอลัมน์ */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-[220px_1fr] border border-amber-500/40 rounded-xl overflow-hidden bg-emerald-950/40 backdrop-blur-sm py-1">
              
              {/* คอลัมน์ซ้าย: หัวข้อวิสัยทัศน์ */}
              <div className="bg-emerald-950/80 p-3 flex flex-col justify-center items-center text-center border-b md:border-b-0 md:border-r border-amber-500/30">
                <span className="text-amber-300 font-bold text-lg tracking-wide">วิสัยทัศน์</span>
                <span className="text-amber-400 font-extrabold text-xl tracking-wider">(VISION)</span>
              </div>

              {/* คอลัมน์ขวา: ข้อความ 3 บรรทัด จัดเยื้อง layer */}
              <div className="p-3 flex flex-col justify-center space-y-2 text-center md:text-left">
                <p className="text-lg md:text-xl font-extrabold text-amber-100 tracking-wide translate-x-0">
                  องค์กรพยาบาลที่เป็นเลิศ
                </p>
                <p className="text-lg md:text-xl font-extrabold text-amber-100 tracking-wide translate-x-4 md:translate-x-6">
                  บุคลากรเก่ง ดี มีสุข
                </p>
                <p className="text-lg md:text-xl font-extrabold text-amber-100 tracking-wide translate-x-8 md:translate-x-12">
                  ประชาชนเชื่อมั่นในบริการพยาบาล
                </p>
              </div>

            </div>

            {/* โปรไฟล์หัวหน้าพยาบาล */}
            <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 shadow-lg shrink-0 self-center lg:self-center">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-amber-300 font-medium">หัวหน้าพยาบาล</p>
                <p className="text-base text-white font-bold">พว.กฤตพร เมืองพร้อม</p>
              </div>
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-300 shadow-md bg-emerald-800 shrink-0 flex items-center justify-center">
                <img 
                  src="/head-nurse.jpg" 
                  alt="พว.กฤตพร เมืองพร้อม" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

          </div>
        </div>

        {/* 2. กล่องพันธกิจ (Mission) และ เป้าหมาย (Goals) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* พันธกิจ (Mission) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-amber-500"></div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-emerald-50">
              <div className="w-2.5 h-6 bg-amber-500 rounded-full shadow-sm"></div>
              <h3 className="text-lg font-extrabold text-emerald-950 tracking-tight">พันธกิจ (Mission)</h3>
            </div>
            
            <div className="space-y-3 text-sm md:text-base text-gray-700 flex-1">
              <div>
                <span className="font-extrabold text-emerald-800 tracking-wide">N - Nursing Excellence</span>
                <p className="text-gray-600 pl-4 font-normal mt-0.5">: สร้างมาตรฐานเพื่อมุ่งสู่ความเป็นเลิศด้านการพยาบาล</p>
              </div>
              <div>
                <span className="font-extrabold text-emerald-800 tracking-wide">U - Understanding Patient Safety</span>
                <p className="text-gray-600 pl-4 font-normal mt-0.5">: ความเข้าใจ และตระหนักถึงความปลอดภัยของผู้ป่วยเป็นหัวใจสำคัญ</p>
              </div>
              <div>
                <span className="font-extrabold text-emerald-800 tracking-wide">R - Responsibility with Ethics</span>
                <p className="text-gray-600 pl-4 font-normal mt-0.5">: ความรับผิดชอบต่อวิชาชีพ ควบคู่กับคุณธรรมและจริยธรรม</p>
              </div>
              <div>
                <span className="font-extrabold text-emerald-800 tracking-wide">S - Skilled and Satisfied Staff</span>
                <p className="text-gray-600 pl-4 font-normal mt-0.5">: บุคลากรมีความรู้ ทักษะ และมีความสุขในการทำงาน</p>
              </div>
              <div>
                <span className="font-extrabold text-emerald-800 tracking-wide">E - Engaging Public Trust</span>
                <p className="text-gray-600 pl-4 font-normal mt-0.5">: สร้างความเชื่อมั่นของประชาชนในบริการพยาบาล</p>
              </div>
            </div>
          </div>

          {/* เป้าหมาย (Goals) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-emerald-600"></div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-emerald-50">
              <div className="w-2.5 h-6 bg-emerald-600 rounded-full shadow-sm"></div>
              <h3 className="text-lg font-extrabold text-emerald-950 tracking-tight">เป้าหมาย (Goals)</h3>
            </div>

            <ol className="space-y-3 text-sm md:text-base text-gray-700 list-decimal list-inside flex-1 font-medium">
              <li className="leading-relaxed">
                พัฒนาระบบการพยาบาลให้มีคุณภาพตามมาตรฐานวิชาชีพ เพื่อมุ่งสู่ความเป็นเลิศด้านบริการพยาบาล
              </li>
              <li className="leading-relaxed">
                สร้างวัฒนธรรมความปลอดภัยในองค์กร ส่งเสริมให้พยาบาลมีความตระหนัก และปฏิบัติตามแนวทางความปลอดภัยของผู้ป่วยอย่างเคร่งครัด
              </li>
              <li className="leading-relaxed">
                เสริมสร้างจริยธรรมและความรับผิดชอบในการปฏิบัติงานของพยาบาล เพื่อคงไว้ซึ่งความไว้วางใจในวิชาชีพ
              </li>
              <li className="leading-relaxed">
                พัฒนาศักยภาพของพยาบาล และสร้างสภาพแวดล้อมการทำงานที่มีความสุข
              </li>
              <li className="leading-relaxed">
                ยกระดับมาตรฐานบริการพยาบาล มุ่งหวังผลลัพธ์ที่มีคุณภาพ และตอบสนองความต้องการของผู้รับบริการอย่างต่อเนื่อง
              </li>
            </ol>
          </div>

        </div>
      </div>

      {/* --- แผนยุทธศาสตร์ พ.ศ. 2567 - 2571 และจุดเน้น --- */}
      <div className="bg-white rounded-2xl shadow-md border border-emerald-200 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-amber-700 px-6 py-4 flex flex-col md:flex-row justify-between items-center text-white gap-3 shadow-inner">
          <div className="flex items-center gap-2">
            <div className="w-2 h-6 bg-amber-400 rounded-full"></div>
            <h2 className="text-lg md:text-xl font-extrabold tracking-wide text-amber-100">แผนยุทธศาสตร์ พ.ศ. 2567 - 2571</h2>
          </div>
          
          <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-emerald-950 px-4 py-1.5 rounded-full text-xs md:text-lg font-black tracking-wider uppercase shadow-md border border-amber-300 flex items-center gap-1.5">
            <span>🔥 จุดเน้น : 3P Safety / SMART NURSE</span>
          </div>
        </div>

        {/* ตารางแผนยุทธศาสตร์ */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm md:text-base table-fixed">
            <thead>
              <tr className="bg-emerald-50/80 border-b border-emerald-200 text-emerald-950 font-extrabold">
                <th className="p-4 w-[25%] border-r border-emerald-200">ยุทธศาสตร์</th>
                <th className="p-4 w-[37.5%] border-r border-emerald-200">กลยุทธ์</th>
                <th className="p-4 w-[37.5%]">ตัวชี้วัด (KPI)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100 text-gray-700">
              
              {/* ยุทธศาสตร์ที่ 1 */}
              <tr className="hover:bg-emerald-50/30 transition-colors">
                <td className="p-4 font-bold text-emerald-900 border-r border-emerald-200 align-top">
                  ยุทธศาสตร์ที่ 1 : พัฒนาระบบบริการพยาบาลให้มีคุณภาพ มุ่งสู่องค์กรพยาบาลที่เป็นเลิศ (Service Excellence)
                </td>
                <td className="p-4 border-r border-emerald-200 align-top">
                  <ol className="space-y-2 list-decimal list-inside font-normal">
                    <li>พัฒนาระบบบริการพยาบาลตามมาตรฐานวิชาชีพ</li>
                    <li>พัฒนาระบบความปลอดภัยของผู้ป่วย (Patient Safety & HRO)</li>
                    <li>พัฒนาระบบการพยาบาลผู้ป่วยโรคสำคัญ (Service Plan Nursing)</li>
                    <li>พัฒนาระบบการดูแลผู้ป่วยแบบไร้รอยต่อ (Seamless Care)</li>
                    <li>พัฒนาคุณภาพบริการด้วยนวัตกรรมและข้อมูลสารสนเทศ (Digital Nursing & Innovation)</li>
                  </ol>
                </td>
                <td className="p-4 align-top">
                  <ol className="space-y-2 list-decimal list-inside font-normal">
                    <li>ร้อยละการปฏิบัติตาม Clinical Nursing Practice Guideline (CNPG)</li>
                    <li>ร้อยละความสมบูรณ์ของการบันทึกทางการพยาบาล</li>
                    <li>จำนวนอุบัติการณ์การระบุตัวผู้ป่วยผิดพลาด</li>
                    <li>อัตราการเกิด Pressure Sore ระดับ 2 ขึ้นไป</li>
                    <li>อุบัติการณ์การพลัดตกหกล้ม ระดับ E ขึ้นไป</li>
                    <li>อุบัติการณ์ท่อช่วยหายใจเลื่อนหลุดจากการเฝ้าระวังไม่เหมาะสม</li>
                    <li>อัตราการเกิดภาวะแทรกซ้อนจากการสารน้ำ/ ยา/ เลือด</li>
                    <li>อัตรา Medication Error ระดับ E ขึ้นไป</li>
                    <li>อัตราการติดเชื้อ</li>
                    <li>ร้อยละผู้ป่วยโรคสำคัญได้รับการดูแลตามเกณฑ์ Fast Track / Sepsis Bundle / EWS</li>
                    <li>ร้อยละผู้ป่วยได้รับ Discharge Planning ครบถ้วน</li>
                  </ol>
                </td>
              </tr>

              {/* ยุทธศาสตร์ที่ 2 */}
              <tr className="hover:bg-emerald-50/30 transition-colors">
                <td className="p-4 font-bold text-emerald-900 border-r border-emerald-200 align-top">
                  ยุทธศาสตร์ที่ 2 : พัฒนาระบบบริการพยาบาลด้าน Medical & Wellness เพื่อยกระดับประสบการณ์และการเข้าถึงบริการที่เป็นเลิศ
                </td>
                <td className="p-4 border-r border-emerald-200 align-top">
                  <ol className="space-y-2 list-decimal list-inside font-normal">
                    <li>พัฒนาระบบบริการพยาบาลเพื่อเพิ่มการเข้าถึงบริการ (Accessibility & Equity)</li>
                    <li>พัฒนาระบบบริการพยาบาลด้าน Medical & Wellness และการดูแลแบบองค์รวม</li>
                    <li>พัฒนาประสบการณ์ผู้รับบริการ (Patient Experience & Hospitality Nursing)</li>
                    <li>พัฒนาระบบบริการพยาบาลสำหรับผู้รับบริการต่างชาติและสังคมพหุวัฒนธรรม</li>
                    <li>พัฒนาระบบการวางแผนจำหน่ายและการดูแลต่อเนื่อง</li>
                  </ol>
                </td>
                <td className="p-4 align-top">
                  <ol className="space-y-2 list-decimal list-inside font-normal">
                    <li>ระยะเวลารอคอยรับบริการพยาบาลตามเกณฑ์ที่กำหนด</li>
                    <li>ร้อยละผู้ป่วยได้รับการประเมินความต้องการด้านสุขภาพแบบองค์รวม</li>
                    <li>ระดับความพึงพอใจของผู้รับบริการด้านการพยาบาล</li>
                    <li>ร้อยละผู้ป่วยต่างชาติได้รับการประเมินด้านภาษาและวัฒนธรรม</li>
                  </ol>
                </td>
              </tr>

              {/* ยุทธศาสตร์ที่ 3 */}
              <tr className="hover:bg-emerald-50/30 transition-colors">
                <td className="p-4 font-bold text-emerald-900 border-r border-emerald-200 align-top">
                  ยุทธศาสตร์ที่ 3 : ส่งเสริมสุขภาพและป้องกันโรคเชิงรุกด้วยระบบการพยาบาลที่มีคุณภาพ (PP&P Excellence)
                </td>
                <td className="p-4 border-r border-emerald-200 align-top">
                  <ol className="space-y-2 list-decimal list-inside font-normal">
                    <li>พัฒนาระบบการคัดกรองและประเมินความเสี่ยงของประชาชนและผู้ป่วยกลุ่มเสี่ยง</li>
                    <li>ส่งเสริมสุขภาพและปรับเปลี่ยนพฤติกรรมสุขภาพ (Health Promotion & Health Coaching)</li>
                    <li>พัฒนาระบบการพยาบาลสำหรับผู้ป่วยโรคเรื้อรังและโรคสำคัญ</li>
                    <li>พัฒนาระบบการดูแลต่อเนื่องและการเชื่อมโยงเครือข่ายสุขภาพ</li>
                    <li>พัฒนาศักยภาพพยาบาลและเครือข่ายในการส่งเสริมสุขภาพและป้องกันโรค</li>
                  </ol>
                </td>
                <td className="p-4 align-top">
                  <ol className="space-y-2 list-decimal list-inside font-normal">
                    <li>ร้อยละผู้รับบริการได้รับการคัดกรองความเสี่ยงตามเกณฑ์ (NCD, Mental Health)</li>
                    <li>ร้อยละผู้ป่วย NCD ได้รับ Health Coaching / Lifestyle Modification</li>
                    <li>ระดับความรอบรู้ด้านสุขภาพ (Health Literacy) ของกลุ่มเป้าหมาย</li>
                    <li>อัตราการมาตามนัดของผู้ป่วยโรคเรื้อรัง</li>
                  </ol>
                </td>
              </tr>

              {/* ยุทธศาสตร์ที่ 4 */}
              <tr className="hover:bg-emerald-50/30 transition-colors">
                <td className="p-4 font-bold text-emerald-900 border-r border-emerald-200 align-top">
                  ยุทธศาสตร์ที่ 4 : บริหารและพัฒนาศักยภาพบุคลากรทางการพยาบาลสู่ความเป็นเลิศ (People Excellence)
                </td>
                <td className="p-4 border-r border-emerald-200 align-top">
                  <ol className="space-y-2 list-decimal list-inside font-normal">
                    <li>พัฒนาสมรรถนะบุคลากรตาม Nursing Competency Framework</li>
                    <li>พัฒนาภาวะผู้นำและเตรียมความพร้อมผู้บริหารทางการพยาบาล</li>
                    <li>พัฒนาทักษะวิชาชีพผ่านระบบนิเทศทางการพยาบาล (Clinical Nursing Supervision)</li>
                    <li>ส่งเสริมองค์กรแห่งการเรียนรู้ การจัดการความรู้ วิจัย และนวัตกรรม</li>
                    <li>บริหารอัตรากำลังและระบบกำลังคนตามภาระงาน (Workforce Management)</li>
                    <li>ส่งเสริมสุขภาวะ ความปลอดภัย และความผูกพันของบุคลากร</li>
                  </ol>
                </td>
                <td className="p-4 align-top">
                  <ol className="space-y-2 list-decimal list-inside font-normal">
                    <li>ร้อยละบุคลากรผ่านการประเมิน Competency ตามเกณฑ์</li>
                    <li>ร้อยละการนิเทศทางการพยาบาลเป็นไปตามแผน</li>
                    <li>จำนวนผลงาน CQI/R2R/นวัตกรรมที่นำไปใช้จริง</li>
                    <li>Nursing Productivity อยู่ในเกณฑ์ 90-110%</li>
                    <li>คะแนนความสุขในการทำงาน (Happinometer) และความผูกพัน (Engagement Score)</li>
                  </ol>
                </td>
              </tr>

              {/* ยุทธศาสตร์ที่ 5 */}
              <tr className="hover:bg-emerald-50/30 transition-colors">
                <td className="p-4 font-bold text-emerald-900 border-r border-emerald-200 align-top">
                  ยุทธศาสตร์ที่ 5 : บริหารองค์กรพยาบาลตามหลักธรรมาภิบาลและนวัตกรรม สู่ความเป็นเลิศ (Governance Excellence)
                </td>
                <td className="p-4 border-r border-emerald-200 align-top">
                  <ol className="space-y-2 list-decimal list-inside font-normal">
                    <li>พัฒนาระบบ Nursing Governance และ Clinical Governance</li>
                    <li>พัฒนาระบบบริหารคุณภาพและการบริหารความเสี่ยง (Quality & Risk Management)</li>
                    <li>พัฒนาระบบ Digital Nursing และการบริหารจัดการด้วยข้อมูล (Management by Fact)</li>
                    <li>พัฒนาระบบบริหารองค์กรด้วยหลักธรรมาภิบาล (Good Governance)</li>
                    <li>ส่งเสริมการพัฒนาองค์กรสู่ความยั่งยืน (Green & Sustainable Organization)</li>
                    <li>พัฒนาระบบเครือข่ายและการสื่อสารองค์กร</li>
                  </ol>
                </td>
                <td className="p-4 align-top">
                  <ol className="space-y-2 list-decimal list-inside font-normal">
                    <li>ร้อยละหน่วยงานผ่านการประเมินมาตรฐานการพยาบาล</li>
                    <li>ร้อยละเหตุการณ์ความเสี่ยงได้รับการทบทวนตามระยะเวลาที่กำหนด</li>
                    <li>ร้อยละหน่วยงานใช้ Dashboard ในการติดตามตัวชี้วัด</li>
                    <li>ร้อยละหน่วยงานผ่านเกณฑ์ Green Office/Green Hospital</li>
                  </ol>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}