/**
 * GET  /api/geofencing/config  – Return the active geofencing configuration
 * POST /api/geofencing/config  – Create or fully replace the active config
 * PUT  /api/geofencing/config  – Partially update the active config
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { getOrCreateConfig, manageIPList, addCountriesToList, removeCountriesFromList } from '@/lib/geofencingEngine';
import GeofencingConfig from '@/models/GeofencingConfig';

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const config = await getOrCreateConfig();
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('[geofencing/config GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch config' },
      { status: 500 },
    );
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const body = await req.json();

    const {
      enabled,
      restrictiveMode,
      blockProxies,
      allowedCountries,
      blockedCountries,
      allowedContinents,
      whitelistedIPs,
      blacklistedIPs,
      blockThreshold,
      challengeThreshold,
      challengeType,
      allowedStartHour,
      allowedEndHour,
      lastModifiedNote,
    } = body;

    // Validate thresholds
    if (
      blockThreshold !== undefined &&
      (typeof blockThreshold !== 'number' || blockThreshold < 1 || blockThreshold > 100)
    ) {
      return NextResponse.json(
        { success: false, error: 'blockThreshold must be a number between 1 and 100' },
        { status: 422 },
      );
    }

    if (
      challengeThreshold !== undefined &&
      (typeof challengeThreshold !== 'number' || challengeThreshold < 1 || challengeThreshold > 100)
    ) {
      return NextResponse.json(
        { success: false, error: 'challengeThreshold must be a number between 1 and 100' },
        { status: 422 },
      );
    }

    if (
      challengeType !== undefined &&
      !['EMAIL_OTP', 'TOTP', 'ADMIN_APPROVAL'].includes(challengeType)
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid challengeType' },
        { status: 422 },
      );
    }

    // Upsert: replace or create the single active document
    const config = await GeofencingConfig.findOneAndUpdate(
      { isActive: true },
      {
        $set: {
          ...(enabled !== undefined && { enabled }),
          ...(restrictiveMode !== undefined && { restrictiveMode }),
          ...(blockProxies !== undefined && { blockProxies }),
          ...(Array.isArray(allowedCountries) && {
            allowedCountries: allowedCountries.map((c: string) => c.toUpperCase()),
          }),
          ...(Array.isArray(blockedCountries) && {
            blockedCountries: blockedCountries.map((c: string) => c.toUpperCase()),
          }),
          ...(Array.isArray(allowedContinents) && {
            allowedContinents: allowedContinents.map((c: string) => c.toUpperCase()),
          }),
          ...(Array.isArray(whitelistedIPs) && { whitelistedIPs }),
          ...(Array.isArray(blacklistedIPs) && { blacklistedIPs }),
          ...(blockThreshold !== undefined && { blockThreshold }),
          ...(challengeThreshold !== undefined && { challengeThreshold }),
          ...(challengeType !== undefined && { challengeType }),
          ...(allowedStartHour !== undefined && { allowedStartHour }),
          ...(allowedEndHour !== undefined && { allowedEndHour }),
          ...(lastModifiedNote !== undefined && { lastModifiedNote }),
          lastModifiedBy: auth.userId,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('[geofencing/config POST]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save config' },
      { status: 500 },
    );
  }
}

// ─── PUT ─────────────────────────────────────────────────────────────────────
// Supports granular list operations: add/remove individual entries

export async function PUT(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const body = await req.json();

    const { operation, list, values } = body;
    // operation: 'add' | 'remove'
    // list:      'allowedCountries' | 'blockedCountries' | 'allowedContinents' | 'whitelistedIPs' | 'blacklistedIPs'
    // values:    string[]

    if (!['add', 'remove'].includes(operation)) {
      return NextResponse.json({ success: false, error: 'operation must be add or remove' }, { status: 422 });
    }

    if (!Array.isArray(values) || values.length === 0) {
      return NextResponse.json({ success: false, error: 'values must be a non-empty array' }, { status: 422 });
    }

    const ipLists = ['whitelistedIPs', 'blacklistedIPs'];
    const countryLists = ['allowedCountries', 'blockedCountries'];
    const continentLists = ['allowedContinents'];

    let config;

    if (ipLists.includes(list)) {
      config = await manageIPList(values, list as 'whitelistedIPs' | 'blacklistedIPs', operation);
    } else if (countryLists.includes(list)) {
      if (operation === 'add') {
        config = await addCountriesToList(values, list as 'allowedCountries' | 'blockedCountries');
      } else {
        config = await removeCountriesFromList(values, list as 'allowedCountries' | 'blockedCountries');
      }
    } else if (continentLists.includes(list)) {
      const existingConfig = await getOrCreateConfig();
      const upper = values.map((v: string) => v.toUpperCase());
      if (operation === 'add') {
        (existingConfig as any).allowedContinents = Array.from(
          new Set([...(existingConfig.allowedContinents || []), ...upper]),
        );
      } else {
        existingConfig.allowedContinents = (existingConfig.allowedContinents || []).filter(
          (c: string) => !upper.includes(c),
        );
      }
      await (existingConfig as any).save();
      config = existingConfig;
    } else {
      return NextResponse.json({ success: false, error: `Unknown list: ${list}` }, { status: 422 });
    }

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('[geofencing/config PUT]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update config' },
      { status: 500 },
    );
  }
}
