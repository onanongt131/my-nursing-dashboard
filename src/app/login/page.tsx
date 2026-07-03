'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard'); // นำทางไปหน้า Dashboard
      router.refresh();
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-sm border w-96">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">เข้าสู่ระบบ</h2>
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        <input 
          className="w-full p-3 mb-4 border rounded-lg"
          type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)}
        />
        <input 
          className="w-full p-3 mb-6 border rounded-lg"
          type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)}
        />
        <button className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold">เข้าสู่ระบบ</button>
      </form>
    </div>
  );
}