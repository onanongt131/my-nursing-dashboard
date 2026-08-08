'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { PencilSquareIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Presentation } from 'lucide-react';

interface DepartmentEditorProps {
  departmentId: string | number;
  onClose?: () => void; 
}

export default function DepartmentEditor({ departmentId, onClose }: DepartmentEditorProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isEditing, setIsEditing] = useState(false); // สถานะสลับระหว่าง View กับ Edit

  const [presentationText, setPresentationText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // โหลดข้อมูลเดิมของหน่วยงาน
  useEffect(() => {
    async function fetchDeptInfo() {
      if (!departmentId) return;
      setFetching(true);
      try {
        // แปลง departmentId เป็น Number (หรือ String ตามประเภทของคอลัมน์ใน Supabase)
        const targetId = Number(departmentId); 

        const { data, error } = await supabase
          .from('department_profiles') 
          .select('presentation_text, video_url, image_url, document_url')
          .eq('department_id', targetId) 
          .maybeSingle();

        if (error) {
          console.error('Error fetching department profile:', JSON.stringify(error, null, 2));
        } else if (data) {
          setPresentationText(data.presentation_text || '');
          setVideoUrl(data.video_url || '');
          setImageUrl(data.image_url || ''); 
          setDocumentUrl(data.document_url || '');
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setFetching(false);
      }
    }
    fetchDeptInfo();
  }, [departmentId, supabase]);

  // ฟังก์ชันอัปโหลดไฟล์ไปยัง Supabase Storage
  const uploadFile = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${departmentId}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('department_files')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from('department_files').getPublicUrl(filePath);
    return data.publicUrl;
  };

  // บันทึกข้อมูล
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalImgUrl = imageUrl;
      let finalDocUrl = documentUrl;

      if (imageFile) {
        finalImgUrl = await uploadFile(imageFile, 'infographics');
      }

      if (docFile) {
        finalDocUrl = await uploadFile(docFile, 'documents');
      }

      // แก้ไขตรงนี้: ใช้ตาราง 'department_profiles' ให้ตรงกับที่ดึงข้อมูลมา
      const { error } = await supabase
        .from('department_profiles') 
        .upsert({
          department_id: departmentId, // ต้องระบุ ID เพื่อให้ทราบว่าอัปเดตของใคร
          presentation_text: presentationText,
          video_url: videoUrl,
          image_url: finalImgUrl,      // แก้ไขจาก infographic_url เป็น image_url
          document_url: finalDocUrl,
        }, { onConflict: 'department_id' }); // ใช้ onConflict เพื่อให้ Update ข้อมูลเดิมได้

      if (error) throw error;

      setImageUrl(finalImgUrl);
      setDocumentUrl(finalDocUrl);
      setImageFile(null);
      setDocFile(null);
      setIsEditing(false);
      
      if (onClose) onClose();
      window.location.reload();
    } catch (err: any) {
      console.error('Error saving profile:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="text-center py-6 text-gray-400 text-xs">กำลังโหลด...</div>;

  if (!isEditing) {
    const hasData = imageUrl || videoUrl || presentationText || documentUrl;

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-sm font-bold text-gray-800">ข้อมูลแนะนำหน่วยงาน</h3>
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-emerald-200"
          >
            <PencilSquareIcon className="w-4 h-4" />
            <span>แก้ไขข้อมูล</span>
          </button>
        </div>

        {!hasData ? (
          <div className="text-center py-8 text-gray-400 space-y-2">
            <p className="text-xs">ยังไม่มีข้อมูลแนะนำหน่วยงาน</p>
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
            >
              + เพิ่มข้อมูลแนะนำหน่วยงาน
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            {imageUrl && (
              <div 
                className="rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50 cursor-pointer transition hover:opacity-90"
                onClick={() => setIsModalOpen(true)}
              >
                <img src={imageUrl} alt="Infographic" className="w-full h-auto object-cover max-h-[400px]" />
              </div>
            )}

            {/* แสดงประกาศ / ข้อความ */}
            {presentationText && (
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-gray-700 leading-relaxed whitespace-pre-wrap">
                <p className="font-bold text-emerald-900 mb-1">📢 ประกาศ / ข้อมูลต้อนรับ:</p>
                {presentationText}
              </div>
            )}

            {/* แสดงวิดีโอ */}
            {videoUrl && (
              <div className="rounded-xl overflow-hidden border border-gray-100">
                <iframe
                  src={videoUrl}
                  title="Department Video"
                  className="w-full h-40"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {/* ลิงก์เอกสารเพิ่มเติม */}
            {documentUrl && (
              <div>
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-semibold"
                >
                  📄 ดาวน์โหลดเอกสารประกาศเพิ่มเติม
                </a>
              </div>
            )}

            {/* Modal ต้องอยู่ตรงนี้! ภายใน return ของโหมด View */}
            {isModalOpen && (
              <div 
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
                onClick={() => setIsModalOpen(false)}
              >
                <div className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center">
                  <button 
                    className="absolute -top-12 right-0 text-white bg-gray-800 px-4 py-2 rounded-lg font-bold hover:bg-gray-700"
                    onClick={(e) => { e.stopPropagation(); setIsModalOpen(false); }}
                  >
                    ปิด
                  </button>
                  <img src={imageUrl} alt="Expanded" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 text-xs">
      <div className="flex justify-between items-center border-b pb-3">
        <h3 className="text-sm font-bold text-gray-800">แก้ไขข้อมูลแนะนำหน่วยงาน</h3>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="text-gray-400 hover:text-gray-600 font-bold p-1 cursor-pointer"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* 1. อัปโหลดรูปภาพ */}
      <div className="space-y-1.5">
        <label className="font-bold text-gray-700 block">1. รูปภาพแนะนำหน่วยงาน (Infographic/Poster)</label>
        {imageUrl && !imageFile && (
          <div className="mb-2">
            <img src={imageUrl} alt="Current" className="h-20 rounded border object-contain" />
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files && setImageFile(e.target.files[0])}
          className="w-full text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border rounded-xl p-1"
        />
      </div>

      {/* 2. ลิงก์วิดีโอ */}
      <div className="space-y-1.5">
        <label className="font-bold text-gray-700 block">2. ลิงก์วิดีโอแนะนำหน่วยงาน (YouTube Embed URL)</label>
        <input
          type="text"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://www.youtube.com/embed/..."
          className="w-full p-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* 3. ข้อความประกาศ */}
      <div className="space-y-1.5">
        <label className="font-bold text-gray-700 block">3. ข้อความ / ประกาศ / ข้อมูลต้อนรับ</label>
        <textarea
          rows={3}
          value={presentationText}
          onChange={(e) => setPresentationText(e.target.value)}
          placeholder="ระบุข้อความต้อนรับ เวลาเยี่ยม หรือรายละเอียดอื่นๆ..."
          className="w-full p-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* 4. เอกสารประกาศ */}
      <div className="space-y-1.5">
        <label className="font-bold text-gray-700 block">เอกสารประกาศเพิ่มเติม (PDF / รูปภาพ)</label>
        <input
          type="file"
          accept=".pdf,image/*"
          onChange={(e) => e.target.files && setDocFile(e.target.files[0])}
          className="w-full text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border rounded-xl p-1"
        />
      </div>

      {/* ปุ่มบันทึกและยกเลิก */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <CheckIcon className="w-4 h-4" />
          <span>{loading ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}</span>
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition cursor-pointer"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}