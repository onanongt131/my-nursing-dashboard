// src/app/dashboard/departments/page.tsx
import { redirect } from 'next/navigation';

export default function DepartmentsIndexPage() {
  // กำหนด ID ของหน่วยงานเริ่มต้นที่ต้องการให้ระบบพาไป (เช่น ID 1 หรือหน่วยงานแรก)
  redirect('/dashboard/departments/1');
}