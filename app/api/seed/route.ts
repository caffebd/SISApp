import { NextResponse } from 'next/server';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../../../lib/firebase';

// Server Route to trigger production seeding via callable function
// Usage: Send a POST to /api/seed with JSON { seedKey: 'ALLOW_SEED' }
export async function POST(request: Request) {
  try {
    const { seedKey } = await request.json();
    if (!seedKey) {
      return NextResponse.json({ ok: false, reason: 'seedKey required' }, { status: 400 });
    }

    // Match region to deployed functions (europe-west2)
    const functions = getFunctions(app, 'europe-west2');
    const callable = httpsCallable<{ seedKey: string }, { ok: boolean; daysWritten?: number; apptsWritten?: number; reason?: string }>(functions, 'seedSampleData');
    const { data } = await callable({ seedKey });

    if (!data.ok) {
      return NextResponse.json(data, { status: 403 });
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: e?.message || 'error' }, { status: 500 });
  }
}
