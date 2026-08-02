import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

interface AuditChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  departmentName?: string | any; // ปรับให้รองรับค่าที่เป็น any หรือ null ได้
  departmentId: string | null;
  supabase: ReturnType<typeof createClient>;
  onSuccess: () => void;
}

export default function AuditChartModal({
  isOpen,
  onClose,
  departmentName,
  departmentId,
  supabase,
  onSuccess,
}: AuditChartModalProps) {
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');

  // 1. เพิ่ม State ตรงนี้เพื่อเก็บค่าข้อมูลการ Audit ตาม item.id
  const [auditData, setAuditData] = useState<Record<string, string>>({});

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId) return;
    
    setSaving(true);

    // 1. เตรียม Object สำหรับบันทึกข้อมูลลงตาราง audit_chart_records
    // (ปรับชื่อ column ด้านซ้ายให้ตรงกับชื่อคอลัมน์จริงใน Database ของคุณครับ)
    const payload: Record<string, any> = {
      department_id: Number(departmentId),
      audit_date: auditData.audit_date || new Date().toISOString().split('T')[0],
      patient_hn: auditData.patient_hn || null,
      auditor_name: auditData.auditor_name || null,
      notes: auditData.notes || null,
    };

    // 2. นำข้อมูลคะแนนและหมายเหตุแต่ละข้อจาก auditData มาใส่ลงใน payload 
    // โดยวิ่งผ่าน Object keys ทั้งหมดที่เราเก็บไว้
    Object.keys(auditData).forEach((key) => {
      payload[key] = auditData[key];
    });

    const { error } = await supabase.from('audit_chart_records').insert([payload]);
    
    setSaving(false);
    
    if (error) {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
    } else {
      alert('บันทึกข้อมูล Audit Chart สำเร็จ');
      onSuccess();
      onClose(); // ปิด Modal หลังจากบันทึกสำเร็จ
    }
  };

  // ฟังก์ชันช่วยเรนเดอร์ข้อคำถามในแต่ละหมวดเพื่อให้โค้ดกระชับ
  const renderAuditItems = (items: { id: string; label: string }[]) => {
    return items.map(item => {
      const currentVal = auditData[item.id];
      return (
        <div key={item.id} className="p-3 bg-white border rounded-xl space-y-2">
          <div className="flex justify-between items-center gap-4">
            <span className="text-xs font-semibold text-gray-800">{item.label}</span>
            <input 
              type="text" 
              value={currentVal ?? ''} 
              onChange={e => {
                let val = e.target.value.toUpperCase();
                if (val === '' || val === 'N' || val === 'NA' || ['1', '2', '3', '4'].includes(val)) {
                  setAuditData({...auditData, [item.id]: val});
                }
              }} 
              placeholder="1-4 หรือ NA"
              maxLength={2}
              className="w-20 border rounded p-1 text-center font-bold text-sm bg-gray-50 uppercase" 
            />
          </div>
          {currentVal !== '' && currentVal !== 'NA' && Number(currentVal) < 4 && (
            <input 
              type="text" 
              required 
              value={auditData[item.id + '_note'] || ''} 
              onChange={e => setAuditData({...auditData, [item.id + '_note']: e.target.value})} 
              placeholder="⚠️ ระบุหมายเหตุข้อบกพร่อง..." 
              className="w-full border border-amber-300 bg-amber-50 rounded p-1.5 text-xs text-gray-800" 
            />
          )}
        </div>
      );
    });
  };

  return (
    <div className="fixed inset-0 bg-emerald-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-emerald-100 space-y-6 max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-lg font-extrabold text-emerald-950 flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="w-6 h-6 text-emerald-700" />
            บันทึกผล Audit Chart ({departmentName || 'ไม่ระบุหน่วยงาน'}) - คะแนนเต็ม 184
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
        </div>
        
        <form onSubmit={handleSave} className="space-y-6">
          {/* ข้อมูลทั่วไป */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">วันที่ Audit chart</label>
              <input 
                type="date" 
                required 
                value={auditData.audit_date || ''} 
                onChange={e => setAuditData({...auditData, audit_date: e.target.value})} 
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">HN ผู้ป่วย</label>
              <input 
                type="text" 
                required 
                value={auditData.patient_hn || ''} 
                onChange={e => setAuditData({...auditData, patient_hn: e.target.value})} 
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white" 
                placeholder="ใส่เลข HN เช่น 123456789" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">พยาบาล (Auditor)</label>
              <input 
                type="text" 
                required 
                value={auditData.auditor_name || ''} 
                onChange={e => setAuditData({...auditData, auditor_name: e.target.value})} 
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white" 
                placeholder="ใส่ชื่อพยาบาล" 
              />
            </div>
          </div>

          {/* ส่วนที่ 1: การบันทึกแรกรับ */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-emerald-900 bg-emerald-50 px-3 py-2 rounded-lg text-sm">ส่วนที่ 1: การบันทึกแรกรับ</h4>
            
            <div className="space-y-3 pl-2 border-l-2 border-emerald-200">
              <p className="text-xs font-bold text-emerald-800">1.1 การประเมิน (Assessment)</p>
              {renderAuditItems([
                { id: 's1_1_1', label: '1.1.1 ระบุวันเวลาที่รับไว้ในความดูแล' },
                { id: 's1_1_2', label: '1.1.2 บอกถึงข้อมูลสำคัญ และระยะเวลาที่ปรากฏอาการ' },
                { id: 's1_1_3', label: '1.1.3 มีข้อมูลประวัติการเจ็บป่วยปัจจุบัน ที่บอกปัญหา/สาเหตุ สุขภาพที่ปรากฏอย่างชัดเจน' },
                { id: 's1_1_4', label: '1.1.4 มีข้อมูลการเจ็บป่วยในอดีต ที่มีความสัมพันธ์เกี่ยวเนื่อง/มีผลต่อการเจ็บป่วย/ปัญหาสุขภาพ' },
                { id: 's1_1_5', label: '1.1.5 มีข้อมูล การตรวจร่างกาย ในระบบที่เกี่ยวข้องทั้งด้านร่างกาย จิตใจ อารมณ์ สังคม ที่สอดคล้องกับอาการสำคัญ และประวัติการเจ็บป่วย' },
                { id: 's1_1_6', label: '1.1.6 มีข้อมูลอาการ/อาการแสดงเมื่อแรกรับ ที่เพียงพอที่จะบอกถึงปัญหาสุขภาพ' },
              ])}
            </div>

            <div className="space-y-3 pl-2 border-l-2 border-emerald-200 pt-2">
              <p className="text-xs font-bold text-emerald-800">1.2 การวางแผน (Planning)</p>
              {renderAuditItems([
                { id: 's1_2_1', label: '1.2.1 การช่วยเหลือ จัดการ แก้ไข/บรรเทา ปัญหา/ภาวะฉุกเฉิน' },
                { id: 's1_2_2', label: '1.2.2 การช่วยเหลือ จัดการ แก้ไข/บรรเทา อาการรบกวน' },
                { id: 's1_2_3', label: '1.2.3 การป้องกันภาวะแทรกซ้อน หรือ ความเสี่ยงที่มีโอกาสเกิดขึ้น' },
                { id: 's1_2_4', label: '1.2.4 การเฝ้าระวัง อาการ/อาการแสดง ที่สำคัญ สอดคล้องกับปัญหาสุขภาพด้วยความถี่ที่เหมาะสม' },
                { id: 's1_2_5', label: '1.2.5 การให้ข้อมูลที่สำคัญ/จำเป็นแก่ผู้ป่วย/ผู้ใช้บริการ และญาติ' },
              ])}
            </div>

            <div className="space-y-3 pl-2 border-l-2 border-emerald-200 pt-2">
              <p className="text-xs font-bold text-emerald-800">1.3 การนำสู่การปฏิบัติ & 1.4 การประเมินผล</p>
              {renderAuditItems([
                { id: 's1_3_1', label: '1.3.1 มีการปฏิบัติตามกิจกรรมที่สอดคล้องกับแผนที่วางไว้' },
                { id: 's1_4_1', label: '1.4.1 มีการประเมินผลที่ชัดเจนและสะท้อนให้เห็นการดูแลที่ต่อเนื่อง' },
                { id: 's1_4_2', label: '1.4.2 ชื่อผู้บันทึกพร้อมตำแหน่ง' },
              ])}
            </div>
          </div>

          {/* ส่วนที่ 2: การบันทึกต่อเนื่อง */}
          <div className="space-y-4 pt-2">
            <h4 className="font-extrabold text-emerald-900 bg-emerald-50 px-3 py-2 rounded-lg text-sm">ส่วนที่ 2: การบันทึกต่อเนื่อง</h4>
            
            <div className="space-y-3 pl-2 border-l-2 border-emerald-200">
              <p className="text-xs font-bold text-emerald-800">2.1 เฝ้าระวังและควบคุมปัญหาวิกฤต/อาการรบกวนต่อเนื่อง</p>
              {renderAuditItems([
                { id: 's2_1_1_a', label: 'A : ประเมินสภาพในระบบที่ผิดปกติและที่เกี่ยวข้องอย่างต่อเนื่อง' },
                { id: 's2_1_1_p', label: 'P : วางแผนการพยาบาล ระบุปัญหา สาเหตุ และกิจกรรมการพยาบาล' },
                { id: 's2_1_1_i', label: 'I : มีการปฏิบัติตามกิจกรรมที่สอดคล้องกับแผนที่วางไว้' },
                { id: 's2_1_1_e', label: 'E : มีการประเมินผลที่ชัดเจนและสะท้อนให้เห็นการดูแลที่ต่อเนื่อง' },
                { id: 's2_1_1_n', label: 'ชื่อผู้บันทึกพร้อมตำแหน่ง' },
              ])}
            </div>

            <div className="space-y-3 pl-2 border-l-2 border-emerald-200 pt-2">
              <p className="text-xs font-bold text-emerald-800">2.2 ป้องกันภาวะแทรกซ้อนต่อเนื่อง</p>
              {renderAuditItems([
                { id: 's2_2_1_a', label: 'A : ประเมินสภาพต่อเนื่องเกี่ยวกับโอกาสเกิดภาวะแทรกซ้อน' },
                { id: 's2_2_1_p', label: 'P : วางแผนการพยาบาล ป้องกันภาวะแทรกซ้อนต่อเนื่อง ระบุ ปัญหา สาเหตุ และกิจกรรมการพยาบาล' },
                { id: 's2_2_1_i', label: 'I : มีการปฏิบัติตามกิจกรรมที่สอดคล้องกับแผนที่วางไว้' },
                { id: 's2_2_1_e', label: 'E : มีการประเมินผลที่ชัดเจนและสะท้อนให้เห็นการดูแลที่ต่อเนื่อง' },
                { id: 's2_2_1_n', label: 'ชื่อผู้บันทึกพร้อมตำแหน่ง' },
              ])}
            </div>

            <div className="space-y-3 pl-2 border-l-2 border-emerald-200 pt-2">
              <p className="text-xs font-bold text-emerald-800">2.3 ฟื้นฟูสภาพ</p>
              {renderAuditItems([
                { id: 's2_3_1_a', label: 'A : ประเมินสภาพต่อเนื่องเกี่ยวกับความต้องการและความสามารถในการฟื้นฟูสภาพ' },
                { id: 's2_3_1_p', label: 'P : วางแผนการพยาบาล ฟื้นฟูสภาพ ระบุความต้องการและกิจกรรมการพยาบาล' },
                { id: 's2_3_1_i', label: 'I : มีการปฏิบัติตามกิจกรรมที่สอดคล้องกับแผนที่วางไว้' },
                { id: 's2_3_1_e', label: 'E : มีการประเมินผลที่ชัดเจนและสะท้อนให้เห็นการดูแลที่ต่อเนื่อง' },
                { id: 's2_3_1_n', label: 'ชื่อผู้บันทึกพร้อมตำแหน่ง' },
              ])}
            </div>

            <div className="space-y-3 pl-2 border-l-2 border-emerald-200 pt-2">
              <p className="text-xs font-bold text-emerald-800">2.4 ประเมินความพร้อมของผู้ป่วยและญาติในการดูแลตนเอง</p>
              {renderAuditItems([
                { id: 's2_4_1_a', label: 'A : ประเมินความสามารถและการรับรู้ในการดูแลตนเองพร้อมทั้งระบุปัญหา/ความต้องการการดูแลต่อเนื่องที่บ้าน' },
                { id: 's2_4_1_p', label: 'P : วางแผนการดูแลต่อเนื่องที่บ้าน' },
                { id: 's2_4_1_i', label: 'I : มีการปฏิบัติตามแผนการดูแลต่อเนื่อง' },
                { id: 's2_4_1_e', label: 'E : ประเมินผลการปฏิบัติตามแผนและปรับปรุงแผนอย่างสม่ำเสมอ' },
                { id: 's2_4_1_n', label: 'ชื่อผู้บันทึกพร้อมตำแหน่ง' },
              ])}
            </div>
          </div>

          {/* ส่วนที่ 3: การประเมินและบันทึกทางการแพทย์เฉพาะโรค/หัตถการ */}
          <div className="space-y-4 pt-2">
            <h4 className="font-extrabold text-emerald-900 bg-emerald-50 px-3 py-2 rounded-lg text-sm">ส่วนที่ 3: การวางแผนจำหน่าย</h4>
            <div className="space-y-3 pl-2 border-l-2 border-emerald-200">
              {renderAuditItems([
                { id: 's3_1', label: 'A : มีการเตรียมความพร้อมในการจำหน่ายโดยมีการคาดการณ์ ภาวะสุขภาพของผู้ป่วยก่อนจำหน่ายในด้านความสามารถ ทั้งด้านร่างกาย จิตใจ วิญญาณและสังคม ' },
                { id: 's3_2', label: 'P : กำหนดแผนการพยาบาลในการฟื้นฟูสภาพอย่างครอบคลุม' },
                { id: 's3_3', label: 'I " มีการปฏิบัติตามแผนที่วางไว้ (สอนให้ความรู้และให้ปฏิบัติ)' },
                { id: 's3_4', label: 'E " ประเมินผลตามความสามารถของผู้ป่วยและญาติในการดูแลตนเอง' },
                { id: 's3_5', label: 'ชื่อผู้บันทึกพร้อมตำแหน่ง' },
              ])}
            </div>
          </div>

          {/* ส่วนที่ 4: การจำหน่ายผู้ป่วย (Discharge Planning) */}
          <div className="space-y-4 pt-2">
            <h4 className="font-extrabold text-emerald-900 bg-emerald-50 px-3 py-2 rounded-lg text-sm">ส่วนที่ 4: การบันทึกวันจำหน่าย</h4>
            <div className="space-y-3 pl-2 border-l-2 border-emerald-200">
              {renderAuditItems([
                { id: 's4_1', label: '4.1 มีการบันทึกสัญญาณชีพก่อนการจำหน่าย' },
                { id: 's4_2', label: '4.2 มีการบันทึกสภาวะ/ปัญหาของผู้ป่วยที่ต้องดูแลอย่างต่อเนื่อง' },
                { id: 's4_3', label: '4.3 มีการประเมินความพร้อมในการดูแลตนเองของผู้ป่วยก่อนจำหน่ายและให้คำแนะนำเพิ่มเติม' },
                { id: 's4_4', label: '4.4 มีการบันทึกประเภทจำหน่าย' },
                { id: 's4_5', label: '4.5 มีการบันทึก การส่งต่อ/ การนัดมาตรวจ' },
                { id: 's4_6', label: '4.6 ชื่อผู้บันทึกพร้อมตำแหน่ง' },
              ])}
            </div>
          </div>

          {/* ส่วนที่ 5: ความถูกต้องตามกฎหมายและมาตรฐานวิชาชีพ */}
          <div className="space-y-4 pt-2">
            <h4 className="font-extrabold text-emerald-900 bg-emerald-50 px-3 py-2 rounded-lg text-sm">ส่วนที่ 5: การให้สารน้ำ/ยาทางหลอดเลือดดำ</h4>
            <div className="space-y-3 pl-2 border-l-2 border-emerald-200">
              {renderAuditItems([
                { id: 's5_1', label: '5.1 บันทึกเกี่ยวกับการให้ความรู้ผู้ป่วย/ญาติ ชนิดของสารน้ำ ตำแหน่งการแทงเข็ม ภาวะแทรกซ้อนและการจัดการ' },
              ])}
            </div>
          </div>

          {/* หมายเหตุเพิ่มเติมทั่วไป */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">หมายเหตุ / ข้อเสนอแนะเพิ่มเติมภาพรวม</label>
            <textarea 
              rows={2} 
              value={auditData.notes || ''} 
              onChange={e => setAuditData({...auditData, notes: e.target.value})} 
              className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white" 
              placeholder="บันทึกข้อเสนอแนะเพิ่มเติม..." 
            />
          </div>

          {/* ปุ่มควบคุม (จะอยู่ท้ายสุดของฟอร์ม ต้องเลื่อนลงมาจนสุดถึงจะเจอ) */}
          <div className="flex justify-end gap-2 pt-4 border-t bg-white">
            <button 
              type="button" 
              onClick={() => onClose()} 
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl text-sm font-bold hover:bg-gray-300 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button 
              type="submit" 
              disabled={saving} 
              className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-sm font-bold hover:bg-emerald-800 disabled:opacity-50 shadow-md cursor-pointer"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล Audit Chart ทั้งหมด'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}