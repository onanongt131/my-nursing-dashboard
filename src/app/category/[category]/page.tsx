// src/app/category/[category]/page.tsx
import { auth } from "@/auth"; // อ้างอิงจาก auth.ts[cite: 2]
import CategoryClient from "./CategoryClient";
import { redirect } from "next/navigation";

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const session = await auth(); // ดึงข้อมูลผู้ใช้จาก Server[cite: 2]

  if (!session) {
    redirect("/login"); // ถ้ายังไม่ได้ Login ให้เด้งไปหน้า Login
  }

  const { category } = await params;

  // ส่ง session และ category ไปยัง Client Component
  return <CategoryClient session={session} category={category} />;
}