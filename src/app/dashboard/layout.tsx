import { auth } from "@/auth"; // นำเข้า auth จาก config
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton"; // สร้างไฟล์แยก
import Link from 'next/link';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // เช็คก่อนส่งหน้าจอให้ User
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="...">
        <Link href="/dashboard">Dashboard</Link>
        <LogoutButton /> {/* ย้ายโค้ด signOut มาใส่ที่นี่แทน */}
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}