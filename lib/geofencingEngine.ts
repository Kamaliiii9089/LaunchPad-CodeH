/**
 * Geofencing / Geo-restriction Engine
 *
 * Provides IP-based geographic restriction for login attempts.
 * - Resolves IP addresses to country / city via the free ip-api.com endpoint
 *   (JSON, no auth required for non-commercial use at 45 req/min).
 * - Manages "allowed regions" (countries, continents, CIDR ranges) stored in MongoDB.
 * - Classifies every login attempt as ALLOWED | CHALLENGED | BLOCKED.
 * - Writes a GeoLoginLog entry for every attempt so operators can audit.
 * - Provides a risk-scoring helper that downstream code (login route, middleware)
 *   can use to decide whether to demand extra proof of identity.
 */

import { connectDB } from './mongodb';
import GeofencingConfig, { IGeofencingConfig } from '../models/GeofencingConfig';
import GeoLoginLog from '../models/GeoLoginLog';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type GeoVerdict = 'ALLOWED' | 'CHALLENGED' | 'BLOCKED';

export interface GeoLocation {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  continent: string;
  continentCode: string;
  /** True when ip-api reported the IP as a proxy/VPN/Tor exit node */
  isProxy: boolean;
  /** True when ip-api reported the IP as a hosting provider (data-centre) */
  isHosting: boolean;
  /** True when we couldn't reach the geolocation API */
  lookupFailed: boolean;
}

export interface GeofencingCheckResult {
  verdict: GeoVerdict;
  location: GeoLocation;
  reason: string;
  riskScore: number;
  /** Challenge type to show the user when verdict === 'CHALLENGED' */
  challengeType?: 'EMAIL_OTP' | 'TOTP' | 'ADMIN_APPROVAL';
  /** ISO timestamp – set for BLOCKED verdicts so the UI can display it */
  blockedUntil?: string;
  /** Informational flags collected during the check */
  flags: string[];
}

export interface GeofencingLogEntry {
  userId?: string;
  email?: string;
  ip: string;
  verdict: GeoVerdict;
  location: GeoLocation;
  reason: string;
  riskScore: number;
  userAgent?: string;
  timestamp?: Date;
  flags: string[];
  challengeType?: string;
}

// ---------------------------------------------------------------------------
// Continent lookup
// ---------------------------------------------------------------------------

const CONTINENT_MAP: Record<string, string> = {
  AF: 'Africa',
  AN: 'Antarctica',
  AS: 'Asia',
  EU: 'Europe',
  NA: 'North America',
  OC: 'Oceania',
  SA: 'South America',
};

// Reverse map – country code → continent code (abbreviated, covers ~250 countries)
const COUNTRY_TO_CONTINENT: Record<string, string> = {
  AF: 'AS', AX: 'EU', AL: 'EU', DZ: 'AF', AS: 'OC', AD: 'EU', AO: 'AF',
  AI: 'NA', AQ: 'AN', AG: 'NA', AR: 'SA', AM: 'AS', AW: 'NA', AU: 'OC',
  AT: 'EU', AZ: 'AS', BS: 'NA', BH: 'AS', BD: 'AS', BB: 'NA', BY: 'EU',
  BE: 'EU', BZ: 'NA', BJ: 'AF', BM: 'NA', BT: 'AS', BO: 'SA', BQ: 'NA',
  BA: 'EU', BW: 'AF', BV: 'AN', BR: 'SA', IO: 'AS', BN: 'AS', BG: 'EU',
  BF: 'AF', BI: 'AF', CV: 'AF', KH: 'AS', CM: 'AF', CA: 'NA', KY: 'NA',
  CF: 'AF', TD: 'AF', CL: 'SA', CN: 'AS', CX: 'AS', CC: 'AS', CO: 'SA',
  KM: 'AF', CG: 'AF', CD: 'AF', CK: 'OC', CR: 'NA', CI: 'AF', HR: 'EU',
  CU: 'NA', CW: 'NA', CY: 'AS', CZ: 'EU', DK: 'EU', DJ: 'AF', DM: 'NA',
  DO: 'NA', EC: 'SA', EG: 'AF', SV: 'NA', GQ: 'AF', ER: 'AF', EE: 'EU',
  SZ: 'AF', ET: 'AF', FK: 'SA', FO: 'EU', FJ: 'OC', FI: 'EU', FR: 'EU',
  GF: 'SA', PF: 'OC', TF: 'AN', GA: 'AF', GM: 'AF', GE: 'AS', DE: 'EU',
  GH: 'AF', GI: 'EU', GR: 'EU', GL: 'NA', GD: 'NA', GP: 'NA', GU: 'OC',
  GT: 'NA', GG: 'EU', GN: 'AF', GW: 'AF', GY: 'SA', HT: 'NA', HM: 'AN',
  VA: 'EU', HN: 'NA', HK: 'AS', HU: 'EU', IS: 'EU', IN: 'AS', ID: 'AS',
  IR: 'AS', IQ: 'AS', IE: 'EU', IM: 'EU', IL: 'AS', IT: 'EU', JM: 'NA',
  JP: 'AS', JE: 'EU', JO: 'AS', KZ: 'AS', KE: 'AF', KI: 'OC', KP: 'AS',
  KR: 'AS', KW: 'AS', KG: 'AS', LA: 'AS', LV: 'EU', LB: 'AS', LS: 'AF',
  LR: 'AF', LY: 'AF', LI: 'EU', LT: 'EU', LU: 'EU', MO: 'AS', MG: 'AF',
  MW: 'AF', MY: 'AS', MV: 'AS', ML: 'AF', MT: 'EU', MH: 'OC', MQ: 'NA',
  MR: 'AF', MU: 'AF', YT: 'AF', MX: 'NA', FM: 'OC', MD: 'EU', MC: 'EU',
  MN: 'AS', ME: 'EU', MS: 'NA', MA: 'AF', MZ: 'AF', MM: 'AS', NA: 'AF',
  NR: 'OC', NP: 'AS', NL: 'EU', NC: 'OC', NZ: 'OC', NI: 'NA', NE: 'AF',
  NG: 'AF', NU: 'OC', NF: 'OC', MK: 'EU', MP: 'OC', NO: 'EU', OM: 'AS',
  PK: 'AS', PW: 'OC', PS: 'AS', PA: 'NA', PG: 'OC', PY: 'SA', PE: 'SA',
  PH: 'AS', PN: 'OC', PL: 'EU', PT: 'EU', PR: 'NA', QA: 'AS', RE: 'AF',
  RO: 'EU', RU: 'EU', RW: 'AF', BL: 'NA', SH: 'AF', KN: 'NA', LC: 'NA',
  MF: 'NA', PM: 'NA', VC: 'NA', WS: 'OC', SM: 'EU', ST: 'AF', SA: 'AS',
  SN: 'AF', RS: 'EU', SC: 'AF', SL: 'AF', SG: 'AS', SX: 'NA', SK: 'EU',
  SI: 'EU', SB: 'OC', SO: 'AF', ZA: 'AF', GS: 'AN', SS: 'AF', ES: 'EU',
  LK: 'AS', SD: 'AF', SR: 'SA', SJ: 'EU', SE: 'EU', CH: 'EU', SY: 'AS',
  TW: 'AS', TJ: 'AS', TZ: 'AF', TH: 'AS', TL: 'AS', TG: 'AF', TK: 'OC',
  TO: 'OC', TT: 'NA', TN: 'AF', TR: 'AS', TM: 'AS', TC: 'NA', TV: 'OC',
  UG: 'AF', UA: 'EU', AE: 'AS', GB: 'EU', US: 'NA', UM: 'OC', UY: 'SA',
  UZ: 'AS', VU: 'OC', VE: 'SA', VN: 'AS', VG: 'NA', VI: 'NA', WF: 'OC',
  EH: 'AF', YE: 'AS', ZM: 'AF', ZW: 'AF',
};

// ---------------------------------------------------------------------------
// IP Geolocation
// ---------------------------------------------------------------------------

const GEO_API_BASE = 'http://ip-api.com/json';
const GEO_API_FIELDS = 'status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,proxy,hosting,continent,continentCode';

/**
 * Resolve an IPv4/IPv6 address to structured location data.
 * Falls back to a "UNKNOWN" record if the API is unreachable.
 */
export async function resolveIPLocation(ip: string): Promise<GeoLocation> {
  // Strip port if present (e.g. "1.2.3.4:1234")
  const cleanIP = ip.split(':')[0];

  // Treat localhost / private ranges as a special case
  if (isPrivateIP(cleanIP)) {
    return buildPrivateIPLocation(cleanIP);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      `${GEO_API_BASE}/${encodeURIComponent(cleanIP)}?fields=${GEO_API_FIELDS}`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!res.ok) {
      return buildUnknownLocation(cleanIP);
    }

    const data = await res.json();

    if (data.status !== 'success') {
      return buildUnknownLocation(cleanIP);
    }

    const continentCode: string =
      data.continentCode ||
      COUNTRY_TO_CONTINENT[data.countryCode] ||
      'XX';

    return {
      ip: cleanIP,
      country: data.country || 'Unknown',
      countryCode: (data.countryCode || 'XX').toUpperCase(),
      region: data.region || '',
      regionName: data.regionName || '',
      city: data.city || '',
      zip: data.zip || '',
      lat: typeof data.lat === 'number' ? data.lat : 0,
      lon: typeof data.lon === 'number' ? data.lon : 0,
      timezone: data.timezone || '',
      isp: data.isp || '',
      org: data.org || '',
      continent: CONTINENT_MAP[continentCode] || data.continent || 'Unknown',
      continentCode,
      isProxy: data.proxy === true,
      isHosting: data.hosting === true,
      lookupFailed: false,
    };
  } catch {
    return buildUnknownLocation(cleanIP);
  }
}

function isPrivateIP(ip: string): boolean {
  return (
    ip === 'unknown' ||
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith('fc') ||
    ip.startsWith('fd')
  );
}

function buildPrivateIPLocation(ip: string): GeoLocation {
  return {
    ip,
    country: 'Local Network',
    countryCode: 'LN',
    region: '',
    regionName: '',
    city: 'Private',
    zip: '',
    lat: 0,
    lon: 0,
    timezone: '',
    isp: 'Private',
    org: 'Local',
    continent: 'Local',
    continentCode: 'LN',
    isProxy: false,
    isHosting: false,
    lookupFailed: false,
  };
}

function buildUnknownLocation(ip: string): GeoLocation {
  return {
    ip,
    country: 'Unknown',
    countryCode: 'XX',
    region: '',
    regionName: '',
    city: '',
    zip: '',
    lat: 0,
    lon: 0,
    timezone: '',
    isp: '',
    org: '',
    continent: 'Unknown',
    continentCode: 'XX',
    isProxy: false,
    isHosting: false,
    lookupFailed: true,
  };
}

// ---------------------------------------------------------------------------
// CIDR helpers
// ---------------------------------------------------------------------------

/** Convert dotted-decimal IPv4 to a 32-bit unsigned integer */
function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

/** Check whether an IPv4 address falls inside a CIDR block (e.g. "10.0.0.0/8") */
export function ipMatchesCidr(ip: string, cidr: string): boolean {
  try {
    const [range, bits] = cidr.split('/');
    if (!range || bits === undefined) return ip === cidr;
    const mask = bits === '0' ? 0 : (~0 << (32 - parseInt(bits, 10))) >>> 0;
    return (ipv4ToInt(ip) & mask) === (ipv4ToInt(range) & mask);
  } catch {
    return false;
  }
}

/** Check whether an IP is in any of the given CIDR/IP entries */
export function ipMatchesAnyEntry(ip: string, entries: string[]): boolean {
  const cleanIP = ip.split(':')[0];
  return entries.some((entry) => {
    const trimmed = entry.trim();
    if (!trimmed) return false;
    if (trimmed.includes('/')) return ipMatchesCidr(cleanIP, trimmed);
    return cleanIP === trimmed;
  });
}

// ---------------------------------------------------------------------------
// Risk scoring
// ---------------------------------------------------------------------------

export interface RiskFactors {
  isProxy: boolean;
  isHosting: boolean;
  isUnknownLocation: boolean;
  countryNotAllowed: boolean;
  continentNotAllowed: boolean;
  isHighRiskCountry: boolean;
  failedRecentLogins: number;
  isNewLocation: boolean;
  isVPNSuspected: boolean;
  ipIsBlacklisted: boolean;
  outsideAllowedTimeWindow: boolean;
}

// Historically high-risk country codes (used as a signal, not a permanent block)
const HIGH_RISK_COUNTRY_CODES = new Set([
  'KP', // North Korea
  'CU', // Cuba  (US sanctions)
  'SY', // Syria
  'SD', // Sudan
  'MM', // Myanmar
]);

export function calculateGeoRiskScore(factors: RiskFactors): number {
  let score = 0;

  if (factors.ipIsBlacklisted) score += 90;
  if (factors.isProxy) score += 40;
  if (factors.isHosting) score += 25;
  if (factors.isHighRiskCountry) score += 35;
  if (factors.countryNotAllowed) score += 50;
  if (factors.continentNotAllowed) score += 30;
  if (factors.isUnknownLocation) score += 20;
  if (factors.failedRecentLogins >= 5) score += 30;
  else if (factors.failedRecentLogins >= 3) score += 15;
  else if (factors.failedRecentLogins >= 1) score += 5;
  if (factors.isNewLocation) score += 15;
  if (factors.isVPNSuspected) score += 20;
  if (factors.outsideAllowedTimeWindow) score += 25;

  return Math.min(score, 100);
}

// ---------------------------------------------------------------------------
// Core check function
// ---------------------------------------------------------------------------

/**
 * Perform a full geofencing check for an authentication attempt.
 *
 * @param ip          The originating IP address
 * @param userId      Optional – used to look up per-user or global config
 * @param userAgent   Optional – logged for auditing
 * @param email       Optional – logged for auditing
 */
export async function checkGeofencing(
  ip: string,
  userId?: string,
  userAgent?: string,
  email?: string,
): Promise<GeofencingCheckResult> {
  await connectDB();

  // 1. Fetch active global config (we keep a single "global" doc)
  const config: IGeofencingConfig | null = await GeofencingConfig.findOne({
    isActive: true,
  }).lean();

  // If geofencing is disabled or no config exists, allow everything
  if (!config || !config.enabled) {
    const location = await resolveIPLocation(ip);
    return {
      verdict: 'ALLOWED',
      location,
      reason: 'Geofencing is disabled',
      riskScore: 0,
      flags: [],
    };
  }

  // 2. Resolve IP to location
  const location = await resolveIPLocation(ip);

  const flags: string[] = [];

  // 3. Whitelist check – always pass whitelisted IPs
  const whitelistEntries: string[] = config.whitelistedIPs || [];
  if (ipMatchesAnyEntry(ip, whitelistEntries)) {
    const result = buildResult('ALLOWED', location, 'IP is whitelisted', 0, flags);
    await logAttempt({ userId, email, ip, verdict: 'ALLOWED', location, reason: result.reason, riskScore: 0, userAgent, flags });
    return result;
  }

  // 4. Blacklist check
  const blacklistEntries: string[] = config.blacklistedIPs || [];
  if (ipMatchesAnyEntry(ip, blacklistEntries)) {
    flags.push('IP_BLACKLISTED');
    const riskScore = 100;
    const result = buildResult('BLOCKED', location, 'IP is blacklisted', riskScore, flags);
    await logAttempt({ userId, email, ip, verdict: 'BLOCKED', location, reason: result.reason, riskScore, userAgent, flags });
    return result;
  }

  // 5. Collect risk factors
  const allowedCountries: string[] = (config.allowedCountries || []).map((c: string) => c.toUpperCase());
  const blockedCountries: string[] = (config.blockedCountries || []).map((c: string) => c.toUpperCase());
  const allowedContinents: string[] = (config.allowedContinents || []).map((c: string) => c.toUpperCase());

  const countryCode = location.countryCode.toUpperCase();
  const continentCode = location.continentCode.toUpperCase();

  // 5a. Hard block on explicitly blocked countries
  if (blockedCountries.length > 0 && blockedCountries.includes(countryCode)) {
    flags.push('COUNTRY_BLOCKED');
    const riskScore = 95;
    const result = buildResult(
      'BLOCKED',
      location,
      `Login from blocked country: ${location.country}`,
      riskScore,
      flags,
    );
    await logAttempt({ userId, email, ip, verdict: 'BLOCKED', location, reason: result.reason, riskScore, userAgent, flags });
    return result;
  }

  // 5b. Allowed-country enforcement (opt-in mode)
  const countryNotAllowed =
    allowedCountries.length > 0 &&
    !allowedCountries.includes(countryCode) &&
    countryCode !== 'LN'; // Never block private/local IPs

  // 5c. Allowed-continent enforcement
  const continentNotAllowed =
    allowedContinents.length > 0 &&
    !allowedContinents.includes(continentCode) &&
    continentCode !== 'LN';

  if (location.isProxy) flags.push('PROXY_DETECTED');
  if (location.isHosting) flags.push('HOSTING_IP');
  if (location.lookupFailed) flags.push('GEO_LOOKUP_FAILED');
  if (HIGH_RISK_COUNTRY_CODES.has(countryCode)) flags.push('HIGH_RISK_COUNTRY');
  if (countryNotAllowed) flags.push('COUNTRY_NOT_IN_ALLOWLIST');
  if (continentNotAllowed) flags.push('CONTINENT_NOT_IN_ALLOWLIST');

  const factors: RiskFactors = {
    isProxy: location.isProxy,
    isHosting: location.isHosting,
    isUnknownLocation: location.lookupFailed,
    countryNotAllowed,
    continentNotAllowed,
    isHighRiskCountry: HIGH_RISK_COUNTRY_CODES.has(countryCode),
    failedRecentLogins: 0, // Would come from rate-limit store in a full implementation
    isNewLocation: false,  // Would compare with user's location history
    isVPNSuspected: location.isProxy || location.isHosting,
    ipIsBlacklisted: false,
    outsideAllowedTimeWindow: isOutsideAllowedTimeWindow(config),
  };

  if (factors.outsideAllowedTimeWindow) flags.push('OUTSIDE_TIME_WINDOW');

  const riskScore = calculateGeoRiskScore(factors);

  // 6. Decide verdict
  const blockThreshold = config.blockThreshold ?? 70;
  const challengeThreshold = config.challengeThreshold ?? 40;

  // Hard-mode: block if country/continent not in allowlist AND restrictive mode is on
  if (config.restrictiveMode && (countryNotAllowed || continentNotAllowed)) {
    const result = buildResult(
      'BLOCKED',
      location,
      countryNotAllowed
        ? `Login from non-allowed country: ${location.country}`
        : `Login from non-allowed continent: ${location.continent}`,
      riskScore,
      flags,
    );
    await logAttempt({ userId, email, ip, verdict: 'BLOCKED', location, reason: result.reason, riskScore, userAgent, flags });
    return result;
  }

  // Proxy/VPN hard block (if configured)
  if (config.blockProxies && (location.isProxy || location.isHosting)) {
    const result = buildResult(
      'BLOCKED',
      location,
      'Login from VPN/Proxy/Hosting IP is not allowed',
      riskScore,
      flags,
    );
    await logAttempt({ userId, email, ip, verdict: 'BLOCKED', location, reason: result.reason, riskScore, userAgent, flags });
    return result;
  }

  let verdict: GeoVerdict;
  let reason: string;
  let challengeType: 'EMAIL_OTP' | 'TOTP' | 'ADMIN_APPROVAL' | undefined;

  if (riskScore >= blockThreshold) {
    verdict = 'BLOCKED';
    reason = `Login risk score ${riskScore}/100 exceeds block threshold (${blockThreshold})`;
  } else if (riskScore >= challengeThreshold || countryNotAllowed || continentNotAllowed) {
    verdict = 'CHALLENGED';
    reason = riskScore >= challengeThreshold
      ? `Login risk score ${riskScore}/100 exceeds challenge threshold (${challengeThreshold})`
      : `Login from outside allowed regions (challenge mode)`;
    challengeType = config.challengeType || 'EMAIL_OTP';
  } else {
    verdict = 'ALLOWED';
    reason = 'Login location within allowed parameters';
  }

  const result = buildResult(verdict, location, reason, riskScore, flags, challengeType);
  await logAttempt({ userId, email, ip, verdict, location, reason, riskScore, userAgent, flags, challengeType });
  return result;
}

// ---------------------------------------------------------------------------
// Time-window check
// ---------------------------------------------------------------------------

function isOutsideAllowedTimeWindow(config: IGeofencingConfig): boolean {
  if (!config.allowedStartHour && !config.allowedEndHour) return false;
  const now = new Date();
  const hour = now.getUTCHours();
  const start = config.allowedStartHour ?? 0;
  const end = config.allowedEndHour ?? 23;
  if (start <= end) return hour < start || hour > end;
  // Overnight window (e.g. 22:00–06:00)
  return hour > end && hour < start;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildResult(
  verdict: GeoVerdict,
  location: GeoLocation,
  reason: string,
  riskScore: number,
  flags: string[],
  challengeType?: 'EMAIL_OTP' | 'TOTP' | 'ADMIN_APPROVAL',
): GeofencingCheckResult {
  return { verdict, location, reason, riskScore, flags, challengeType };
}

async function logAttempt(entry: GeofencingLogEntry): Promise<void> {
  try {
    await GeoLoginLog.create({
      userId: entry.userId,
      email: entry.email,
      ip: entry.ip,
      verdict: entry.verdict,
      country: entry.location.country,
      countryCode: entry.location.countryCode,
      continent: entry.location.continent,
      continentCode: entry.location.continentCode,
      city: entry.location.city,
      region: entry.location.regionName,
      lat: entry.location.lat,
      lon: entry.location.lon,
      isp: entry.location.isp,
      isProxy: entry.location.isProxy,
      isHosting: entry.location.isHosting,
      lookupFailed: entry.location.lookupFailed,
      reason: entry.reason,
      riskScore: entry.riskScore,
      userAgent: entry.userAgent,
      flags: entry.flags,
      challengeType: entry.challengeType,
      timestamp: new Date(),
    });
  } catch (err) {
    // Non-critical – log to console only
    console.error('[GeofencingEngine] Failed to write GeoLoginLog:', err);
  }
}

// ---------------------------------------------------------------------------
// Utility exports (used by API routes and UI)
// ---------------------------------------------------------------------------

/** Return a list of all unique countries from the login log with their stats */
export async function getLoginLocationStats(days = 30): Promise<
  Array<{
    countryCode: string;
    country: string;
    continent: string;
    totalAttempts: number;
    blocked: number;
    challenged: number;
    allowed: number;
    lastSeen: Date;
  }>
> {
  await connectDB();
  const since = new Date(Date.now() - days * 86_400_000);

  const pipeline = [
    { $match: { timestamp: { $gte: since } } },
    {
      $group: {
        _id: '$countryCode',
        country: { $last: '$country' },
        continent: { $last: '$continent' },
        totalAttempts: { $sum: 1 },
        blocked: { $sum: { $cond: [{ $eq: ['$verdict', 'BLOCKED'] }, 1, 0] } },
        challenged: { $sum: { $cond: [{ $eq: ['$verdict', 'CHALLENGED'] }, 1, 0] } },
        allowed: { $sum: { $cond: [{ $eq: ['$verdict', 'ALLOWED'] }, 1, 0] } },
        lastSeen: { $max: '$timestamp' },
      },
    },
    { $sort: { totalAttempts: -1 } },
    { $limit: 100 },
  ];

  const rows = await GeoLoginLog.aggregate(pipeline);
  return rows.map((r: any) => ({
    countryCode: r._id,
    country: r.country,
    continent: r.continent,
    totalAttempts: r.totalAttempts,
    blocked: r.blocked,
    challenged: r.challenged,
    allowed: r.allowed,
    lastSeen: r.lastSeen,
  }));
}

/** Fetch recent login log entries (newest first) */
export async function getRecentGeoLogs(
  limit = 50,
  verdict?: GeoVerdict,
): Promise<any[]> {
  await connectDB();
  const query: Record<string, any> = {};
  if (verdict) query.verdict = verdict;
  return GeoLoginLog.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
}

/** Fetch or initialise the active geofencing config */
export async function getOrCreateConfig(): Promise<IGeofencingConfig> {
  await connectDB();
  let config = await GeofencingConfig.findOne({ isActive: true });
  if (!config) {
    config = await GeofencingConfig.create({
      enabled: false,
      restrictiveMode: false,
      blockProxies: false,
      allowedCountries: [],
      blockedCountries: [],
      allowedContinents: [],
      whitelistedIPs: [],
      blacklistedIPs: [],
      blockThreshold: 70,
      challengeThreshold: 40,
      challengeType: 'EMAIL_OTP',
      isActive: true,
    });
  }
  return config;
}

/** Convenience – bulk-add country codes to either the allow or block list */
export async function addCountriesToList(
  codes: string[],
  list: 'allowedCountries' | 'blockedCountries',
): Promise<IGeofencingConfig> {
  await connectDB();
  const config = await getOrCreateConfig();
  const upper = codes.map((c) => c.toUpperCase());
  const existing: string[] = (config as any)[list] || [];
  const merged = Array.from(new Set([...existing, ...upper]));
  (config as any)[list] = merged;
  await (config as any).save();
  return config;
}

/** Convenience – remove country codes from a list */
export async function removeCountriesFromList(
  codes: string[],
  list: 'allowedCountries' | 'blockedCountries',
): Promise<IGeofencingConfig> {
  await connectDB();
  const config = await getOrCreateConfig();
  const upper = codes.map((c) => c.toUpperCase());
  (config as any)[list] = ((config as any)[list] || []).filter(
    (c: string) => !upper.includes(c),
  );
  await (config as any).save();
  return config;
}

/** Convenience – add/remove IPs from whitelist or blacklist */
export async function manageIPList(
  ips: string[],
  list: 'whitelistedIPs' | 'blacklistedIPs',
  action: 'add' | 'remove',
): Promise<IGeofencingConfig> {
  await connectDB();
  const config = await getOrCreateConfig();
  const current: string[] = (config as any)[list] || [];
  if (action === 'add') {
    (config as any)[list] = Array.from(new Set([...current, ...ips]));
  } else {
    (config as any)[list] = current.filter((ip) => !ips.includes(ip));
  }
  await (config as any).save();
  return config;
}

/** Delete all geo-login logs older than `days` days */
export async function purgeOldLogs(days = 90): Promise<number> {
  await connectDB();
  const cutoff = new Date(Date.now() - days * 86_400_000);
  const result = await GeoLoginLog.deleteMany({ timestamp: { $lt: cutoff } });
  return result.deletedCount ?? 0;
}

/** Get dashboard summary counts */
export async function getGeofencingSummary(): Promise<{
  totalSince30d: number;
  blocked30d: number;
  challenged30d: number;
  allowed30d: number;
  uniqueCountries: number;
  topBlockedCountry: string;
  proxyAttempts: number;
}> {
  await connectDB();
  const since = new Date(Date.now() - 30 * 86_400_000);

  const [counts, proxyCount] = await Promise.all([
    GeoLoginLog.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          blocked: { $sum: { $cond: [{ $eq: ['$verdict', 'BLOCKED'] }, 1, 0] } },
          challenged: { $sum: { $cond: [{ $eq: ['$verdict', 'CHALLENGED'] }, 1, 0] } },
          allowed: { $sum: { $cond: [{ $eq: ['$verdict', 'ALLOWED'] }, 1, 0] } },
          countries: { $addToSet: '$countryCode' },
        },
      },
    ]),
    GeoLoginLog.countDocuments({ timestamp: { $gte: since }, isProxy: true }),
  ]);

  const topBlockedResult = await GeoLoginLog.aggregate([
    { $match: { timestamp: { $gte: since }, verdict: 'BLOCKED' } },
    { $group: { _id: '$country', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 },
  ]);

  const row = counts[0] || {
    total: 0, blocked: 0, challenged: 0, allowed: 0, countries: [],
  };

  return {
    totalSince30d: row.total,
    blocked30d: row.blocked,
    challenged30d: row.challenged,
    allowed30d: row.allowed,
    uniqueCountries: (row.countries || []).length,
    topBlockedCountry: topBlockedResult[0]?._id || 'N/A',
    proxyAttempts: proxyCount,
  };
}
