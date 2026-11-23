import 'server-only';
import {revalidateTag} from 'next/cache';
// tag เดียวกับที่ใช้ใน department-kpi-dashboard, department-wp-kpi, department-readmit-ama-kpi
export const KPI_CACHE_TAG='department-kpi';
// เรียกหลังอนุมัติหรือแก้ไขข้อมูลสำเร็จ: ล้าง cache ทันที (Next 16: {expire:0} = หมดอายุทันที ไม่เสิร์ฟของเก่า)
// ถ้าล้างไม่สำเร็จจะไม่ทำให้การอนุมัติล้ม แค่ตัวเลขจะอัปเดตตามรอบ 5 นาทีเหมือนเดิม
export function invalidateDepartmentKpi(){
 try{revalidateTag(KPI_CACHE_TAG,{expire:0});}
 catch{console.error('KPI cache invalidation failed');}
}
