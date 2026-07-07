// ในไฟล์ src/app/dashboard/page.tsx
export const dynamic = 'force-dynamic';
import { auth } from "@/auth"; // ต้องนำเข้าจากไฟล์ auth.ts ที่เราสร้างไว้

export default async function DashboardPage() {
  const session = await auth(); // เรียกใช้งานแบบนี้ (ต้องเป็น await)

  if (!session) {
    // จัดการกรณีไม่ได้ Login
    return <div>โปรดเข้าสู่ระบบ</div>;
  }

  return <div>ยินดีต้อนรับคุณ {session.user?.name}</div>;
}