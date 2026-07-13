// src/components/DashboardWrapper.tsx
'use client';

export default function DashboardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {children}
    </div>
  );
}