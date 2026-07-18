import type { Metadata } from "next";
import { Sarabun } from "next/font/google"; // เปลี่ยนจาก Geist เป็น Sarabun
import "@/app/globals.css";

// ตั้งค่าฟอนต์ Sarabun
const sarabun = Sarabun({ 
  subsets: ["thai"], 
  weight: ["300", "400", "500", "700"],
  variable: "--font-sarabun",
});

export const metadata: Metadata = {
  title: "Nursing KPI Dashboard",
  description: "ระบบติดตามตัวชี้วัดผลการปฏิบัติการพยาบาล",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // นำ variable ของ sarabun มาใส่ที่นี่
    <html lang="th" className={`${sarabun.variable}`}>
      <body className="bg-gray-100 min-h-screen font-sans">
        <main className="max-w-7xl mx-auto p-4 md:p-6">
          {children}
        </main>
      </body>
    </html>
  );
}