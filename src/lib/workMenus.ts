// เมนูกลุ่ม "ระบบงาน" ใช้ร่วมกันระหว่าง Sidebar และหน้ารวมระบบงาน
export type WorkItem = { label: string; href: string };

export const workforce: WorkItem[] = [
  {label:'บุคลากรและสมรรถนะ',href:'/dashboard/staffing'},
  {label:'Ward Command Center',href:'/dashboard/staffing/command-center'},
  {label:'ตารางเวร',href:'/dashboard/staffing/schedule'},
  {label:'ภาพรวมอัตรากำลัง',href:'/dashboard/staffing/overview'},
  {label:'รายงานเวรตรวจการ',href:'/dashboard/staffing/inspection-report'},
];

export const committees: WorkItem[] = [
  {label:'คณะกรรมการบริหาร',href:'/dashboard/committee/executive'},
  {label:'คณะกรรมการ QA',href:'/dashboard/committee/qa'},
  {label:'คณะกรรมการ RM',href:'/dashboard/committee/rm'},
  {label:'คณะกรรมการ HRN',href:'/dashboard/committee/academic'},
  {label:'คณะกรรมการอัตรากำลัง',href:'/dashboard/committee/personnel'},
  {label:'คณะกรรมการ R2R',href:'/dashboard/committee/r2r'},
  {label:'คณะกรรมการบ้านพัก',href:'/dashboard/committee/home'},
];

export const nursingBranches: WorkItem[] = [
  'การพยาบาลวิจัยและพัฒนาการบริการ','การพยาบาลผู้ป่วยหนัก','การพยาบาลผู้ป่วยอุบัติเหตุและฉุกเฉิน',
  'การพยาบาลผู้ป่วยผ่าตัด','การพยาบาลผู้ป่วยอายุรกรรม','การพยาบาลควบคุมและป้องกันการติดเชื้อ',
  'การพยาบาลผู้ป่วยกุมารเวชกรรม','การพยาบาลโสต ศอ นาสิก จักษุ','การพยาบาลตรวจรักษาพิเศษ',
  'การพยาบาลผู้ป่วยศัลยกรรม','การพยาบาลผู้ป่วยสูติ–นรีเวช','การพยาบาลผู้ป่วยจิตเวช',
  'การพยาบาลผู้ป่วยนอก','การพยาบาลวิสัญญี','การพยาบาลผู้คลอด','การพยาบาลผู้ป่วยออร์โธปิดิกส์'
].map((label,i)=>({label,href:`/dashboard/nursing/branch-${i+1}`}));

