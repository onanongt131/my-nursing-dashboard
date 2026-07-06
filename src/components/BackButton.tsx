// src/components/BackButton.tsx
import Link from 'next/link';

export default function BackButton() {
  return (
    <Link 
      href="/" 
      className="inline-flex items-center text-gray-500 hover:text-indigo-400 transition duration-200 mb-6 font-medium"
    >
      {/* 
        inline-block: จำเป็นต้องมีเพื่อให้ transform ทำงานได้
        transform: เปิดใช้งานการแปลงค่า
        scale-x-150: เพิ่มความกว้างเป็น 1.5 เท่าในแนวนอน
      */}
      <span className="text-4xl mr-3 inline-block transform scale-x-50">←</span> 
      กลับหน้าหลัก
    </Link>
  );
}