import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { user: null },
      { status: 401 }
    );
  }

  return NextResponse.json({
    user: {
      id: (session.user as any).id ?? null,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
      role: (session.user as any).role ?? null,
    },
  });
}