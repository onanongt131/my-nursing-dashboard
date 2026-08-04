'use client';

import { useState } from 'react';

interface WpQaModalProps {
  isOpen: boolean;
  onClose: () => void;
  departmentId: string | number;
  departmentName: string;
  supabase: any;
  onSuccess: () => void;
}

const wpQaItems = [
  { id: 'WP-NUR-009-001-07', name: 'การป้องกันการบาดเจ็บเพิ่มขณะอยู่ในโรงพยาบาล' },
  { id: 'WP-NUR-009-002-07', name: 'การรับใหม่ – รับย้ายผู้ป่วย' },
  { id: 'WP-NUR-009-003-06', name: 'ผู้ป่วยที่มีอาการรบกวน ได้รับการช่วยเหลือบรรเทาอาการ และเอาใจใส่อย่างเหมาะสม' },
  { id: 'WP-NUR-009-004-08', name: 'การให้ยาทางปาก/ทางสายยาง' },
  { id: 'WP-NUR-009-005-08', name: 'การฉีดยาเข้าใต้ผิวหนัง' },
  { id: 'WP-NUR-009-006-08', name: 'การฉีดยาเข้ากล้ามเนื้อ' },
  { id: 'WP-NUR-009-007-07', name: 'การให้สารน้ำทางหลอดเลือดดำ' },
  { id: 'WP-NUR-009-008-06', name: 'การฉีดยาเข้าหลอดเลือดดำ' },
  { id: 'WP-NUR-009-009-07', name: 'การเฝ้าระวังสัญญาณชีพและอาการเปลี่ยนแปลงอย่างต่อเนื่องของผู้ป่วย' },
  { id: 'WP-NUR-009-010-06', name: 'การช่วยฟื้นคืนชีพ' },
  { id: 'WP-NUR-009-011-06', name: 'ผู้ป่วยที่มีผลการเฝ้าระวังอาการมีข้อบ่งชี้ที่ต้องรายงานแพทย์ได้รับรายงานภายใน 5 นาที' },
  { id: 'WP-NUR-009-012-06', name: 'ผู้ป่วยที่มี stat order ได้รับการตอบสนองการรักษาทันทีหรือไม่เกิน 30 นาที' },
  { id: 'WP-NUR-009-013-07', name: 'การป้องกันการเกิดแผลกดทับ' },
  { id: 'WP-NUR-009-014-06', name: 'การป้องกันผู้ป่วยกลับโดยไม่ได้รับอนุญาต' },
  { id: 'WP-NUR-009-015-07', name: 'การส่งต่อการดูแลต่อเนื่องที่โรงพยาบาลชุมชน โรงพยาบาลทั่วไป โรงพยาบาลศูนย์' },
  { id: 'WP-NUR-009-016-07', name: 'การส่งต่อการดูแลต่อเนื่องที่บ้าน' },
  { id: 'WP-NUR-009-017-07', name: 'การวางแผนจำหน่ายและการฟื้นฟูสภาพก่อนจำหน่ายผู้ป่วย' },
  { id: 'WP-NUR-009-018-07', name: 'การบริหารยาความเสี่ยงสูง' },
  { id: 'WP-NUR-009-019-09', name: 'การระบุตัวผู้ป่วย' },
  { id: 'WP-NUR-009-020-05', name: 'การป้องกันการเกิดพลัดตกหกล้มของผู้ป่วยในโรงพยาบาล' },
  { id: 'WP-NUR-009-021-00', name: 'แนวทางการระบุตัวผู้ป่วย (Patient Identification) ทารกแรกเกิด' },
  { id: 'WP-NUR-009-022-00', name: 'แนวทางการยึดตรึงท่อช่วยหายใจและการบาดเจ็บของผิวหนังจากการลอกพลาสเตอร์' },
];

export default function WpQaModal({
  isOpen,
  onClose,
  departmentId,
  departmentName,
  supabase,
  onSuccess,
}: WpQaModalProps) {
  const [saving, setSaving] = useState(false);
  const [auditMonth, setAuditMonth] = useState(new Date().toISOString().slice(0, 7)); // รูปแบบ YYYY-MM
  const [auditorName, setAuditorName] = useState('');
  
  // เก็บข้อมูลแต่ละหัวข้อ
  const [formData, setFormData] = useState<Record<string, { total_evaluated: string; total_practiced: string; unpracticed_reasons: string }>>({});

  if (!isOpen) return null;

  const handleChange = (id: string, field: string, value: string) => {
    setFormData(prev => {
      const currentItem = prev[id] || { total_evaluated: '', total_practiced: '', unpracticed_reasons: '' };
      const updatedItem = { ...currentItem, [field]: value };

      // ถ้าปรับจำนวนประเมินหรือปฏิบัติแล้วเท่ากัน ให้เคลียร์หมายเหตุทิ้ง
      if (field === 'total_evaluated' || field === 'total_practiced') {
        const evalVal = field === 'total_evaluated' ? value : currentItem.total_evaluated;
        const pracVal = field === 'total_practiced' ? value : currentItem.total_practiced;
        
        if (evalVal !== '' && pracVal !== '' && Number(evalVal) === Number(pracVal)) {
          updatedItem.unpracticed_reasons = '';
        }
      }

      return {
        ...prev,
        [id]: updatedItem
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId) return;

    setSaving(true);

    try {
      // ตรวจสอบความถูกต้อง
      for (const item of wpQaItems) {
        const itemData = formData[item.id];
        
        // 1. ตรวจสอบว่ากรอกจำนวนประเมินหรือยัง
        if (!itemData || itemData.total_evaluated === '' || isNaN(Number(itemData.total_evaluated))) {
          alert(`กรุณากรอก "จำนวนประเมิน" เป็นตัวเลขให้ครบทุกหัวข้อ (${item.id})`);
          setSaving(false);
          return;
        }

        const evaluated = Number(itemData.total_evaluated);
        const practiced = Number(itemData.total_practiced || 0);

        // 2. ห้ามใส่จำนวนประเมินเป็น 0 (ต้องใส่จำนวน หรือถ้าใส่ 0 ต้องบังคับระบุเหตุผล)
        if (evaluated === 0) {
          alert(`หัวข้อ ${item.id}: ห้ามใส่จำนวนประเมินเป็น 0 กรุณาระบุจำนวนหรือใส่เหตุผลในช่องหมายเหตุ`);
          setSaving(false);
          return;
        }

        // 3. ถ้าจำนวนปฏิบัติไม่เท่ากับจำนวนประเมิน หรือประเมินเป็น 0 ต้องใส่เหตุผล
        if (evaluated !== practiced && (!itemData.unpracticed_reasons || itemData.unpracticed_reasons.trim() === '')) {
          alert(`หัวข้อ ${item.id}: กรุณาระบุ "สิ่งที่ไม่ได้ปฏิบัติ / หมายเหตุ" เนื่องจากจำนวนปฏิบัติไม่ตรงกับจำนวนประเมิน`);
          setSaving(false);
          return;
        }
      }

      // แปลงข้อมูลให้อยู่ในรูป Array สำหรับบันทึกลง Database
      const recordsToInsert = wpQaItems.map(item => {
        const itemData = formData[item.id] || { total_evaluated: '0', total_practiced: '0', unpracticed_reasons: '' };
        const evaluated = Number(itemData.total_evaluated) || 0;
        const practiced = Number(itemData.total_practiced) || 0;

        return {
          department_id: Number(departmentId),
          audit_month: auditMonth,
          wp_id: item.id,
          wp_name: item.name,
          total_evaluated: evaluated,
          total_practiced: practiced,
          unpracticed_reasons: evaluated !== practiced ? (itemData.unpracticed_reasons || null) : null,
          auditor_name: auditorName || null,
          status: 'pending',
        };
      });

      const { error } = await supabase.from('wp_qa_records').insert(recordsToInsert);

      if (error) throw error;

      alert('บันทึกข้อมูลการประเมิน WP/QA ประจำเดือนสำเร็จ');
      onSuccess();
      onClose();
    } catch (error: any) {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-emerald-900 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">บันทึกการประเมิน WP/QA</h2>
            <p className="text-xs text-emerald-200">หน่วยงาน: {departmentName}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-xl font-bold">✕</button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ข้อมูลส่วนหัว: เดือนและชื่อผู้ประเมิน */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
            <div>
              <label className="block text-sm font-semibold text-emerald-900 mb-1">ประจำเดือน (Month)</label>
              <input 
                type="month" 
                value={auditMonth}
                onChange={(e) => setAuditMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-emerald-900 mb-1">ชื่อผู้ประเมิน / ผู้บันทึก</label>
              <input 
                type="text" 
                placeholder="ระบุชื่อ-นามสกุลผู้ประเมิน"
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          {/* ตารางหัวข้อ WP/QA */}
          <div className="border border-emerald-100 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-emerald-100/70 text-emerald-950 font-bold border-b border-emerald-200">
                  <th className="p-3 w-[40%]">หัวข้อ WP / QA</th>
                  <th className="p-3 w-[15%] text-center">จำนวนประเมิน</th>
                  <th className="p-3 w-[15%] text-center">จำนวนปฏิบัติ</th>
                  <th className="p-3 w-[30%]">สิ่งที่ไม่ได้ปฏิบัติ / หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {wpQaItems.map((item) => {
                  const evaluated = Number(formData[item.id]?.total_evaluated) || 0;
                  const practiced = Number(formData[item.id]?.total_practiced) || 0;
                  const isNotEqual = formData[item.id]?.total_evaluated !== '' && formData[item.id]?.total_practiced !== '' && evaluated !== practiced;

                  return (
                    <tr key={item.id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-emerald-900 text-xs">{item.id}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{item.name}</div>
                      </td>
                      <td className="p-3 text-center">
                        <input 
                          type="number" 
                          min="1"
                          placeholder="กรอก > 0"
                          value={formData[item.id]?.total_evaluated ?? ''}
                          onChange={(e) => handleChange(item.id, 'total_evaluated', e.target.value)}
                          className="w-24 mx-auto border border-gray-300 rounded p-1 text-center text-sm font-semibold"
                          required
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input 
                          type="number" 
                          min="0"
                          placeholder="0"
                          value={formData[item.id]?.total_practiced ?? ''}
                          onChange={(e) => handleChange(item.id, 'total_practiced', e.target.value)}
                          className="w-20 mx-auto border border-gray-300 rounded p-1 text-center text-sm font-semibold text-green-700"
                        />
                      </td>
                      <td className="p-3">
                        {isNotEqual || evaluated === 0 ? (
                          <input 
                            type="text" 
                            placeholder="ระบุเหตุผล/สิ่งที่ไม่ได้ปฏิบัติ..."
                            value={formData[item.id]?.unpracticed_reasons || ''}
                            onChange={(e) => handleChange(item.id, 'unpracticed_reasons', e.target.value)}
                            className="w-full border border-amber-300 bg-amber-50/30 rounded p-1.5 text-xs focus:ring-2 focus:ring-emerald-500 animate-fadeIn"
                            required
                          />
                        ) : (
                          <span className="text-xs text-gray-400 italic">- ครบถ้วน / ปกติ -</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium text-sm transition-colors"
            >
              ยกเลิก
            </button>
            <button 
              type="submit" 
              disabled={saving}
              className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-sm shadow transition-colors disabled:opacity-50"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล WP/QA'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}