'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

interface DepartmentRow {
  id: number | string;
  Department: string;
  group?: string | null;
  [key: string]: unknown;
}

interface KpiRow {
  id: number | string;
  [key: string]: unknown;
}

interface KpiEntryRow {
  kpi_id: number | string;
  department_id: number | string;
  [key: string]: unknown;
}

interface KpiDepartmentMapRow {
  department_id: number | string;
  kpi_id: number | string;
}

type DepartmentWithKpis = DepartmentRow & {
  kpis: Array<KpiRow & { entries: KpiEntryRow[] }>;
};

interface DepartmentContextType {
  data: DepartmentWithKpis[];
  selectedGroup: string;
  setSelectedGroup: (group: string) => void;
  selectedDept: { id: string | number; name: string } | null;
  setSelectedDept: (dept: { id: string | number; name: string } | null) => void;
  loading: boolean;
  uniqueGroups: string[];
  filteredDepartments: DepartmentWithKpis[];
  currentDeptObj: DepartmentWithKpis | undefined;
  fetchData: () => Promise<void>;
}

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);
const supabase = createClient();

export function DepartmentProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DepartmentWithKpis[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedDept, setSelectedDept] = useState<{ id: string | number; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, kpiRes, entryRes, mapRes] = await Promise.all([
        supabase.from('departments').select('*'),
        supabase.from('kpis').select('*'),
        supabase.from('kpi_entries').select('*'),
        supabase.from('kpi_department_map').select('department_id, kpi_id'),
      ]);

      if (deptRes.error) throw deptRes.error;
      if (kpiRes.error) throw kpiRes.error;
      if (entryRes.error) throw entryRes.error;
      if (mapRes.error) throw mapRes.error;

      const depts: DepartmentRow[] = (deptRes.data ?? []) as DepartmentRow[];
      const kpis: KpiRow[] = (kpiRes.data ?? []) as KpiRow[];
      const entries: KpiEntryRow[] = (entryRes.data ?? []) as KpiEntryRow[];
      const maps: KpiDepartmentMapRow[] = (mapRes.data ?? []) as KpiDepartmentMapRow[];

      const formattedData: DepartmentWithKpis[] = depts.map((dept) => ({
        ...dept,
        kpis: maps
          .filter((m) => Number(m.department_id) === Number(dept.id))
          .map((m) => {
            const kpiData = kpis.find((k) => String(k.id) === String(m.kpi_id));
            return kpiData
              ? {
                  ...kpiData,
                  entries: entries.filter(
                    (e) =>
                      String(e.kpi_id) === String(kpiData.id) &&
                      Number(e.department_id) === Number(dept.id),
                  ),
                }
              : null;
          })
          .filter((kpi): kpi is KpiRow & { entries: KpiEntryRow[] } => kpi !== null),
      }));

      setData(formattedData);

      // กำหนดค่าเริ่มต้นเฉพาะเมื่อยังไม่มีการเลือก ไม่ทำให้โหลดซ้ำเมื่อเปลี่ยนกลุ่มงาน
      const firstGroup = formattedData.find((d) => d.group)?.group;
      if (firstGroup) {
        setSelectedGroup((previous) => previous || firstGroup);
        setSelectedDept((previous) => {
          if (previous) return previous;
          const firstDept = formattedData.find((d) => d.group === firstGroup);
          return firstDept ? { id: firstDept.id, name: firstDept.Department } : null;
        });
      }
    } catch (err) {
      console.error('Error fetching department context:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const uniqueGroups = Array.from(new Set(data.map((d) => d.group).filter((g): g is string => Boolean(g))));
  const filteredDepartments = data.filter((d) => d.group === selectedGroup);
  const currentDeptObj = data.find((d) => String(d.id) === String(selectedDept?.id));

  return (
    <DepartmentContext.Provider
      value={{
        data,
        selectedGroup,
        setSelectedGroup,
        selectedDept,
        setSelectedDept,
        loading,
        uniqueGroups,
        filteredDepartments,
        currentDeptObj,
        fetchData,
      }}
    >
      {children}
    </DepartmentContext.Provider>
  );
}

export function useDepartment() {
  const context = useContext(DepartmentContext);
  if (!context) throw new Error('useDepartment must be used within a DepartmentProvider');
  return context;
}
