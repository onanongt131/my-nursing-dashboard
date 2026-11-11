export const INSPECTION_WARDS = [
    "อายุรกรรม 2", "อายุรกรรม 3", "อายุรกรรม 4", "อายุรกรรม 5", "อายุรกรรม 6", "อายุรกรรม 7",
    "พิเศษอายุรกรรม 5", "พิเศษอายุรกรรม 6", "พิเศษอายุรกรรม 7",
    "Stroke unit", "สงฆ์อาพาธ", "รส 200 ปีล่าง", "รส 200 ปีบน", "รติพัฒน์",
    "ศัลยกรรมประสาท", "ศัลยกรรมกระดูก", "ศัลยกรรมหญิง", "ศัลยกรรมชาย",
    "EENT", "น้อมเกล้า 2", "น้อมเกล้า 3", "น้อมเกล้า 4",
    "กุมารเวชกรรม 1", "กุมารเวชกรรม 2", "Sick newborn", "PICU", "NICU",
    "SICU", "MICU", "RCU", "CCU", "ICCU",
    "สูติกรรมหลังคลอด", "นรีเวชกรรม", "หลวงพอแช่มชั้น 2", "หลวงพ่อแช่มชั้น 3", "หลวงพ่อแช่มชั้น 4", "ห้องคลอด"
  ];
export const normalizeWard=(name:string)=>name.replace(/\s/g,'').replace('หลวงพอ','หลวงพ่อ');
export const isInspectionWard=(name:string)=>INSPECTION_WARDS.some(ward=>normalizeWard(ward)===normalizeWard(name));
