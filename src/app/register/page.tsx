'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; 
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface Department {
  id: string;
  Department: string;
}

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [deptId, setDeptId] = useState(''); 
  const [departments, setDepartments] = useState<Department[]>([]); 
  const [loading, setLoading] = useState(false);
  
  // เพิ่มสถานะสำหรับแสดงข้อความแจ้งเตือนแทนการใช้ alert()
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const router = useRouter();

  useEffect(() => {
    async function fetchDepartments() {
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from('departments')
        .select('id, Department')
        .order('Department', { ascending: true });

      if (error) {
        console.error('รายละเอียด Error:', JSON.stringify(error, null, 2));
        setErrorMsg('ไม่สามารถโหลดข้อมูลหน่วยงานได้');
      } else {
        setDepartments(data || []);
      }
    }
    fetchDepartments();
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!deptId) {
      setErrorMsg('กรุณาเลือกหน่วยงานพยาบาลของคุณ');
      return;
    }

    if (!supabase) {
      setErrorMsg('ระบบฐานข้อมูลยังไม่พร้อมใช้งาน');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          department_id: deptId,
        },
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    // สมัครสมาชิกสำเร็จ: แสดงข้อความกล่องเขียว และหน่วงเวลา 3 วินาทีก่อนไปหน้าล็อกอิน
    setSuccessMsg('สมัครสมาชิกสำเร็จ! โปรดตรวจสอบอีเมลของคุณเพื่อยืนยันการใช้งานระบบ');
    setLoading(false);
    
    setTimeout(() => {
      router.push('/login');
    }, 3500);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border w-full max-w-md">
        
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-1">สมัครสมาชิก</h1>
        <p className="text-sm text-gray-500 text-center mb-6">ระบบบันทึกตัวชี้วัดกลุ่มภารกิจด้านการพยาบาล</p>

        {/* แสดงกล่องแจ้งเตือนกรณีเกิดข้อผิดพลาด (สีแดง) */}
        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* แสดงกล่องแจ้งเตือนกรณีสมัครสำเร็จ (สีเขียว) */}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-xl border border-green-200">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
            <input 
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
              type="text" 
              placeholder="เช่น พว.สมศรี รักดี"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)} 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมลผู้ใช้งาน</label>
            <input 
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
              type="email" 
              placeholder="username@hospital.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านสำหรับเข้าใช้งาน</label>
            <input 
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
              type="password" 
              placeholder="ความยาวขั้นต่ำ 6 ตัวอักษร"
              minLength={6} // ดักจับความปลอดภัยขั้นต่ำจากฝั่ง Client
              value={password}
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">หน่วยงาน / หอผู้ป่วย</label>
            <select 
              className="w-full p-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition cursor-pointer" 
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
              required
            >
              <option value="">-- กรุณาเลือกหน่วยงาน --</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.Department}
                </option>
              ))}
            </select>
          </div>

          <button 
            className="w-full bg-purple-600 text-white p-3 rounded-xl font-bold hover:bg-purple-700 disabled:bg-gray-300 transition duration-200 mt-2 flex items-center justify-center gap-2 cursor-pointer"
            disabled={loading || successMsg !== ''}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>กำลังบันทึกข้อมูล...</span>
              </>
            ) : (
              <span>สมัครสมาชิก</span>
            )}
          </button>
          
        </form>
      </div>
    </main>
  );
}