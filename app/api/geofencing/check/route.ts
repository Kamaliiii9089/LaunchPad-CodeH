/**
 * POST /api/geofencing/check
 *
 * On-demand geofencing check endpoint.
 * Lets the front-end or other services ask the engine: "is this IP allowed?"
 *
 * Body:
 * {
 *   "ip": "1.2.3.4",          // required
 *   "userId": "...",           // optional
 *   "email": "...",            // optional
 *   "userAgent": "..."         // optional
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { checkGeofencing } from '@/lib/geofencingEngine';

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { ip, userId, email, userAgent } = body;

  if (!ip || typeof ip !== 'string') {
    return NextResponse.json({ success: false, error: 'ip is required' }, { status: 422 });
  }

  // Basic IP format check (IPv4 or IPv6-like, plus private-range keywords)
  const ipPattern = /^[\d.:a-fA-F]+$|^unknown$/;
  if (!ipPattern.test(ip)) {
    return NextResponse.json({ success: false, error: 'Invalid IP format' }, { status: 422 });
  }

  try {
    const result = await checkGeofencing(
      ip,
      userId || auth.userId,
      userAgent || req.headers.get('user-agent') || undefined,
      email,
    );

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('[geofencing/check POST]', error);
    return NextResponse.json(
      { success: false, error: 'Geofencing check failed' },
      { status: 500 },
    );
  }
}
