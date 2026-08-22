'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ActivityDetailPage() {
  const searchParams = useSearchParams();
  const urlParams = useParams();
  const router = useRouter();
  
  // รองรับการรับ id ทั้งจาก URL Route [id] และ Query String ?id=
  const id = urlParams.id || searchParams.get('id');
  const indexStr = searchParams.get('index');

  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState<any>(null);

  useEffect(() => {
    if (!id || indexStr === null) return;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const cleanId = String(id).replace('branch-', '');
        
        // ลองดึงข้อมูลทั้งหมดออกมาก่อนเพื่อเช็กความถูกต้องของการเชื่อมต่อ
        const { data, error } = await supabase
          .from('department_content')
          .select('*');

        if (error) {
          console.error('Supabase Error Details:', error.message, error.details, error.hint);
          throw error;
        }

        if (data && data.length > 0) {
          // ค้นหารายการที่ตรงกับ id หรือ cleanId ในฝั่ง JavaScript แทนเพื่อป้องกันปัญหาคิวรี .or() พลาด
          const matchedDept = data.find((item: any) => 
            String(item.department_id) === String(id) || 
            String(item.department_id) === String(cleanId) ||
            String(item.id) === String(cleanId)
          );

          if (matchedDept && matchedDept.gallery_images) {
            const gallery = matchedDept.gallery_images || [];
            const idx = indexStr ? parseInt(indexStr, 10) : 0;
            if (gallery[idx]) {
              setActivityData(gallery[idx]);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching activity detail:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id, indexStr]);

  if (loading) {
    return <div className="p-10 text-center text-emerald-800">กำลังโหลดข้อมูลกิจกรรม...</div>;
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6 md:p-12 flex justify-center">
      <div className="max-w-3xl w-full bg-white border border-amber-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        
        <button
          type="button"
          onClick={() => router.back()}
          className="text-emerald-800 hover:text-amber-600 font-semibold text-sm transition-colors"
        >
          ← ย้อนกลับ
        </button>

        <h1 className="text-2xl font-bold text-emerald-900">รายละเอียดภาพกิจกรรม</h1>

        {activityData ? (
          <div className="space-y-4">
            <div className="w-full aspect-video rounded-xl overflow-hidden border border-amber-200 bg-stone-100">
              <img 
                src={activityData.url} 
                alt={activityData.caption || "Activity Detail"} 
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-emerald-950">
                {activityData.caption || 'ไม่มีคำบรรยายภาพ'}
              </h2>
              
              {activityData.link && (
                <p>
                  <a 
                    href={activityData.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:underline text-sm font-medium"
                  >
                    🔗 ลิงก์เว็บไซต์ที่เกี่ยวข้อง
                  </a>
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-stone-500 text-center py-10">ไม่พบข้อมูลภาพกิจกรรมนี้</p>
        )}

      </div>
    </div>
  );
}