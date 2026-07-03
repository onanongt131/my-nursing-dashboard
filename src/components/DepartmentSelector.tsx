'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function DepartmentSelector({ onSelect }: { onSelect: (id: number | null) => void }) {
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDepartments() {
      // แก้ไขตรงนี้: เปลี่ยนจาก 'name' เป็น 'Department'
      const { data, error } = await supabase.from('departments').select('id, Department');
      
      if (error) {
        console.error("Error fetching departments:", error);
      } else if (data) {
        setDepartments(data);
      }
    }
    fetchDepartments();
  }, []);

  return (
    <select 
      className="w-full p-3 border rounded-lg bg-white shadow-sm"
      onChange={(e) => onSelect(e.target.value ? parseInt(e.target.value) : null)}
    >
      <option value="">-- เลือกหน่วยงาน --</option>
      {departments.map((dept) => (
        // แก้ไขตรงนี้: เปลี่ยนจาก dept.name เป็น dept.Department
        <option key={dept.id} value={dept.id}>{dept.Department}</option>
      ))}
    </select>
  );
}