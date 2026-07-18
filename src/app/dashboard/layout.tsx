import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardLayoutContent from "@/components/DashboardLayoutContent";
import { DashboardHeader } from "@/components/DashboardHeader";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ส่ง children ไปที่ Wrapper เพื่อจัดการ State ของ Tabs */}
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </div>
  );
}