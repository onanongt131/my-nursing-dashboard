"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function ApproveMembersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    setLoading(true);
    // ดึงเฉพาะคนที่สถานะเป็น NULL หรือ pending
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or('status.is.null,status.eq.pending'); 
    
    if (data) setUsers(data);
    setLoading(false);
  };

  const approveUser = async (id: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'approved' })
      .eq('id', id);

    if (!error) {
      alert("อนุมัติสมาชิกเรียบร้อยแล้ว");
      fetchPendingUsers(); // รีเฟรชรายชื่อ
    } else {
      alert("เกิดข้อผิดพลาดในการอนุมัติ");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header หัวข้อหน้า */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-emerald-950">อนุมัติสมาชิกใหม่</h1>
          <p className="text-sm text-gray-500 mt-1">จัดการรายชื่อบุคลากรที่ลงทะเบียนและรอการอนุมัติสิทธิ์เข้าใช้งานระบบ</p>
        </div>
        <div className="bg-emerald-50 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-xl border border-emerald-200">
          รออนุมัติ: {users.length} รายการ
        </div>
      </div>

      {/* ตารางแสดงข้อมูล */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-emerald-900 text-white text-sm">
                <th className="p-4 font-semibold">ชื่อ-นามสกุล</th>
                <th className="p-4 font-semibold">อีเมล</th>
                <th className="p-4 font-semibold">สถานะ</th>
                <th className="p-4 font-semibold text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <svg className="w-10 h-10 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="font-medium text-gray-600">ไม่มีรายชื่อที่รอการอนุมัติในขณะนี้</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="p-4 font-medium text-gray-800">{user.full_name || '-'}</td>
                    <td className="p-4 text-gray-600">{user.email || '-'}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        {user.status || 'รออนุมัติ'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => approveUser(user.id)}
                        className="bg-emerald-800 hover:bg-emerald-900 text-amber-300 font-semibold px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer text-xs flex items-center justify-center gap-1.5 mx-auto"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        อนุมัติสิทธิ์
                      </button>
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