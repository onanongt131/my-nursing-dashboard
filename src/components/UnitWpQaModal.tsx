"use client";

import React from "react";
import WpQaModal from "@/components/WpQaModal";
import WpSpecialAuditModal from "@/components/WpSpecialAuditModal";
import type { WpFormType } from "@/lib/wpSpecialCriteria";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  departmentId: string | number;
  departmentName?: string;
  supabase: any;
  onSuccess?: () => void;
  wpFormType?: WpFormType | "ipd";
};

export function resolveWpFormType(name: string): WpFormType | "ipd" {
  const v = name.trim().toLowerCase();
  if (/ห้องคลอด|สูติกรรมห้องคลอด|labor room|^lr$/.test(v)) return "lr";
  if (/วิสัญญี|anesth/.test(v)) return "anesthesia";
  if (/ห้องผ่าตัด|ห้องผ่าฯ|ผ่าตัดกลาง|^or$|^o\.r\.$/.test(v)) return "or";
  if (/ห้องฉุกเฉิน|อุบัติเหตุและฉุกเฉิน|^er$|^e\.r\.$/.test(v)) return "er";
  if (/^opd$|ผู้ป่วยนอก|แผนกผู้ป่วยนอก|ตรวจผู้ป่วยนอก/.test(v)) return "opd";
  return "ipd";
}

export default function UnitWpQaModal({
  isOpen, onClose, departmentId, departmentName,
  supabase, onSuccess, wpFormType
}: Props) {
  if (!isOpen) return null;
  const type = wpFormType ?? resolveWpFormType(departmentName ?? "");

  if (type !== "ipd") {
    // Specific forms use server-side POST /api/wp-special.
    return (
      <WpSpecialAuditModal
        isOpen={isOpen}
        onClose={onClose}
        formType={type}
        departmentName={departmentName}
        departmentId={departmentId}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <WpQaModal
      isOpen={isOpen}
      onClose={onClose}
      departmentId={String(departmentId)}
      departmentName={departmentName ?? ""}
      supabase={supabase}
      onSuccess={onSuccess ?? (() => {})}
    />
  );
}
