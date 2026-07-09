import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nursing KPI Dashboard",
  description: "ระบบติดตามตัวชี้วัดผลการปฏิบัติการพยาบาล",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-gray-100 min-h-screen font-sans">
        {/* ใส่ Navbar หรือ Header ตรงนี้หากต้องการให้มีทุกหน้า */}
        <main className="max-w-7xl mx-auto p-4 md:p-6">
          {children}
        </main>
      </body>
    </html>
  );
}