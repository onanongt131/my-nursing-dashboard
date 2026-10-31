'use client';
import React from 'react';
import AuditChartModal from '@/components/AuditChartModal';
import LRAuditChartModal from '@/components/LRAuditChartModal';
import ERAuditChartModal from '@/components/ERAuditChartModal';
import AnesthesiaAuditChartModal from '@/components/AnesthesiaAuditChartModal';
import DialysisAuditChartModal from '@/components/DialysisAuditChartModal';
import HBOTAuditChartModal from '@/components/HBOTAuditChartModal';

export type UnitAuditFormType = 'ipd' | 'lr' | 'er' | 'anesthesia' | 'dialysis' | 'hbot';

// Unit names are a temporary fallback. For long-term use, store audit_form_type
// in departments and pass the value explicitly. No database migration is required here.
export function resolveAuditType(name: string): UnitAuditFormType {
  const v = name.trim().toLowerCase();
  if (/ห้องคลอด|ห้องคลอดและหลังคลอด|labor room/.test(v)) return 'lr';
  if (/^(er|e\.r\.|ห้องฉุกเฉิน|อุบัติเหตุและฉุกเฉิน)$/.test(v) || v.includes('ฉุกเฉิน')) return 'er';
  if (/วิสัญญี|anesth/.test(v)) return 'anesthesia';
  if (/ไตเทียม|dialysis|ฟอกเลือด/.test(v)) return 'dialysis';
  if (/เวชศาสตร์ใต้น้ำ|เวชศาสตรใต้น้ำ|เวชศาตร์ใต้น้ำ|hbot|hyperbaric/.test(v)) return 'hbot';
  return 'ipd';
}

type Props = {
 isOpen: boolean; onClose: () => void; departmentId: string | number; departmentName: string;
 supabase: any; onSuccess?: () => void; auditFormType?: UnitAuditFormType;
};
export default function UnitAuditChartModal({isOpen,onClose,departmentId,departmentName,supabase,onSuccess,auditFormType}: Props) {
  const t = auditFormType ?? resolveAuditType(departmentName);
  const common = {isOpen,onClose,departmentId,departmentName,onSuccess};
  if(t==='lr') return <LRAuditChartModal {...common} />;
  if(t==='er') return <ERAuditChartModal {...common} />;
  if(t==='anesthesia') return <AnesthesiaAuditChartModal {...common} />;
  if(t==='dialysis') return <DialysisAuditChartModal {...common} />;
  if(t==='hbot') return <HBOTAuditChartModal {...common} />;
  if(/ห้องผ่าตัด|ห้องผ่าฯ|^or$|ผู้ป่วยนอก|^opd$/i.test(departmentName.trim())) return <div role="dialog" aria-modal="true" className="fixed inset-0 z-[99999] grid place-items-center bg-black/60 p-4"><div className="rounded-xl bg-white p-6 shadow-xl"><p className="mb-4 font-semibold">แบบประเมินเฉพาะหน่วยงานนี้ยังไม่พร้อมใช้งาน</p><button onClick={onClose} className="rounded-lg bg-emerald-700 px-5 py-2 text-white">ปิด</button></div></div>;
  return <AuditChartModal isOpen={isOpen} onClose={onClose} departmentId={String(departmentId)} departmentName={departmentName} supabase={supabase} onSuccess={onSuccess} />;
}
