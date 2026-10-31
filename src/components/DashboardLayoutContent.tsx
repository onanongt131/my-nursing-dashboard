'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/DashboardHeader';
import UniversalDashboardSidebar from '@/components/UniversalDashboardSidebar';
import { useIdleLogout } from '@/hooks/useIdleLogout';

interface UserProfile {
  role?: string;
  department_id?: number | string | null;
  full_name?: string;
  group?: string | null;
}

interface DashboardLayoutContentProps {
  profile?: UserProfile | null;
  departments?: any[];
  children: ReactNode;
}

// Existing pages keep their URLs. Order matters: /nso-strategy must not be
// interpreted as the legacy /strategy tab.
const TAB_ROUTES: Record<string, string> = {
  home: '/dashboard',
  dashboard: '/dashboard',
  'nursing-dashboard': '/dashboard/nursing-dashboard/executive',
  nso: '/dashboard/nso-strategy',
  'nso-strategy': '/dashboard/nso-strategy',
  unit: '/dashboard/departments',
  category: '/dashboard/category',
  strategy: '/dashboard/strategy',
  productivity: '/dashboard/productivity',
  'wp-qa': '/dashboard/wp-qa',
  'audit-chart': '/dashboard/audit-chart',
  'iv-care': '/dashboard/iv-care',
  rm: '/dashboard/rm',
  staffing: '/dashboard/staffing',
  nursing: '/dashboard/nursing',
  committee: '/dashboard/committee/executive',
};

function getActiveTab(pathname: string): string {
  if (pathname === '/dashboard' || pathname === '/dashboard/') return 'dashboard';
  if (pathname.startsWith('/dashboard/nso-strategy')) return 'nso-strategy';
  if (pathname.startsWith('/dashboard/nursing-dashboard')) return 'nursing-dashboard';
  if (pathname.startsWith('/dashboard/departments')) return 'unit';
  if (pathname.startsWith('/dashboard/category')) return 'category';
  if (pathname.startsWith('/dashboard/strategy')) return 'strategy';
  if (pathname.startsWith('/dashboard/productivity')) return 'productivity';
  if (pathname.startsWith('/dashboard/wp-qa')) return 'wp-qa';
  if (pathname.startsWith('/dashboard/audit-chart')) return 'audit-chart';
  if (pathname.startsWith('/dashboard/iv-care')) return 'iv-care';
  if (pathname.startsWith('/dashboard/rm')) return 'rm';
  if (pathname.startsWith('/dashboard/staffing')) return 'staffing';
  if (pathname.startsWith('/dashboard/nursing')) return 'nursing';
  if (pathname.startsWith('/dashboard/committee')) return 'committee';
  // Other dashboard pages (including /admin) should not be mislabeled Home.
  return '';
}

export default function DashboardLayoutContent({
  profile,
  departments = [],
  children,
}: DashboardLayoutContentProps) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { showWarning, setShowWarning } = useIdleLogout(5); // Preserve the existing 5-minute configuration.

  const activeTab = useMemo(() => getActiveTab(pathname), [pathname]);
  const sectionFromPath = (path: string): string | null => {
    if (path.startsWith('/dashboard/nso-strategy')) return 'nso';
    if (path.startsWith('/dashboard/nursing-dashboard')) return 'dashboard';
    if (path === '/dashboard') return null;
    if (['/dashboard/category','/dashboard/strategy','/dashboard/rm','/dashboard/productivity','/dashboard/wp-qa','/dashboard/iv-care','/dashboard/audit-chart'].some(p => path === p || path.startsWith(p+'/'))) return 'report';
    return 'work';
  };
  const [selectedSidebar, setSelectedSidebar] = useState<string | null>(() => sectionFromPath(pathname));
  const [reportExpanded, setReportExpanded] = useState(false);
  useEffect(() => {
    setSelectedSidebar(sectionFromPath(pathname));
    setReportExpanded(false);
  }, [pathname]);
  const isReport = selectedSidebar === 'report';

  const handleTabChange = useCallback((tabName: string) => {
    const targetPath = TAB_ROUTES[tabName];
    if (!targetPath) return; // Unknown tabs must not unexpectedly redirect to Home.
    if (pathname !== targetPath) router.push(targetPath);
  }, [pathname, router]);

  return (
    <div className="min-h-screen w-full min-w-0 max-w-full overflow-x-hidden bg-gray-50 px-3 pb-4 pt-0 sm:px-4 md:px-6 md:pb-6">
      <div className="relative z-30 w-full rounded-2xl border border-gray-100 bg-white shadow-sm">
        <DashboardHeader
          title="กลุ่มภารกิจด้านการพยาบาล"
          activeTab={activeTab}
          onTabChange={handleTabChange}
          departments={departments}
          userName={profile?.full_name}
          userRole={profile?.role}
          userGroup={profile?.group ?? undefined}
          selectedSidebar={selectedSidebar}
          onSidebarSelect={setSelectedSidebar}
        />
      </div>

      {selectedSidebar !== null ? (
        <div className="relative z-0 mt-4 flex w-full min-w-0 max-w-full flex-col items-start gap-4 lg:mt-6 lg:flex-row lg:gap-5">
          {!reportExpanded && (
            <div className="w-full min-w-0 shrink-0 lg:w-64">
              <UniversalDashboardSidebar
                departmentId={profile?.department_id ?? null}
                departments={departments}
                selectedSection={selectedSidebar}
                onClose={() => setSelectedSidebar(null)}
              />
            </div>
          )}
          <main className="relative w-full min-w-0 max-w-full flex-1 overflow-visible">
            {isReport && (
              <button
                type="button"
                onClick={() => setReportExpanded(value => !value)}
                className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-white/95 text-emerald-900 shadow-sm transition hover:bg-emerald-50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 lg:-left-[26px] lg:right-auto lg:top-3"
                aria-label={reportExpanded ? 'แสดง Sidebar รายงาน' : 'ขยายพื้นที่รายงาน'}
                title={reportExpanded ? 'แสดง Sidebar รายงาน' : 'ขยายพื้นที่รายงาน'}
                aria-pressed={reportExpanded}
              >
                {reportExpanded ? (
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M9 4v16" /><path d="m14 9-3 3 3 3" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M9 4v16" /><path d="m13 9 3 3-3 3" />
                  </svg>
                )}
              </button>
            )}
            <div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
              {children}
            </div>
          </main>
        </div>
      ) : (
        <main className="relative z-0 mt-4 w-full min-w-0 max-w-full overflow-x-auto md:mt-6">
          {children}
        </main>
      )}

      {showWarning && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="idle-warning-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 text-center shadow-xl">
            <h3 id="idle-warning-title" className="text-lg font-bold text-gray-800">
              ไม่มีการเคลื่อนไหว
            </h3>
            <p className="text-sm text-gray-500">
              ระบบจะทำการออกจากระบบอัตโนมัติในอีก 1 นาที เนื่องจากไม่มีการใช้งาน
            </p>
            <button
              type="button"
              onClick={() => setShowWarning(false)}
              className="w-full rounded-xl bg-emerald-800 py-2 font-bold text-white shadow-sm transition hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            >
              ใช้งานต่อ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
