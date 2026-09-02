'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useParams, useRouter } from 'next/navigation';

interface DocumentItem {
  name: string;
  url: string;
}

interface ActivityItem {
  url: string;
  external_link: string;
  caption: string;
}

export default function EditCommitteePage() {
  const params = useParams();
  const committeeKey = params?.key || 'qa';
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // เพิ่ม State สำหรับตรวจสอบสิทธิ์
  const [canEdit, setCanEdit] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  
  // ฟอร์มข้อมูลหลัก
  const [committeeName, setCommitteeName] = useState('');
  const [presidentName, setPresidentName] = useState('');
  const [presidentImage, setPresidentImage] = useState('');
  const [rolesAndDuties, setRolesAndDuties] = useState('');
  
  // เอกสาร
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  // รายชื่อคณะกรรมการ
  const [memberName, setMemberName] = useState('');
  const [memberPosition, setMemberPosition] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [membersImage, setMembersImage] = useState('');

  // ภาพกิจกรรมและรูปภาพอื่นๆ
  const [activityImages, setActivityImages] = useState<ActivityItem[]>([]);
  const [rolesImage, setRolesImage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // 1. ตรวจสอบสิทธิ์ผู้ใช้งานระบบ
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCanEdit(false);
      } else {
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
      setAuthChecking(false);

      // 2. ดึงข้อมูลเนื้อหาคณะกรรมการ
      const { data } = await supabase
        .from('committee_content')
        .select('*')
        .eq('committee_key', committeeKey)
        .single();

      if (data) {
        setCommitteeName(data.committee_name || '');
        setPresidentName(data.president_name || '');
        setPresidentImage(data.president_image || '');
        setRolesAndDuties(data.roles_and_duties || '');
        setDocuments(data.documents || []);
        setMembers(data.committee_members || []);
        setActivityImages(data.activity_images || []);
        setRolesImage(data.roles_image || '');
        setMembersImage(data.members_image || '');
      }
      setLoading(false);
    };

    fetchData();
  }, [committeeKey, supabase]);

  // ฟังก์ชันกลางสำหรับอัปโหลดรูปภาพทั่วไปไปที่ Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, setUrlFunc: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `committee/${fileName}`;

      const { error } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (error) {
        alert('อัปโหลดไฟล์ไม่สำเร็จ: ' + error.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        setUrlFunc(publicUrlData.publicUrl);
        alert('อัปโหลดรูปภาพสำเร็จ!');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('เกิดข้อผิดพลาดในการอัปโหลด');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      committee_key: committeeKey,
      committee_name: committeeName,
      president_name: presidentName,
      president_image: presidentImage,
      roles_and_duties: rolesAndDuties,
      documents: documents,
      committee_members: members,
      activity_images: activityImages,
      roles_image: rolesImage,
      members_image: membersImage,
    };

    const { data: existing } = await supabase
      .from('committee_content')
      .select('id')
      .eq('committee_key', committeeKey)
      .single();

    let error;
    if (existing) {
      const res = await supabase
        .from('committee_content')
        .update(payload)
        .eq('committee_key', committeeKey);
      error = res.error;
    } else {
      const res = await supabase
        .from('committee_content')
        .insert([payload]);
      error = res.error;
    }

    setSaving(false);

    if (error) {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
    } else {
      alert('บันทึกข้อมูลสำเร็จ!');
      router.push(`/dashboard/committee/${committeeKey}`);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-emerald-800 font-medium">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-emerald-100">
      <div className="flex items-center justify-between border-b-2 border-amber-400 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-emerald-900">
          แก้ไขข้อมูล: {committeeName || String(committeeKey).toUpperCase()}
        </h1>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium transition-colors cursor-pointer"
        >
          ย้อนกลับ
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ข้อมูลทั่วไป */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อคณะกรรมการ</label>
            <input
              type="text"
              value={committeeName}
              onChange={(e) => setCommitteeName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อประธานคณะกรรมการ</label>
            <input
              type="text"
              value={presidentName}
              onChange={(e) => setPresidentName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none"
            />
          </div>
        </div>

        {/* รูปภาพประธาน */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">รูปภาพประธานคณะกรรมการ</label>
          <div className="space-y-2">
            <input
              type="text"
              value={presidentImage}
              onChange={(e) => setPresidentImage(e.target.value)}
              placeholder="วาง URL รูปภาพ หรืออัปโหลดด้านล่าง"
              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none text-sm bg-white"
            />
            <div className="flex items-center gap-3">
              {presidentImage && (
                <img src={presidentImage} alt="Preview" className="w-12 h-16 object-cover rounded border" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, setPresidentImage)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100 cursor-pointer border rounded-xl p-1 bg-white"
              />
            </div>
          </div>
        </div>

        {/* บทบาทหน้าที่ */}
        <div className="space-y-3 p-4 bg-emerald-50/40 rounded-xl border border-emerald-100">
          <label className="block text-sm font-bold text-emerald-900">บทบาทหน้าที่ของคณะกรรมการ</label>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">แบบพิมพ์ข้อความ</label>
            <textarea
              rows={3}
              value={rolesAndDuties}
              onChange={(e) => setRolesAndDuties(e.target.value)}
              placeholder="พิมพ์บทบาทหน้าที่..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">หรือ รูปภาพบทบาทหน้าที่ (ใส่ URL หรืออัปโหลดไฟล์)</label>
            <input
              type="text"
              value={rolesImage}
              onChange={(e) => setRolesImage(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white text-sm mb-2"
            />
            <div className="flex items-center gap-3">
              {rolesImage && (
                <img src={rolesImage} alt="Roles Preview" className="w-16 h-12 object-cover rounded border" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, setRolesImage)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100 cursor-pointer border rounded-xl p-1 bg-white"
              />
            </div>
          </div>
        </div>

        {/* รายชื่อคณะกรรมการ */}
        <div className="space-y-3 p-4 bg-emerald-50/40 rounded-xl border border-emerald-100 border-t">
          <label className="block text-sm font-bold text-emerald-900">รายชื่อคณะกรรมการ</label>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">รูปภาพเอกสารรายชื่อ (ใส่ URL หรืออัปโหลดไฟล์)</label>
            <input
              type="text"
              value={membersImage}
              onChange={(e) => setMembersImage(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white text-sm mb-2"
            />
            <div className="flex items-center gap-3 mb-3">
              {membersImage && (
                <img src={membersImage} alt="Members Preview" className="w-16 h-12 object-cover rounded border" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, setMembersImage)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100 cursor-pointer border rounded-xl p-1 bg-white"
              />
            </div>
          </div>
          <hr className="border-gray-200" />
          <label className="block text-xs font-semibold text-gray-600 mb-1">หรือ แบบพิมพ์รายชื่อเป็นรายการ</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="ชื่อ-นามสกุล กรรมการ"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              className="flex-2 px-3 py-2 rounded-lg border text-sm bg-white"
            />
            <input
              type="text"
              placeholder="ตำแหน่ง"
              value={memberPosition}
              onChange={(e) => setMemberPosition(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border text-sm bg-white"
            />
            <button
              type="button"
              onClick={() => {
                if (memberName) {
                  setMembers([...members, { name: memberName, position: memberPosition }]);
                  setMemberName('');
                  setMemberPosition('');
                }
              }}
              className="bg-emerald-800 text-amber-300 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
            >
              เพิ่ม
            </button>
          </div>
          <ul className="space-y-1 text-sm text-gray-600">
            {members.map((m, idx) => (
              <li key={idx} className="flex justify-between items-center bg-white px-3 py-1.5 rounded-lg border">
                <span>{m.name} {m.position && `(${m.position})`}</span>
                <button
                  type="button"
                  onClick={() => setMembers(members.filter((_, i) => i !== idx))}
                  className="text-red-500 text-xs font-bold cursor-pointer"
                >
                  ลบ
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* รายการการ์ดเอกสาร */}
        <div className="border-t pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200">
            <div>
              <h3 className="font-bold text-emerald-900 text-base">รายการเอกสารดาวน์โหลด</h3>
              <p className="text-xs text-gray-500">จัดการไฟล์เอกสารสำหรับให้ผู้ใช้งานดาวน์โหลด</p>
            </div>
            <button
              type="button"
              onClick={() => setDocuments([...documents, { name: '', url: '' }])}
              className="bg-emerald-800 hover:bg-emerald-900 text-amber-300 font-semibold px-4 py-2 rounded-xl shadow-sm text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>+ เพิ่มเอกสาร</span>
            </button>
          </div>

          <div className="space-y-4">
            {documents.map((doc: DocumentItem, index: number) => {
              const displayIndex = documents.length - index;

              return (
                <div key={index} className="p-4 sm:p-5 bg-white rounded-2xl border-2 border-amber-300/60 shadow-sm relative space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <span className="font-bold text-emerald-900 text-sm">เอกสารที่ #{displayIndex}</span>
                    <button
                      type="button"
                      onClick={() => setDocuments(documents.filter((_, i) => i !== index))}
                      className="text-red-600 hover:text-red-700 font-semibold text-xs cursor-pointer bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      ลบเอกสารนี้
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อเอกสาร</label>
                    <input
                      type="text"
                      placeholder="ระบุชื่อเอกสาร..."
                      value={doc.name || ''}
                      onChange={(e) => {
                        const updated = [...documents];
                        updated[index].name = e.target.value;
                        setDocuments(updated);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">อัปโหลดไฟล์จากเครื่อง</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id={`doc-file-${index}`}
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            setUploading(true);
                            try {
                              const fileExt = file.name.split('.').pop();
                              const fileName = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
                              const filePath = `committee/docs_${fileName}`;

                              const { error: uploadError } = await supabase.storage
                                .from('images')
                                .upload(filePath, file);

                              if (uploadError) {
                                alert('อัปโหลดไฟล์ไม่สำเร็จ: ' + uploadError.message);
                                return;
                              }

                              const { data: publicUrlData } = supabase.storage
                                .from('images')
                                .getPublicUrl(filePath);

                              if (publicUrlData?.publicUrl) {
                                const updated = [...documents];
                                updated[index].url = publicUrlData.publicUrl;
                                if (!updated[index].name) {
                                  updated[index].name = file.name;
                                }
                                setDocuments(updated);
                              }
                            } catch (err) {
                              console.error('Upload doc error:', err);
                              alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
                            } finally {
                              setUploading(false);
                              e.target.value = '';
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById(`doc-file-${index}`)?.click()}
                          className="bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          เลือกไฟล์
                        </button>
                        <span className="text-xs text-gray-500 truncate flex-1">
                          {doc.url ? 'อัปโหลดไฟล์เรียบร้อยแล้ว' : 'ไม่ได้เลือกไฟล์ใด'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">หรือระบุ URL ลิงก์ไฟล์</label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={doc.url || ''}
                        onChange={(e) => {
                          const updated = [...documents];
                          updated[index].url = e.target.value;
                          setDocuments(updated);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {documents.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm">
                ยังไม่มีรายการเอกสาร คลิกปุ่ม "+ เพิ่มเอกสาร" ด้านบนเพื่อเริ่มต้น
              </div>
            )}
          </div>
        </div>

        {/* ภาพกิจกรรมและรายละเอียดเพิ่มเติม */}
        <div className="border-t pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200">
            <div>
              <h3 className="font-bold text-emerald-900 text-base">ภาพกิจกรรมและรายละเอียดเพิ่มเติม</h3>
              <p className="text-xs text-gray-500">ภาพแรกจะแสดงผลในหน้าแรกหลัก รูปภาพอื่นๆ จะแสดงเมื่อคลิกดูรายละเอียด</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newItem = { url: '', external_link: '', caption: '' };
                setActivityImages([newItem, ...activityImages]);
              }}
              className="bg-emerald-800 hover:bg-emerald-900 text-amber-300 font-semibold px-4 py-2 rounded-xl shadow-sm text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>+ เพิ่มรูปภาพกิจกรรม</span>
            </button>
          </div>

          <div className="space-y-4">
            {activityImages.map((item: ActivityItem, index: number) => {
              const displayIndex = activityImages.length - index;
              const isFirst = index === 0;

              return (
                <div key={index} className="p-4 sm:p-5 bg-white rounded-2xl border-2 border-amber-300/60 shadow-sm relative space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-900 text-sm">รูปภาพที่ #{displayIndex}</span>
                      {isFirst && (
                        <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-md border border-amber-300">
                          แสดงหน้าแรก
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivityImages(activityImages.filter((_, i) => i !== index))}
                      className="text-red-600 hover:text-red-700 font-semibold text-xs cursor-pointer bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      ลบรูปนี้
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">อัปโหลดจากเครื่อง</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          id={`activity-file-${index}`}
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            setUploading(true);
                            try {
                              const fileExt = file.name.split('.').pop();
                              const fileName = `activity_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
                              const filePath = `committee/${fileName}`;

                              const { error: uploadError } = await supabase.storage
                                .from('images')
                                .upload(filePath, file);

                              if (uploadError) {
                                alert('อัปโหลดไม่สำเร็จ: ' + uploadError.message);
                                return;
                              }

                              const { data: publicUrlData } = supabase.storage
                                .from('images')
                                .getPublicUrl(filePath);

                              if (publicUrlData?.publicUrl) {
                                const updated = [...activityImages];
                                updated[index].url = publicUrlData.publicUrl;
                                setActivityImages(updated);
                              }
                            } catch (err) {
                              console.error('Upload error:', err);
                              alert('เกิดข้อผิดพลาดในการอัปโหลด');
                            } finally {
                              setUploading(false);
                              e.target.value = '';
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById(`activity-file-${index}`)?.click()}
                          className="bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          เลือกไฟล์
                        </button>
                        <span className="text-xs text-gray-500 truncate flex-1">
                          {item.url ? 'อัปโหลดรูปภาพแล้ว' : 'ไม่ได้เลือกไฟล์ใด'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">หรือระบุลิงก์ URL รูปภาพ</label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={item.url || ''}
                        onChange={(e) => {
                          const updated = [...activityImages];
                          updated[index].url = e.target.value;
                          setActivityImages(updated);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                      />
                    </div>
                  </div>

                  {item.url && (
                    <div className="w-24 h-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 relative">
                      <img src={item.url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">ลิงก์เว็บไซต์ภายนอก (ถ้ามี)</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={item.external_link || ''}
                      onChange={(e) => {
                        const updated = [...activityImages];
                        updated[index].external_link = e.target.value;
                        setActivityImages(updated);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">คำบรรยายภาพ หรือรายละเอียดเพิ่มเติม</label>
                    <textarea
                      rows={2}
                      placeholder="พิมพ์คำบรรยายภาพ..."
                      value={item.caption || ''}
                      onChange={(e) => {
                        const updated = [...activityImages];
                        updated[index].caption = e.target.value;
                        setActivityImages(updated);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-emerald-600 bg-white resize-y"
                    />
                  </div>
                </div>
              );
            })}

            {activityImages.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm">
                ยังไม่มีรูปภาพกิจกรรม คลิกปุ่ม "+ เพิ่มรูปภาพกิจกรรม" ด้านบนเพื่อเริ่มต้น
              </div>
            )}
          </div>
        </div>

        {/* ปุ่มบันทึก */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <button
            type="submit"
            disabled={saving || uploading}
            className="bg-emerald-800 hover:bg-emerald-900 text-amber-300 font-semibold px-6 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            {uploading ? 'กำลังอัปโหลดรูปภาพ...' : saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </button>
        </div>
      </form>
    </div>
  );
}