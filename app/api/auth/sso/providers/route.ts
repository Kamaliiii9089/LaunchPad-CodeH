/**
 * Public SSO Providers List
 * Returns list of enabled SSO providers for login page
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import SSOConfig from '@/models/SSOConfig';

export async function GET() {
  try {
    await connectDB();

    // Find all enabled SSO configurations
    const configs = await SSOConfig.find({ enabled: true })
      .select('name type provider')
      .sort({ provider: 1 });

    return NextResponse.json({
      success: true,
      providers: configs,
    });
  } catch (error: any) {
    console.error('Failed to fetch SSO providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SSO providers' },
      { status: 500 }
    );
  }
}
