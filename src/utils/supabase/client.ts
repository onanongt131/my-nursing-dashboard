import { createBrowserClient } from '@supabase/ssr'

// สร้างตัวแปรเก็บอินสแตนซ์ไว้ภายนอกฟังก์ชัน
let cachedClient: ReturnType<typeof createBrowserClient> | null = null;

export const createClient = () => {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false, 
        autoRefreshToken: true,
      },
    }
  );

  return cachedClient;
};