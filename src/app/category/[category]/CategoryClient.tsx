'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AddEntryForm from '@/components/AddEntryForm';

export default function CategoryClient({ session, category }: { session: any, category: string }) {
  const decodedCategory = decodeURIComponent(category);
  const [kpis, setKpis] = useState<any[]>([]);

  const userRole = session.user.role;
  const userDept = session.user.department_id;

  async function fetchData() {
    let query = supabase
      .from('kpis')
      .select('*, kpi_entries(*)')
      .eq('category', decodedCategory);

    if (userRole !== 'executive') {
      query = query.or(`department_id.eq.${userDept},department_id.is.null`);
    }

    const { data: kpisData } = await query;
    if (kpisData) setKpis(kpisData);
  }

  useEffect(() => {
    fetchData();
  }, [decodedCategory]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{decodedCategory}</h1>
      {kpis.map((kpi) => (
        <div key={kpi.id} className="border p-4 mb-4 rounded shadow">
          <h2 className="text-lg font-semibold">{kpi.name}</h2>
          {(userRole === 'executive' || kpi.department_id === userDept) && (
            <AddEntryForm kpi={kpi} />
          )}
        </div>
      ))}
    </div>
  );
}