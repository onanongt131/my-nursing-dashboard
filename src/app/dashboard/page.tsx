import { auth } from "@/auth";
export default async function DashboardPage() {
  const session = await auth();
  console.log("Session in dashboard:", session);
  if (!session) return <div>ยังไม่ได้ล็อกอิน</div>;
  return <div>ยินดีต้อนรับ: {session.user?.email}</div>;
}