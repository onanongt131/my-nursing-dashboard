'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

interface DepartmentContextType {
  data: any[];
  selectedGroup: string;
  setSelectedGroup: (group: string) => void;
  selectedDept: { id: string | number; name: string } | null;
  setSelectedDept: (dept: { id: string | number; name: string } | null) => void;
  loading: boolean;
  uniqueGroups: string[];
  filteredDepartments: any[];
  currentDeptObj: any;
  fetchData: () => Promise<void>;
}

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);

export function DepartmentProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<{ id: string | number; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, kpiRes, entryRes, mapRes] = await Promise.all([
        supabase.from('departments').select('*'),
        supabase.from('kpis').select('*'),
        supabase.from('kpi_entries').select('*'),
        supabase.from('kpi_department_map').select('department_id, kpi_id')
      ]);

      const depts = deptRes.data || [];
      const kpis = kpiRes.data || [];
      const entries = entryRes.data || [];
      const maps = mapRes.data || [];

      const formattedData = depts.map(dept => ({
        ...dept,
        kpis: maps
          .filter(m => m.department_id === Number(dept.id))
          .map(m => {
            const kpiData = kpis.find(k => k.id === m.kpi_id);
            return kpiData ? {
              ...kpiData,
              entries: entries.filter(e => e.kpi_id === kpiData.id && e.department_id === Number(dept.id))
            } : null;
          })
          .filter(Boolean)
      }));
      
      setData(formattedData);

      // ตั้งค่าเริ่มต้นถ้ายังไม่ได้เลือก
      if (formattedData.length > 0 && !selectedGroup) {
        const groups = Array.from(new Set(formattedData.map((d: any) => d.group))).filter(Boolean) as string[];
        if (groups.length > 0) {
          setSelectedGroup(groups[0]);
          const firstDeptInGroup = formattedData.find((d: any) => d.group === groups[0]);
          if (firstDeptInGroup) {
            setSelectedDept({ id: firstDeptInGroup.id, name: firstDeptInGroup.Department });
          }
        }
      }
    } catch (err) {
      console.error("Error fetching department context:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedGroup]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const uniqueGroups = Array.from(new Set(data.map(d => d.group))).filter(Boolean) as string[];
  const filteredDepartments = data.filter(d => d.group === selectedGroup);
  const currentDeptObj = data.find(d => String(d.id) === String(selectedDept?.id));

  return (
    <DepartmentContext.Provider value={{
      data,
      selectedGroup,
      setSelectedGroup,
      selectedDept,
      setSelectedDept,
      loading,
      uniqueGroups,
      filteredDepartments,
      currentDeptObj,
      fetchData
    }}>
      {children}
    </DepartmentContext.Provider>
  );
}

export function useDepartment() {
  const context = useContext(DepartmentContext);
  if (!context) throw new Error('useDepartment must be used within a DepartmentProvider');
  return context;
}