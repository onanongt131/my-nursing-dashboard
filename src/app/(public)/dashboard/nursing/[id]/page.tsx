'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function NursingBranchPage() {
  const supabase = createClient();
  const params = useParams();
  const router = useRouter();
  const idParam = params?.id as string;

  const [departmentName, setDepartmentName] = useState('กลุ่มงานการพยาบาล');
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(true); // ตั้งเป็น true ไว้ก่อนเพื่อให้ปุ่มแสดง
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!idParam) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. ตรวจสอบสิทธิ์จากตาราง profiles (เหมือนหน้าอื่น)
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('email', user.email)
            .single();

          if (profile?.role?.toLowerCase().trim() === 'staff') {
            setCanEdit(false);
          } else {
            setCanEdit(true);
          }
        }

        // 2. ดึงข้อมูลรายชื่อกลุ่มงานทั้งหมดเพื่อเทียบชื่อ
        const { data: allDepts, error: deptError } = await supabase
          .from('nursing_departments')
          .select('*');

        if (deptError) console.error(deptError);

        let currentDept = null;
        let targetDeptId = null;

        if (allDepts && allDepts.length > 0) {
          const cleanId = String(idParam).replace('branch-', '');
          currentDept = allDepts.find((d: any) => 
            d.path === `/dashboard/nursing/${idParam}` || 
            d.path?.includes(`/${idParam}`) || 
            String(d.id) === cleanId
          );
        }

        const numericId = String(idParam).replace('branch-', '');

        if (currentDept) {
          setDepartmentName(currentDept.department_name);
          targetDeptId = currentDept.id;
        } else {
          const fallbackNames: Record<string, string> = {
            '1': 'การพยาบาลวิจัยและพัฒนาการบริการ',
            '2': 'การพยาบาลผู้ป่วยหนัก',
            '3': 'การพยาบาลผู้ป่วยอุบัติเหตุและฉุกเฉิน',
            '4': 'การพยาบาลผู้ป่วยผ่าตัด',
            '5': 'การพยาบาลผู้ป่วยอายุรกรรม',
            '6': 'การพยาบาลด้านการควบคุมและการป้องกันการติดเชื้อ',
            '7': 'การพยาบาลผู้ป่วยกุมารเวชกรรม',
            '8': 'การพยาบาลผู้ป่วยโสต ศอ นาสิก จักษุ',
            '9': 'การพยาบาลตรวจรักษาพิเศษ',
            '10': 'การพยาบาลผู้ป่วยศัลยกรรม',
            '11': 'การพยาบาลผู้ป่วยสูติ-นรีเวช',
            '12': 'การพยาบาลผู้ป่วยจิตเวช',
            '13': 'การพยาบาลผู้ป่วยนอก',
            '14': 'การพยาบาลวิสัญญี',
            '15': 'การพยาบาลผู้คลอด',
            '16': 'การพยาบาลผู้ป่วยออร์ปิดิกส์',
          };
          
          setDepartmentName(fallbackNames[numericId] ? `กลุ่มงาน${fallbackNames[numericId]}` : `กลุ่มงานการพยาบาล สาขาที่ ${numericId}`);
          targetDeptId = numericId;
        }

        // 3. ดึงข้อมูลเนื้อหาของกลุ่มงานจากตาราง department_content
        if (targetDeptId) {
          const { data: contentData } = await supabase
            .from('department_content')
            .select('*')
            .or(`department_id.eq.${targetDeptId},department_id.eq.${idParam}`);

          if (contentData && contentData.length > 0) {
            setContent(contentData[0]);
          } else {
            const { data: allContent } = await supabase.from('department_content').select('*');
            const matched = allContent?.find((c: any) => 
              String(c.department_id) === String(targetDeptId) || String(c.department_id) === String(numericId)
            );
            setContent(matched || null);
          }
        }

      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [idParam, supabase]);

  if (loading) return <div className="p-8 text-center text-emerald-800">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="pt-2 pb-6 px-6 md:px-8 space-y-6 bg-stone-50 min-h-screen">
      
      {/* ส่วนหัว: ชื่อกลุ่มงาน (ธีมเขียว-ทอง) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-amber-300">
        <h1 className="text-2xl md:text-3xl font-bold text-emerald-900 tracking-wide">
          {departmentName}
        </h1>
        {canEdit && (
          <button
            type="button"
            onClick={() => router.push(`/dashboard/nursing/${String(idParam)}/edit`)}
            className="bg-emerald-800 hover:bg-emerald-900 text-amber-300 font-semibold px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 border border-amber-400/50 cursor-pointer text-sm md:text-base"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {content ? 'เพิ่มข้อมูล' : 'เพิ่มข้อมูลกลุ่มงาน'}
          </button>
        )}
      </div>

      {/* Grid 4 คอลัมน์หลัก */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        
        {/* คอลัมน์ 1: หัวหน้ากลุ่มงาน + วีดีโอ */}
        <div className="flex flex-col gap-6 h-full">
          <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm flex flex-col items-center text-center">
            <div className="bg-emerald-800 text-amber-200 font-bold py-2.5 px-4 rounded-xl w-full mb-6 text-sm border border-amber-500/30">
              หัวหน้ากลุ่มงาน
            </div>

            {content?.head_info ? (
              <div className="w-full max-w-[220px] rounded-xl overflow-hidden border-2 border-amber-400 bg-emerald-50 mb-4 shadow-inner flex items-center justify-center">
                <img 
                  src={content.head_info} 
                  alt="หัวหน้ากลุ่มงาน" 
                  className="w-full h-auto max-h-[260px] object-contain" 
                />
              </div>
            ) : (
              <div className="w-full aspect-[4/3] max-w-[220px] rounded-xl border border-dashed border-emerald-300 flex items-center justify-center mb-4 bg-emerald-50/50">
                <span className="text-emerald-700/60 text-xs">ยังไม่มีรูปภาพ</span>
              </div>
            )}

            <h4 className="font-bold text-emerald-950">{content?.head_name || 'ยังไม่ได้ระบุชื่อ'}</h4>
            <p className="text-xs text-emerald-800/80 mt-1">{content?.head_position || 'ยังไม่ได้ระบุตำแหน่ง'}</p>
          </div>

          <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
            <div className="bg-emerald-800 text-amber-200 font-bold py-2.5 px-4 rounded-xl w-full mb-4 text-center text-sm border border-amber-500/30">
              วีดีโอแนะนำกลุ่มงาน
            </div>
            {content?.video_url ? (
              <div className="w-full aspect-video rounded-lg overflow-hidden border border-amber-300 bg-black flex items-center justify-center">
                <iframe 
                  className="w-full h-full" 
                  src={content.video_url.includes('watch?v=') ? content.video_url.replace('watch?v=', 'embed/') : content.video_url} 
                  title="วีดีโอแนะนำกลุ่มงาน"
                  allowFullScreen 
                />
              </div>
            ) : (
              <p className="text-emerald-800/60 text-center text-sm py-4">ไม่มีวีดีโอ</p>
            )}
          </div>
        </div>

        {/* คอลัมน์ 2: ลักษณะงาน + เอกสารดาวน์โหลด */}
        <div className="flex flex-col gap-6 h-full">
          <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
            <div className="bg-emerald-800 text-amber-200 font-bold py-2.5 px-4 rounded-xl w-full mb-4 text-center text-sm border border-amber-500/30">
              ลักษณะงานของกลุ่มงาน
            </div>

            <div className="relative">
              <div
                className={`text-stone-700 text-sm leading-relaxed transition-all duration-300 ${
                  isExpanded ? '' : 'line-clamp-[15]'
                }`}
                dangerouslySetInnerHTML={{ 
                  __html: content?.characteristics || '<span class="text-stone-400">ไม่มีข้อมูล</span>' 
                }}
              />
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
              >
                {isExpanded ? 'ย่อเนื้อหา' : 'อ่านต่อ...'}
              </button>
            </div>
          </div>

          <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="bg-emerald-800 text-amber-200 font-bold py-2.5 px-4 rounded-xl w-full text-center text-sm border border-amber-500/30">
              เอกสารดาวน์โหลด
            </div>

            <div className="space-y-2">
              {Array.isArray(content?.documents) && content.documents.length > 0 ? (
                content.documents.map((doc: any, index: number) => (
                  <a
                    key={index}
                    href={doc.fileUrl || doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-amber-200 hover:bg-emerald-50/80 transition-colors group shadow-sm"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="text-xs font-bold text-stone-700 group-hover:text-emerald-900 truncate">
                        {doc.title || "เอกสารดาวน์โหลด"}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 group-hover:bg-emerald-700 group-hover:text-white transition-colors flex-shrink-0 ml-2">
                      Download
                    </span>
                  </a>
                ))
              ) : (
                <p className="text-stone-400 text-center text-xs py-4">ไม่มีเอกสารดาวน์โหลด</p>
              )}
            </div>
          </div>
        </div>

        {/* คอลัมน์ 3: ภาพกิจกรรม */}
        <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm h-full flex flex-col">
          <div className="bg-emerald-800 text-amber-200 font-bold py-2.5 px-4 rounded-xl w-full mb-4 text-center text-sm border border-amber-500/30">
            ภาพกิจกรรม
          </div>
          
          <div className="flex-1 flex flex-col gap-6">
            {Array.isArray(content?.gallery_images) && content.gallery_images.length > 0 ? (
              content.gallery_images.slice(0, 5).map((item: any, index: number) => (
                <div key={index} className="space-y-3 pb-4 border-b border-stone-100 last:border-0">
                  <div className="w-full aspect-video rounded-xl overflow-hidden shadow-sm border border-stone-200">
                    <img 
                      src={item.url} 
                      alt={item.caption || "Activity"} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-stone-700 leading-relaxed line-clamp-2">
                      {item.caption || "กิจกรรมกลุ่มงาน"}
                    </p>
                    <a 
                      href={`/dashboard/nursing/${idParam}/activity-detail?index=${index}`}
                      className="inline-block text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline decoration-emerald-300 underline-offset-2"
                    >
                      ดูข้อมูลเพิ่มเติม →
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center border border-dashed border-emerald-200 rounded-lg bg-emerald-50/30 min-h-[150px]">
                <p className="text-stone-400 text-sm">ไม่มีรูปภาพกิจกรรม</p>
              </div>
            )}
          </div>
        </div>

        {/* คอลัมน์ 4: ผลงานเด่น */}
        <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm h-full flex flex-col">
          <div className="bg-emerald-800 text-amber-200 font-bold py-2.5 px-4 rounded-xl w-full mb-4 text-center text-sm border border-amber-500/30">
            ผลงานเด่น
          </div>
          
          <div className="space-y-4 flex-1">
            {Array.isArray(content?.highlight_works) && content.highlight_works.length > 0 ? (
              content.highlight_works.map((work: any, index: number) => {
                const fileUrl = work.fileUrl || work.url || work.image || "";
                const isPdf = fileUrl.toLowerCase().endsWith('.pdf') || fileUrl.toLowerCase().includes('.pdf');
                
                return (
                  <div key={index} className="p-3.5 bg-emerald-50/40 rounded-xl border border-amber-100 space-y-2.5">
                    <h5 className="text-xs font-bold text-emerald-900">
                      {work.title || work.name || `ผลงานที่ ${index + 1}`}
                    </h5>
                    
                    {(work.description || work.detail) && (
                      <p className="text-xs text-stone-600 leading-relaxed">
                        {work.description || work.detail}
                      </p>
                    )}

                    {fileUrl && (
                      <div className="pt-1">
                        {isPdf ? (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-amber-200 hover:bg-emerald-50/80 transition-colors group shadow-sm"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-inner">
                                PDF
                              </div>
                              <span className="text-xs font-bold text-stone-700 group-hover:text-emerald-900 truncate">
                                {work.title || "เอกสารผลงาน PDF"}
                              </span>
                            </div>
                            
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 group-hover:bg-emerald-700 group-hover:text-white transition-colors flex-shrink-0 ml-2">
                              Download
                            </span>
                          </a>
                        ) : (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full rounded-lg overflow-hidden border border-amber-200 shadow-sm bg-stone-100 group relative"
                          >
                            <img
                              src={fileUrl}
                              alt={work.title || "ผลงานเด่น"}
                              className="w-full h-auto object-contain group-hover:opacity-95 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white bg-black/60 px-2 py-1 rounded">คลิกเพื่อดูรูปใหญ่</span>
                            </div>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex-1 flex items-center justify-center border border-dashed border-emerald-200 rounded-lg bg-emerald-50/30 min-h-[120px]">
                <p className="text-stone-400 text-xs">ไม่มีข้อมูลผลงานเด่น</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}