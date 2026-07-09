'use client'; // ใส่เพื่อเปิดระบบแสดงผลแจ้งเตือนแบบเคลื่อนไหว

import { useActionState } from 'react';
import { authenticate } from './actions'; // ดึงฟังก์ชันมาจากไฟล์ข้างบน

export default function LoginPage() {
  // errorMessage จะคอยรับคำเตือนสีแดงมาจากไฟล์ actions.ts
  const [errorMessage, dispatch] = useActionState(authenticate, undefined);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-1">เข้าสู่ระบบ</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Dashboard กลุ่มภารกิจด้านการพยาบาล</p>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้ใช้งาน</label>
            <input name="username" type="text" required className="w-full px-3 py-2 border rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
            <input name="password" type="password" required className="w-full px-3 py-2 border rounded-lg" />
          </div>

          {/* ถ้ามีข้อความเตือนส่งกลับมา ให้แสดงตัวหนังสือสีแดงตรงนี้ */}
          {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-lg transition"
          >
            {isPending ? 'กำลังตรวจสอบข้อมูล...' : 'เข้าสู่ระบบด้วยรหัสผ่าน'}
          </button>
        </form>
      </div>
    </div>
  );
}