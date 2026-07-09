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
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const router = useRouter();

  useEffect(() => {
    async function fetchDepartments() {
      const { data, error } = await supabase
        .from('departments')
        .select('id, Department')
        .order('Department', { ascending: true });

      if (error) {
        console.error('Error loading departments:', error);
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

    setLoading(true);

    try {
      // ใน handleSignUp function
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
        // แก้ไขตรงนี้: ดึงข้อความจาก Error มาแสดงแบบปลอดภัย
        const errorMessage = error.message || JSON.stringify(error);
        setErrorMsg(errorMessage); 
        setLoading(false);
        return;
      }

      setSuccessMsg('สมัครสมาชิกสำเร็จ! โปรดตรวจสอบอีเมลของคุณเพื่อยืนยันการใช้งาน');
      setTimeout(() => router.push('/login'), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-1">สมัครสมาชิก</h1>
        <p className="text-sm text-gray-500 text-center mb-6">ระบบบันทึกตัวชี้วัดกลุ่มภารกิจด้านการพยาบาล</p>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-xl border border-green-200">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
            <input className="w-full p-3 border border-gray-300 rounded-xl" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมลผู้ใช้งาน</label>
            <input className="w-full p-3 border border-gray-300 rounded-xl" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
            <input className="w-full p-3 border border-gray-300 rounded-xl" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">หน่วยงาน</label>
            <select className="w-full p-3 border border-gray-300 rounded-xl bg-white" value={deptId} onChange={(e) => setDeptId(e.target.value)} required>
              <option value="">-- กรุณาเลือกหน่วยงาน --</option>
              {departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.Department}</option>)}
            </select>
          </div>
          <button className="w-full bg-purple-600 text-white p-3 rounded-xl font-bold hover:bg-purple-700 disabled:bg-gray-300" disabled={loading}>
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> กำลังบันทึก...</> : 'สมัครสมาชิก'}
          </button>
        </form>
      </div>
    </main>
  );
}