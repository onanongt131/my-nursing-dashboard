import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false, // ปิดการจำ Session ข้ามการปิดเบราว์เซอร์
        autoRefreshToken: true,
      },
    }
  );