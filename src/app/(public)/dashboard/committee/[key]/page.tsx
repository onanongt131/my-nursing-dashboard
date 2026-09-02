'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function CommitteeDetailPage() {
  const supabase = createClient();
  const params = useParams();
  const committeeKey = params?.key as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(true); // ตั้งเป็น true ไว้ก่อนเพื่อให้ปุ่มแสดง
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. เช็คสิทธิ์จากตาราง profiles
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const { data: profile } = await supabase
            .from('profiles') // เปลี่ยนจาก users เป็น profiles ตามที่คุณแจ้ง
            .select('role')
            .eq('email', user.email)
            .single();

          if (profile?.role?.toLowerCase().trim() === 'staff') {
            setCanEdit(false);
          } else {
            setCanEdit(true);
          }
        }

        // 2. ดึงข้อมูลคณะกรรมการ
        if (committeeKey) {
          const { data: detail, error } = await supabase
            .from('committee_content')
            .select('*')
            .eq('committee_key', committeeKey)
            .single();

          if (!error && detail) {
            setData(detail);
          }
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [committeeKey, supabase]);

  if (loading) return <div className="p-8 text-center text-emerald-800">กำลังโหลดข้อมูล...</div>;
  if (!data) return <div className="p-8 text-center text-red-600">ไม่พบข้อมูลคณะกรรมการ (Key: {committeeKey})</div>;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* ส่วนหัวชื่อคณะกรรมการ และปุ่มแก้ไข */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b-2 border-amber-400 pb-4 gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-emerald-900">
          {data?.committee_name || "คณะกรรมการ"}
        </h1>
        
        {/* ปุ่มแก้ไข */}
        {canEdit && (
          <Link
            href={`/dashboard/committee/${committeeKey}/edit`}
            className="bg-emerald-800 hover:bg-emerald-900 text-amber-300 font-semibold px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 border border-amber-400/50 cursor-pointer text-sm md:text-base"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            เพิ่มข้อมูล
          </Link>
        )}
      </div>

      {/* โครงสร้างเนื้อหาปกติ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* คอลัมน์ที่ 1: ภาพประธาน และเอกสาร */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
            <div className="bg-emerald-800 text-amber-300 px-4 py-3 text-center font-semibold text-sm">
              ประธานคณะกรรมการ
            </div>
            <div className="p-4 flex flex-col items-center">
              <div className="w-full h-56 bg-gray-100 rounded-xl overflow-hidden border-2 border-amber-300 shadow-inner mb-3 flex items-center justify-center">
                {data?.president_image ? (
                  <img src={data.president_image} alt="ประธาน" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 text-xs">ไม่มีรูปภาพ</span>
                )}
              </div>
              <p className="font-bold text-gray-800 text-center text-sm">
                {data?.president_name || "รอยืนยันรายนาม"}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
            <div className="bg-emerald-800 text-amber-300 px-4 py-3 text-center font-semibold text-sm">
              เอกสารดาวน์โหลด
            </div>
            <div className="p-3 space-y-2">
              {data?.documents && data.documents.length > 0 ? (
                data.documents.map((doc: any, index: number) => (
                  <a
                    key={index}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-900 transition-colors border border-emerald-100 text-xs font-medium"
                  >
                    <span className="truncate flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {doc.name || `เอกสารชุดที่ ${index + 1}`}
                    </span>
                    <span className="text-[10px] bg-emerald-700 text-white px-2 py-0.5 rounded-lg flex-shrink-0">ดาวน์โหลด</span>
                  </a>
                ))
              ) : (
                <div className="text-center py-4 text-gray-400 text-xs">ไม่มีเอกสารดาวน์โหลด</div>
              )}
            </div>
          </div>
        </div>

        {/* คอลัมน์ที่ 2: บทบาทหน้าที่ และรายชื่อ */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
            <div className="bg-emerald-800 text-amber-300 px-4 py-3 text-center font-semibold text-base">
              บทบาทหน้าที่ของคณะกรรมการ
            </div>
            <div className="p-5 text-gray-700 text-sm leading-relaxed min-h-[160px]">
              {data?.roles_image ? (
                <div className="flex justify-center">
                  <img src={data.roles_image} alt="บทบาทหน้าที่" className="max-h-96 object-contain rounded-lg border" />
                </div>
              ) : data?.roles_and_duties ? (
                <div className="whitespace-pre-line">{data.roles_and_duties}</div>
              ) : (
                <div className="text-center text-gray-400">ยังไม่มีข้อมูลบทบาทหน้าที่</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
            <div className="bg-emerald-800 text-amber-300 px-4 py-3 text-center font-semibold text-base">
              รายชื่อคณะกรรมการ
            </div>
            <div className="p-5">
              {data?.members_image ? (
                <div className="flex justify-center">
                  <img src={data.members_image} alt="รายชื่อคณะกรรมการ" className="max-h-96 object-contain rounded-lg border" />
                </div>
              ) : data?.committee_members && data.committee_members.length > 0 ? (
                <ul className="space-y-2 text-sm text-gray-700">
                  {data.committee_members.map((member: any, index: number) => (
                    <li key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <span className="font-medium text-gray-800">
                        {typeof member === 'string' ? member : member.name}
                      </span>
                      {typeof member === 'object' && member.position && (
                        <span className="text-xs bg-amber-50 text-emerald-800 px-2 py-1 rounded-md border border-amber-200 font-semibold">
                          {member.position}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm">ไม่มีข้อมูลรายชื่อคณะกรรมการ</div>
              )}
            </div>
          </div>
        </div>

        {/* คอลัมน์ที่ 3: ภาพกิจกรรม */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
            <div className="bg-emerald-800 text-amber-300 px-4 py-3 text-center font-semibold text-base">
              ภาพกิจกรรม
            </div>
            <div className="p-5">
              {data?.activity_images && data.activity_images.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {data.activity_images.map((imgItem: any, index: number) => {
                    const imgUrl = typeof imgItem === 'string' ? imgItem : imgItem?.url;
                    if (!imgUrl) return null;
                    return (
                      <div 
                        key={index} 
                        onClick={() => setSelectedImage(imgUrl)}
                        className="rounded-xl overflow-hidden border border-gray-200 shadow-xs bg-gray-50 cursor-pointer group relative flex items-center justify-center p-1"
                      >
                        <img src={imgUrl} alt={`ภาพกิจกรรม ${index + 1}`} className="w-full h-auto object-contain group-hover:scale-102 transition-transform duration-300 rounded-lg" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                          <svg className="w-6 h-6 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                  <svg className="w-10 h-10 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  ไม่มีรูปภาพกิจกรรม
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal สำหรับแสดงภาพขนาดใหญ่ */}
      {selectedImage && (
        <div onClick={() => setSelectedImage(null)} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
            <button onClick={() => setSelectedImage(null)} className="absolute -top-10 right-0 text-white hover:text-amber-300 transition-colors p-2 cursor-pointer">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img src={selectedImage} alt="ภาพกิจกรรมขนาดใหญ่" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/10" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}
    </div>
  );
}