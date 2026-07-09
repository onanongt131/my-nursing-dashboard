'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; // อ้างอิงจากไฟล์เชื่อมต่อ Supabase ของคุณ

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserStatus = async () => {
      // 1. ดึงข้อมูล Session ปัจจุบันจาก Supabase
      const { data: { session } } = await supabase.auth.getSession();

      // 2. ถ้าไม่มี Session แปลว่ายังไม่ได้ล็อกอิน ให้เด้งไปหน้า login
      if (!session) {
        router.push('/login');
      } else {
        // ถ้าล็อกอินแล้ว ให้ปิดหน้าต่างโหลดและแสดงเนื้อหาเว็บปกติ
        setLoading(false);
      }
    };

    checkUserStatus();
  }, [router]);

  // 3. ระหว่างที่ระบบกำลังเช็กสิทธิ์ (ป้องกันไม่ให้คนไม่ล็อกอินแอบเห็นหน้าแดชบอร์ดแวบๆ)
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          {/* คุณสามารถใส่ไอคอนโหลดหมุนๆ ตรงนี้ได้ */}
          <p className="text-gray-600 font-medium animate-pulse">กำลังตรวจสอบสิทธิ์เข้าใช้งานระบบ...</p>
        </div>
      </div>
    );
  }

  // 4. ถ้าผ่านการตรวจสอบแล้ว ให้แสดงหน้า Dashboard ปกติ
  return <>{children}</>;
}