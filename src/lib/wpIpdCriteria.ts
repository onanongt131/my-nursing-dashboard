export const wpQaItems = [
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

const newbornIdentification = wpQaItems.find(item => item.id === 'WP-NUR-009-021-00')!;
const newbornWards = new Set(['หลังคลอด', 'สูติกรรมหลังคลอด', 'หลวงพ่อแช่ม4', 'หลวงพ่อแช่มชั้น4', 'nicu', 'sicknewborn']);
const normalizeWpLabel = (value: unknown) => String(value ?? '').replace(/\s/g, '').replace('หลวงพอ', 'หลวงพ่อ').toLowerCase();

export function isWpApplicable(departmentName: unknown, ...labels: unknown[]) {
  const newbornItem = labels.some(label =>
    normalizeWpLabel(label) === normalizeWpLabel(newbornIdentification.id) ||
    normalizeWpLabel(label) === normalizeWpLabel(newbornIdentification.name));
  return !newbornItem || newbornWards.has(normalizeWpLabel(departmentName));
}

export const wpItemsForWard = (departmentName: unknown) =>
  wpQaItems.filter(item => isWpApplicable(departmentName, item.id));
