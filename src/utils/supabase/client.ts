// src/utils/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

let supabase: any = null;

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
