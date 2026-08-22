'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function CommitteeListPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [committees, setCommittees] = useState<any[]>([]);
  const [canEdit, setCanEdit] = useState(false); // ตัวแปรควบคุมการแสดงปุ่มเพิ่ม

  useEffect(() => {
    const fetchCommitteesAndAuth = async () => {
      setLoading(true);
      try {
        // 1. ดึงข้อมูลคณะกรรมการ
        const { data, error } = await supabase
          .from('committee_content')
          .select('committee_key, committee_name, president_name, president_image, updated_at');

        if (error) {
          console.error('Error fetching committees:', error);
        } else {
          setCommittees(data || []);
        }

        // 2. ตรวจสอบสิทธิ์การเข้าสู่ระบบ (Login Session)
        const { data: { session } } = await supabase.auth.getSession();
        setCanEdit(!!session); // ถ้า Login แล้วจะเป็น true

      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCommitteesAndAuth();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-emerald-800 font-medium">กำลังโหลดข้อมูลคณะกรรมการ...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* ส่วนหัว */}
      <div className="border-b-2 border-amber-400 pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-emerald-900">
            คณะกรรมการกลุ่มภารกิจด้านการพยาบาล
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            ทำเนียบและรายนามคณะกรรมการชุดต่างๆ ประจำปีงบประมาณ
          </p>
        </div>

        {/* ปุ่มเพิ่มคณะกรรมการ (แสดงเฉพาะผู้ที่ Login แล้วเท่านั้น) */}
        {canEdit && (
          <button
            type="button"
            onClick={() => router.push('/dashboard/committee/add')} // ปรับ Path หน้าเพิ่มข้อมูลตามโปรเจกต์ของคุณ
            className="bg-emerald-700 hover:bg-emerald-800 text-amber-100 font-semibold px-5 py-2.5 rounded-xl shadow-md transition-colors border border-amber-400 cursor-pointer flex-shrink-0"
          >
            + เพิ่มคณะกรรมการ
          </button>
        )}
      </div>

      {/* Grid แสดงรายการคณะกรรมการ */}
      {committees.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {committees.map((item, index) => (
            <div
              key={index}
              onClick={() => router.push(`/dashboard/committee/${item.committee_key}`)}
              className="bg-white rounded-2xl border border-emerald-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer group flex flex-col justify-between"
            >
              <div>
                {/* ส่วนหัวการ์ด */}
                <div className="bg-emerald-800 text-amber-300 px-5 py-3.5 font-semibold text-base group-hover:bg-emerald-900 transition-colors flex items-center justify-between">
                  <span className="truncate">{item.committee_name || "คณะกรรมการ"}</span>
                  <svg className="w-5 h-5 flex-shrink-0 text-amber-300 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                {/* เนื้อหาภายใน */}
                <div className="p-5 flex items-center gap-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden border border-amber-300 flex-shrink-0 flex items-center justify-center">
                    {item.president_image ? (
                      <img
                        src={item.president_image}
                        alt="ประธาน"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-400 text-[10px]">ไม่มีรูป</span>
                    )}
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    <p className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">ประธานคณะกรรมการ</p>
                    <p className="text-sm font-bold text-gray-800 truncate">
                      {item.president_name || "รอยืนยันรายนาม"}
                    </p>
                    <p className="text-xs text-gray-500 pt-1">คลิกเพื่อดูรายละเอียดและเอกสาร</p>
                  </div>
                </div>
              </div>

              {/* ส่วนท้ายการ์ด */}
              <div className="px-5 py-3 bg-emerald-50/50 border-t border-emerald-100 flex items-center justify-between text-xs text-emerald-900 font-medium">
                <span>ดูข้อมูลทั้งหมด</span>
                <span className="text-emerald-700 group-hover:underline">เข้าสู่หน้าคณะกรรมการ &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-emerald-200 shadow-sm">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-gray-500 font-medium">ยังไม่มีข้อมูลรายชื่อคณะกรรมการในระบบ</p>
        </div>
      )}
    </div>
  );
}