'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function EditNursingPage() {
  const params = useParams();
  const router = useRouter();
  const idParam = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [departmentId, setDepartmentId] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [headName, setHeadName] = useState('');
  const [headPosition, setHeadPosition] = useState('');
  const [headInfo, setHeadInfo] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [characteristics, setCharacteristics] = useState('');
  const [highlightWork, setHighlightWork] = useState('');
  
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [highlightWorks, setHighlightWorks] = useState<any[]>([]);
  const [downloadFiles, setDownloadFiles] = useState<any[]>([]);

  const nursingDepartments: { [key: string]: string } = {
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

  useEffect(() => {
    if (!idParam) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const cleanId = String(idParam).replace('branch-', '');
        setDepartmentId(cleanId);

        // 1. ดึงชื่อกลุ่มงานจากตาราง nursing_departments
        const { data: deptData } = await supabase
          .from('nursing_departments')
          .select('department_name')
          .eq('id', cleanId)
          .single();

        if (deptData && deptData.department_name) {
          setDepartmentName(deptData.department_name);
        } else {
          setDepartmentName(nursingDepartments[cleanId] || `กลุ่มงานการพยาบาล สาขาที่ ${cleanId}`);
        }

        // 2. ดึงข้อมูลเนื้อหาฟอร์มจาก department_content
        const { data: contentData } = await supabase
          .from('department_content')
          .select('*')
          .eq('department_id', cleanId)
          .single();

        if (contentData) {
          setHeadName(contentData.head_name || '');
          setHeadPosition(contentData.head_position || '');
          setHeadInfo(contentData.head_info || '');
          setVideoUrl(contentData.video_url || '');
          setCharacteristics(contentData.characteristics || '');
          setHighlightWorks(Array.isArray(contentData.highlight_works) ? contentData.highlight_works : []);
          setGalleryImages(contentData.gallery_images || []);
          setDownloadFiles(contentData.documents || []); 
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [idParam]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const cleanId = String(idParam).replace('branch-', '');

      const { data: existing } = await supabase
        .from('department_content')
        .select('id')
        .eq('department_id', cleanId);

      const payload = {
        department_id: cleanId,
        head_name: headName,
        head_position: headPosition,
        head_info: headInfo,
        video_url: videoUrl,
        characteristics: characteristics,
        highlight_works: highlightWorks, // ถ้าใช้ช่องกรอกแบบเดี่ยว
        gallery_images: galleryImages,
        documents: downloadFiles, // เปลี่ยนจาก documents เดิม หรือดึงจาก state downloadFiles มาเก็บไว้ที่นี่ครับ
      };

      if (existing && existing.length > 0) {
        const { error } = await supabase
          .from('department_content')
          .update(payload)
          .eq('id', existing[0].id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('department_content')
          .insert([payload]);

        if (error) throw error;
      }

      alert('บันทึกข้อมูลสำเร็จ!');
      router.push(`/dashboard/nursing/${idParam}`);
      router.refresh();
    } catch (err: any) {
      // ดึงรายละเอียด Error ออกมาแสดงผลให้ชัดเจน
      console.error('Error saving data details:', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        fullError: err
      });
      alert(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${err?.message || JSON.stringify(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddGallery = () => {
    setGalleryImages([...galleryImages, { url: '', caption: '', link: '' }]);
  };

  const handleGalleryChange = (index: number, field: string, value: string) => {
    const newGallery = [...galleryImages];
    newGallery[index][field] = value;
    setGalleryImages(newGallery);
  };

  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `head-images/${fileName}`;

      // อัปโหลดไปที่ Supabase Storage (สมมติว่า Bucket ชื่อ 'nursing-images' ให้เปลี่ยนตามจริงของคุณ)
      const { error: uploadError } = await supabase.storage
        .from('nursing-images') 
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // ดึง Public URL ของไฟล์ที่อัปโหลด
      const { data } = supabase.storage
        .from('nursing-images')
        .getPublicUrl(filePath);

      setHeadInfo(data.publicUrl); // นำ URL มาใส่ใน state ของรูปภาพหัวหน้าทันที
      alert('อัปโหลดรูปภาพสำเร็จ!');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveGallery = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  if (loading) {
    return <div className="p-10 text-center text-emerald-800">กำลังโหลดฟอร์มแก้ไข...</div>;
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6 md:p-12 flex justify-center">
      <div className="max-w-4xl w-full bg-white border border-amber-200 rounded-2xl p-6 md:p-10 shadow-sm space-y-8">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-amber-200 pb-4 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">
              {departmentName || 'กำลังโหลดชื่อกลุ่มงาน...'}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-emerald-800 hover:text-amber-600 font-semibold text-sm transition-colors cursor-pointer"
          >
            ← ย้อนกลับ
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* ข้อมูลหัวหน้ากลุ่มงาน */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-emerald-900">ชื่อ-นามสกุล หัวหน้า</label>
              <input
                type="text"
                value={headName}
                onChange={(e) => setHeadName(e.target.value)}
                className="w-full border border-stone-300 rounded-lg p-2.5 text-sm bg-white"
                placeholder="ชื่อหัวหน้ากลุ่มงาน"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-emerald-900">ตำแหน่งหัวหน้า</label>
              <input
                type="text"
                value={headPosition}
                onChange={(e) => setHeadPosition(e.target.value)}
                className="w-full border border-stone-300 rounded-lg p-2.5 text-sm bg-white"
                placeholder="ตำแหน่ง"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-emerald-900">อัปโหลดรูปภาพหัวหน้า</label>
              <div className="space-y-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      setUploading(true); // อย่าลืมประกาศ state uploading ไว้ด้วยนะครับ
                      const fileExt = file.name.split('.').pop();
                      const fileName = `head-${Math.random()}.${fileExt}`;
                      const filePath = `nursing-heads/${fileName}`;

                      const { error: uploadError } = await supabase.storage
                        .from('nursing-images')
                        .upload(filePath, file);

                      if (uploadError) throw uploadError;

                      const { data } = supabase.storage
                        .from('nursing-images')
                        .getPublicUrl(filePath);

                      setHeadInfo(data.publicUrl); // เก็บ URL ลับไว้ในตัวแปร headInfo เหมือนเดิมเพื่อให้ระบบบันทึกลงฐานข้อมูล
                      alert('อัปโหลดรูปภาพหัวหน้าสำเร็จ!');
                    } catch (err) {
                      console.error('Error uploading head image:', err);
                      alert('อัปโหลดรูปภาพไม่สำเร็จ');
                    } finally {
                      setUploading(false);
                    }
                  }}
                  className="w-full border border-stone-300 rounded-lg p-1.5 text-xs bg-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
                {headInfo && (
                  <p className="text-[10px] text-emerald-700 truncate">
                    ✓ อัปโหลดแล้ว (<a href={headInfo} target="_blank" rel="noopener noreferrer" className="underline">ดูรูป</a>)
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-emerald-900">URL วีดีโอแนะนำกลุ่มงาน (YouTube)</label>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full border border-stone-300 rounded-xl p-3 text-sm"
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-emerald-900">ลักษณะงานของกลุ่มงาน (HTML / ข้อความ)</label>
            <textarea
              rows={4}
              value={characteristics}
              onChange={(e) => setCharacteristics(e.target.value)}
              className="w-full border border-stone-300 rounded-xl p-3 text-sm"
              placeholder="รายละเอียดลักษณะงาน..."
            />
          </div>

         {/* จัดการภาพกิจกรรม (Gallery) */}
  <div className="space-y-4 bg-emerald-50/50 p-5 rounded-xl border border-emerald-200">
    <div className="flex items-center justify-between">
      <div>
        <label className="block text-sm font-bold text-emerald-900">ภาพกิจกรรมและรายละเอียดเพิ่มเติม</label>
        <p className="text-xs text-stone-500 mt-0.5">ภาพแรกจะแสดงผลในหน้าแรกหลัก รูปภาพอื่นๆ จะแสดงเมื่อคลิกดูรายละเอียด</p>
      </div>
      <button
        type="button"
        onClick={() => setGalleryImages([...galleryImages, { url: '', caption: '', link: '', uploading: false }])}
        className="bg-emerald-700 hover:bg-emerald-800 text-amber-100 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
      >
        + เพิ่มรูปภาพกิจกรรม
      </button>
    </div>

    {galleryImages.map((item, index) => (
      <div key={index} className="bg-white p-4 rounded-xl border border-amber-200 space-y-3 relative shadow-sm">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-emerald-800">
            รูปภาพที่ #{index + 1} {index === 0 && <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded ml-1 border border-amber-200">แสดงหน้าแรก</span>}
          </span>
          <button
            type="button"
            onClick={() => setGalleryImages(galleryImages.filter((_, i) => i !== index))}
            className="text-red-600 hover:text-red-800 text-xs font-semibold cursor-pointer"
          >
            ลบรูปนี้
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* เลือกไฟล์จากในเครื่อง (รองรับเลือกหลายไฟล์) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-600">อัปโหลดจากเครื่อง (เลือกได้หลายไฟล์)</label>
            <div className="flex gap-2">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;

                  try {
                    const newGallery = [...galleryImages];
                    newGallery[index].uploading = true;
                    setGalleryImages(newGallery);

                    const uploadedUrls: string[] = [];

                    for (let i = 0; i < files.length; i++) {
                      const file = files[i];
                      const fileExt = file.name.split('.').pop();
                      const fileName = `gallery-${Date.now()}-${Math.random()}.${fileExt}`;
                      const filePath = `nursing-gallery/${fileName}`;

                      const { error: uploadError } = await supabase.storage
                        .from('nursing-images')
                        .upload(filePath, file);

                      if (uploadError) throw uploadError;

                      const { data } = supabase.storage
                        .from('nursing-images')
                        .getPublicUrl(filePath);

                      uploadedUrls.push(data.publicUrl);
                    }

                    const updatedGallery = [...galleryImages];
                    updatedGallery[index].url = uploadedUrls[0];
                    updatedGallery[index].uploading = false;

                    const additionalItems = uploadedUrls.slice(1).map((url) => ({
                      url: url,
                      caption: '',
                      link: '',
                      uploading: false,
                    }));

                    setGalleryImages([...updatedGallery, ...additionalItems]);
                  } catch (err) {
                    console.error('Error uploading gallery images:', err);
                    alert('อัปโหลดรูปภาพไม่สำเร็จ');
                    const newGallery = [...galleryImages];
                    newGallery[index].uploading = false;
                    setGalleryImages(newGallery);
                  }
                }}
                className="w-full border border-stone-300 rounded-lg p-1.5 text-xs file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
              />
            </div>
            {item.uploading && <p className="text-[10px] text-amber-600">กำลังอัปโหลดรูปภาพ...</p>}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-600">หรือระบุลิงก์ URL รูปภาพ</label>
            <input
              type="text"
              value={item.url || ''}
              onChange={(e) => {
                const newGallery = [...galleryImages];
                newGallery[index].url = e.target.value;
                setGalleryImages(newGallery);
              }}
              placeholder="https://..."
              className="w-full border border-stone-300 rounded-lg p-2 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
          <input
            type="text"
            value={item.link || ''}
            onChange={(e) => {
              const newGallery = [...galleryImages];
              newGallery[index].link = e.target.value;
              setGalleryImages(newGallery);
            }}
            placeholder="ลิงก์เว็บไซต์ภายนอก (ถ้ามี)"
            className="w-full border border-stone-300 rounded-lg p-2 text-xs"
          />
        </div>

        <textarea
          rows={2}
          value={item.caption || ''}
          onChange={(e) => {
            const newGallery2 = [...galleryImages];
            newGallery2[index].caption = e.target.value;
            setGalleryImages(newGallery2);
          }}
          placeholder="คำบรรยายภาพ หรือรายละเอียดเพิ่มเติม"
          className="w-full border border-stone-300 rounded-lg p-2 text-xs"
        />
      </div>
    ))}
  </div>

          {/* จัดการผลงานเด่น (รองรับรูปภาพ, ไฟล์ PDF และคำบรรยาย) */}
  <div className="space-y-4 bg-emerald-50/50 p-5 rounded-xl border border-emerald-200">
    <div className="flex items-center justify-between">
      <div>
        <label className="block text-sm font-bold text-emerald-900">ผลงานเด่น</label>
        <p className="text-xs text-stone-500 mt-0.5">สามารถเพิ่มรูปภาพ ไฟล์ PDF และคำบรรยายผลงานเด่นได้</p>
      </div>
      <button
        type="button"
        onClick={() => setHighlightWorks([...highlightWorks, { fileUrl: '', fileType: 'image', caption: '', uploading: false }])}
        className="bg-emerald-700 hover:bg-emerald-800 text-amber-100 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
      >
        + เพิ่มผลงานเด่น
      </button>
    </div>

    {Array.isArray(highlightWorks) && highlightWorks.map((item, index) => (
     <div key={index} className="bg-white p-4 rounded-xl border border-amber-200 space-y-3 relative shadow-sm">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-emerald-800">
            ผลงานที่ #{index + 1}
          </span>
          <button
            type="button"
            onClick={() => setHighlightWorks(highlightWorks.filter((_, i) => i !== index))}
            className="text-red-600 hover:text-red-800 text-xs font-semibold cursor-pointer"
          >
            ลบผลงานนี้
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* เลือกไฟล์จากในเครื่อง (รองรับทั้งรูปภาพและ PDF) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-600">อัปโหลดไฟล์ (รูปภาพ หรือ PDF)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                try {
                  const newWorks = [...highlightWorks];
                  newWorks[index].uploading = true;
                  setHighlightWorks(newWorks);

                  const fileExt = file.name.split('.').pop();
                  const isPdf = file.type === 'application/pdf' || fileExt?.toLowerCase() === 'pdf';
                  const fileName = `highlight-${Date.now()}-${Math.random()}.${fileExt}`;
                  const filePath = `nursing-highlights/${fileName}`;

                  const { error: uploadError } = await supabase.storage
                    .from('nursing-images')
                    .upload(filePath, file);

                  if (uploadError) throw uploadError;

                  const { data } = supabase.storage
                    .from('nursing-images')
                    .getPublicUrl(filePath);

                  newWorks[index].fileUrl = data.publicUrl;
                  newWorks[index].fileType = isPdf ? 'pdf' : 'image';
                  newWorks[index].uploading = false;
                  setHighlightWorks(newWorks);
                } catch (err) {
                  console.error('Error uploading highlight file:', err);
                  alert('อัปโหลดไฟล์ไม่สำเร็จ');
                  const newWorks = [...highlightWorks];
                  newWorks[index].uploading = false;
                  setHighlightWorks(newWorks);
                }
              }}
              className="w-full border border-stone-300 rounded-lg p-1.5 text-xs file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
            />
            {item.uploading && <p className="text-[10px] text-amber-600">กำลังอัปโหลดไฟล์...</p>}
            {item.fileUrl && (
              <p className="text-[10px] text-emerald-700 truncate">
                ✓ ไฟล์ปัจจุบัน: <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="underline">{item.fileUrl}</a> ({item.fileType.toUpperCase()})
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-600">หรือระบุลิงก์ URL ไฟล์</label>
            <input
              type="text"
              value={item.fileUrl || ''}
              onChange={(e) => {
                const newWorks = [...highlightWorks];
                newWorks[index].fileUrl = e.target.value;
                // ตรวจสอบเบื้องต้นว่าเป็นลิงก์ PDF หรือไม่
                if (e.target.value.toLowerCase().includes('.pdf')) {
                  newWorks[index].fileType = 'pdf';
                } else {
                  newWorks[index].fileType = 'image';
                }
                setHighlightWorks(newWorks);
              }}
              placeholder="https://..."
              className="w-full border border-stone-300 rounded-lg p-2 text-xs"
            />
          </div>
        </div>

        <textarea
          rows={2}
          value={item.caption || ''}
          onChange={(e) => {
            const newWorks = [...highlightWorks];
            newWorks[index].caption = e.target.value;
            setHighlightWorks(newWorks);
          }}
          placeholder="คำบรรยายผลงานเด่น..."
          className="w-full border border-stone-300 rounded-lg p-2 text-xs"
        />
      </div>
    ))}
  </div>

    {/* จัดการเอกสารดาวน์โหลด */}
<div className="space-y-4 bg-emerald-50/50 p-5 rounded-xl border border-emerald-200">
  <div className="flex items-center justify-between">
    <div>
      <label className="block text-sm font-bold text-emerald-900">เอกสารดาวน์โหลด</label>
      <p className="text-xs text-stone-500 mt-0.5">เพิ่มไฟล์เอกสารคู่มือ คำสั่ง หรือแบบฟอร์มเพื่อให้ดาวน์โหลด</p>
    </div>
    <button
      type="button"
      onClick={() => setDownloadFiles([...downloadFiles, { title: '', fileUrl: '', uploading: false }])}
      className="bg-emerald-700 hover:bg-emerald-800 text-amber-100 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
    >
      + เพิ่มเอกสาร
    </button>
  </div>

  {downloadFiles.map((item, index) => (
    <div key={index} className="bg-white p-4 rounded-xl border border-amber-200 space-y-3 relative shadow-sm">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-emerald-800">
          เอกสารที่ #{index + 1}
        </span>
        <button
          type="button"
          onClick={() => setDownloadFiles(downloadFiles.filter((_, i) => i !== index))}
          className="text-red-600 hover:text-red-800 text-xs font-semibold cursor-pointer"
        >
          ลบเอกสารนี้
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-stone-600">ชื่อเอกสารสำหรับแสดงผล</label>
        <input
          type="text"
          value={item.title || ''}
          onChange={(e) => {
            const newFiles = [...downloadFiles];
            newFiles[index].title = e.target.value;
            setDownloadFiles(newFiles);
          }}
          placeholder="เช่น คู่มือการปฏิบัติงาน ปี 2569"
          className="w-full border border-stone-300 rounded-lg p-2 text-xs"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* เลือกไฟล์จากในเครื่อง */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-stone-600">อัปโหลดไฟล์เอกสาร (PDF, Word, Excel ฯลฯ)</label>
          <input
            type="file"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              try {
                const newFiles = [...downloadFiles];
                newFiles[index].uploading = true;
                setDownloadFiles(newFiles);

                const fileExt = file.name.split('.').pop();
                const fileName = `doc-${Date.now()}-${Math.random()}.${fileExt}`;
                const filePath = `nursing-documents/${fileName}`;

                const { error: uploadError } = await supabase.storage
                  .from('nursing-images')
                  .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                  .from('nursing-images')
                  .getPublicUrl(filePath);

                newFiles[index].fileUrl = data.publicUrl;
                // ถ้ายังไม่ได้กรอกชื่อเอกสาร ให้ดึงชื่อไฟล์มาใส่เป็นชื่อตั้งต้นให้อัตโนมัติ
                if (!newFiles[index].title) {
                  newFiles[index].title = file.name;
                }
                newFiles[index].uploading = false;
                setDownloadFiles(newFiles);
              } catch (err) {
                console.error('Error uploading document:', err);
                alert('อัปโหลดไฟล์ไม่สำเร็จ');
                const newFiles = [...downloadFiles];
                newFiles[index].uploading = false;
                setDownloadFiles(newFiles);
              }
            }}
            className="w-full border border-stone-300 rounded-lg p-1.5 text-xs file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
          />
          {item.uploading && <p className="text-[10px] text-amber-600">กำลังอัปโหลดเอกสาร...</p>}
          {item.fileUrl && (
            <p className="text-[10px] text-emerald-700 truncate">
              ✓ ไฟล์อัปโหลดแล้ว: <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="underline">{item.fileUrl}</a>
            </p>
          )}
        </div>

        {/* หรือระบุลิงก์ URL */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-stone-600">หรือระบุลิงก์ URL ไฟล์</label>
          <input
            type="text"
            value={item.fileUrl || ''}
            onChange={(e) => {
              const newFiles = [...downloadFiles];
              newFiles[index].fileUrl = e.target.value;
              setDownloadFiles(newFiles);
            }}
            placeholder="https://..."
            className="w-full border border-stone-300 rounded-lg p-2 text-xs"
          />
        </div>
      </div>
    </div>
  ))}
</div>

          <div className="pt-4 border-t border-amber-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-sm font-semibold hover:bg-stone-100 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-700 hover:bg-emerald-800 text-amber-100 px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}