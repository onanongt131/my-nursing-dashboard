// src/components/LogoutButton.tsx
'use client';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="flex items-center gap-2 text-red-600"
    >
      <LogOut className="w-4 h-4" /> ออกจากระบบ
    </button>
  );
}