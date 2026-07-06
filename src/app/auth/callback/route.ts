// src/app/auth/callback/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  
  console.log("DEBUG: Callback hit, Code present:", !!code, "Type:", type);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error("DEBUG: Exchange Error:", error.message);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/update-password`);
    }
    return NextResponse.redirect(`${origin}/`);
  }

  console.error("DEBUG: No code found in URL");
  return NextResponse.redirect(`${origin}/login`);
}