'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; 
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [deptId, setDeptId] = useState(''); // เริ่มต้นเป็นค่าว่าง
  const [departments, setDepartments] = useState<any[]>([]); // เพิ่ม state นี้
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // เพิ่มส่วนนี้: ดึงข้อมูลหน่วยงานเมื่อหน้าเว็บโหลด
  useEffect(() => {
    async function fetchDepartments() {
        const { data, error } = await supabase
        .from('departments')
        .select('id, Department') // เปลี่ยนจาก name เป็น Department
        .order('Department', { ascending: true }); // เปลี่ยนการเรียงลำดับด้วย

        if (error) {
        // ใช้ JSON.stringify เพื่อให้เห็นรายละเอียดของ error object ทั้งหมด
        console.error('รายละเอียด Error:', JSON.stringify(error, null, 2));
        } else {
        setDepartments(data || []);
        }
    }
    fetchDepartments();
    }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptId) {
      alert('กรุณาเลือกหน่วยงาน');
      return;
    }
    setLoading(true);

    // สมัครสมาชิกแค่ส่วนของ Auth เท่านั้น
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          department_id: deptId, // เก็บไว้ใน metadata เพื่อให้ Trigger ดึงไปใช้
        },
      },
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    // แค่แจ้งเตือนว่าสำเร็จ ไม่ต้องสั่ง insert profiles เอง
    alert('สมัครสมาชิกสำเร็จ! โปรดตรวจสอบอีเมลเพื่อยืนยันการใช้งาน');
    router.push('/login');
    
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <form onSubmit={handleSignUp} className="bg-white p-8 rounded-3xl shadow-sm border w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">สมัครสมาชิก</h1>
        
        <input className="w-full p-3 mb-4 border rounded-xl" type="text" placeholder="ชื่อ-นามสกุล" onChange={(e) => setFullName(e.target.value)} required />
        <input className="w-full p-3 mb-4 border rounded-xl" type="email" placeholder="อีเมล" onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full p-3 mb-4 border rounded-xl" type="password" placeholder="รหัสผ่าน" onChange={(e) => setPassword(e.target.value)} required />
        
        <label className="block mb-2 text-sm text-gray-600">เลือกหน่วยงาน</label>
        <select 
          className="w-full p-3 mb-6 border rounded-xl" 
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

        <button 
          className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold hover:bg-indigo-700 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
        </button>
      </form>
    </main>
  );
}