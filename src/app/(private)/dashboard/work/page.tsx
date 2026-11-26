import { dashboardContext } from '@/lib/auth/dashboardContext';
import { committees, nursingBranches, workforce, type WorkItem } from '@/lib/workMenus';
import WorkOverview, { type WorkSection } from './WorkOverview';

export const dynamic = 'force-dynamic';

/** หน้ารวม "ระบบงาน": เลือกกลุ่มเมนูก่อนเข้าหน้าย่อย */
export default async function WorkOverviewPage() {
  const { departments } = await dashboardContext();
  const unitGroups = new Map<string, WorkItem[]>();
  for (const d of departments) {
    const title = d.Department || d.department_name || d.name;
    if (d.id == null || !title) continue;
    const group = d.group || d.group_name || 'กลุ่มงานทั่วไป';
    unitGroups.set(group, [...(unitGroups.get(group) || []), { label: title, href: `/dashboard/departments/${encodeURIComponent(String(d.id))}` }]);
  }
  const sections: WorkSection[] = [
    { key: 'units', title: 'หน่วยงานภายใน', desc: 'ตัวชี้วัดและข้อมูลของแต่ละหน่วยงาน', groups: [...unitGroups.entries()].map(([label, items]) => ({ label, items })) },
    { key: 'branches', title: '16 กลุ่มงาน', desc: 'กลุ่มงานการพยาบาลเฉพาะทาง', groups: [{ items: nursingBranches }] },
    { key: 'committee', title: 'คณะกรรมการ', desc: 'งานคณะกรรมการกลุ่มภารกิจด้านการพยาบาล', groups: [{ items: committees }] },
    { key: 'staff', title: 'อัตรากำลัง', desc: 'บุคลากร ตารางเวร และภาพรวมอัตรากำลัง', groups: [{ items: workforce }] },
  ];
  return <WorkOverview sections={sections} />;
}
