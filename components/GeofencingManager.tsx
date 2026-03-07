'use client';

/**
 * GeofencingManager – Full-featured geofencing configuration & monitoring panel.
 *
 * Sub-tabs:
 *   Overview    – live stats cards + 14-day activity chart + top-flags table
 *   Configuration – enable/disable engine, mode switches, threshold sliders
 *   Countries   – allowed / blocked country lists with search + add/remove
 *   Continents  – allowed continent list
 *   IP Lists    – whitelist / blacklist CIDR / IP management
 *   Login Logs  – filterable, paginated audit log of all geo-login events
 */

import React, { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeoConfig {
  _id?: string;
  enabled: boolean;
  restrictiveMode: boolean;
  blockProxies: boolean;
  allowedCountries: string[];
  blockedCountries: string[];
  allowedContinents: string[];
  whitelistedIPs: string[];
  blacklistedIPs: string[];
  blockThreshold: number;
  challengeThreshold: number;
  challengeType: 'EMAIL_OTP' | 'TOTP' | 'ADMIN_APPROVAL';
  allowedStartHour?: number | null;
  allowedEndHour?: number | null;
  lastModifiedNote?: string;
}

interface GeoStats {
  summary: {
    totalSince30d: number;
    blocked30d: number;
    challenged30d: number;
    allowed30d: number;
    uniqueCountries: number;
    topBlockedCountry: string;
    proxyAttempts: number;
  };
  locationStats: Array<{
    countryCode: string;
    country: string;
    continent: string;
    totalAttempts: number;
    blocked: number;
    challenged: number;
    allowed: number;
    lastSeen: string;
  }>;
  dailySeries: Array<{ date: string; blocked: number; challenged: number; allowed: number }>;
  topFlags: Array<{ flag: string; count: number }>;
}

interface GeoLog {
  _id: string;
  email?: string;
  ip: string;
  verdict: 'ALLOWED' | 'CHALLENGED' | 'BLOCKED';
  country: string;
  countryCode: string;
  city: string;
  isProxy: boolean;
  isHosting: boolean;
  riskScore: number;
  reason: string;
  flags: string[];
  timestamp: string;
  userAgent?: string;
}

interface ToastAPI {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
  warning: (msg: string) => void;
}

interface Props {
  toast: ToastAPI;
}

// ─── Country data ─────────────────────────────────────────────────────────────

const ALL_COUNTRIES: Array<{ code: string; name: string; continent: string }> = [
  { code: 'AF', name: 'Afghanistan', continent: 'AS' },
  { code: 'AL', name: 'Albania', continent: 'EU' },
  { code: 'DZ', name: 'Algeria', continent: 'AF' },
  { code: 'AR', name: 'Argentina', continent: 'SA' },
  { code: 'AM', name: 'Armenia', continent: 'AS' },
  { code: 'AU', name: 'Australia', continent: 'OC' },
  { code: 'AT', name: 'Austria', continent: 'EU' },
  { code: 'AZ', name: 'Azerbaijan', continent: 'AS' },
  { code: 'BH', name: 'Bahrain', continent: 'AS' },
  { code: 'BD', name: 'Bangladesh', continent: 'AS' },
  { code: 'BY', name: 'Belarus', continent: 'EU' },
  { code: 'BE', name: 'Belgium', continent: 'EU' },
  { code: 'BO', name: 'Bolivia', continent: 'SA' },
  { code: 'BA', name: 'Bosnia and Herzegovina', continent: 'EU' },
  { code: 'BR', name: 'Brazil', continent: 'SA' },
  { code: 'BG', name: 'Bulgaria', continent: 'EU' },
  { code: 'MM', name: 'Myanmar', continent: 'AS' },
  { code: 'CA', name: 'Canada', continent: 'NA' },
  { code: 'CL', name: 'Chile', continent: 'SA' },
  { code: 'CN', name: 'China', continent: 'AS' },
  { code: 'CO', name: 'Colombia', continent: 'SA' },
  { code: 'HR', name: 'Croatia', continent: 'EU' },
  { code: 'CU', name: 'Cuba', continent: 'NA' },
  { code: 'CY', name: 'Cyprus', continent: 'AS' },
  { code: 'CZ', name: 'Czech Republic', continent: 'EU' },
  { code: 'DK', name: 'Denmark', continent: 'EU' },
  { code: 'EG', name: 'Egypt', continent: 'AF' },
  { code: 'EE', name: 'Estonia', continent: 'EU' },
  { code: 'ET', name: 'Ethiopia', continent: 'AF' },
  { code: 'FI', name: 'Finland', continent: 'EU' },
  { code: 'FR', name: 'France', continent: 'EU' },
  { code: 'GE', name: 'Georgia', continent: 'AS' },
  { code: 'DE', name: 'Germany', continent: 'EU' },
  { code: 'GH', name: 'Ghana', continent: 'AF' },
  { code: 'GR', name: 'Greece', continent: 'EU' },
  { code: 'GT', name: 'Guatemala', continent: 'NA' },
  { code: 'HN', name: 'Honduras', continent: 'NA' },
  { code: 'HK', name: 'Hong Kong', continent: 'AS' },
  { code: 'HU', name: 'Hungary', continent: 'EU' },
  { code: 'IS', name: 'Iceland', continent: 'EU' },
  { code: 'IN', name: 'India', continent: 'AS' },
  { code: 'ID', name: 'Indonesia', continent: 'AS' },
  { code: 'IR', name: 'Iran', continent: 'AS' },
  { code: 'IQ', name: 'Iraq', continent: 'AS' },
  { code: 'IE', name: 'Ireland', continent: 'EU' },
  { code: 'IL', name: 'Israel', continent: 'AS' },
  { code: 'IT', name: 'Italy', continent: 'EU' },
  { code: 'JM', name: 'Jamaica', continent: 'NA' },
  { code: 'JP', name: 'Japan', continent: 'AS' },
  { code: 'JO', name: 'Jordan', continent: 'AS' },
  { code: 'KZ', name: 'Kazakhstan', continent: 'AS' },
  { code: 'KE', name: 'Kenya', continent: 'AF' },
  { code: 'KP', name: 'North Korea', continent: 'AS' },
  { code: 'KR', name: 'South Korea', continent: 'AS' },
  { code: 'KW', name: 'Kuwait', continent: 'AS' },
  { code: 'LV', name: 'Latvia', continent: 'EU' },
  { code: 'LB', name: 'Lebanon', continent: 'AS' },
  { code: 'LT', name: 'Lithuania', continent: 'EU' },
  { code: 'LU', name: 'Luxembourg', continent: 'EU' },
  { code: 'MY', name: 'Malaysia', continent: 'AS' },
  { code: 'MX', name: 'Mexico', continent: 'NA' },
  { code: 'MA', name: 'Morocco', continent: 'AF' },
  { code: 'NL', name: 'Netherlands', continent: 'EU' },
  { code: 'NZ', name: 'New Zealand', continent: 'OC' },
  { code: 'NG', name: 'Nigeria', continent: 'AF' },
  { code: 'NO', name: 'Norway', continent: 'EU' },
  { code: 'OM', name: 'Oman', continent: 'AS' },
  { code: 'PK', name: 'Pakistan', continent: 'AS' },
  { code: 'PS', name: 'Palestine', continent: 'AS' },
  { code: 'PA', name: 'Panama', continent: 'NA' },
  { code: 'PE', name: 'Peru', continent: 'SA' },
  { code: 'PH', name: 'Philippines', continent: 'AS' },
  { code: 'PL', name: 'Poland', continent: 'EU' },
  { code: 'PT', name: 'Portugal', continent: 'EU' },
  { code: 'QA', name: 'Qatar', continent: 'AS' },
  { code: 'RO', name: 'Romania', continent: 'EU' },
  { code: 'RU', name: 'Russia', continent: 'EU' },
  { code: 'SA', name: 'Saudi Arabia', continent: 'AS' },
  { code: 'SN', name: 'Senegal', continent: 'AF' },
  { code: 'RS', name: 'Serbia', continent: 'EU' },
  { code: 'SG', name: 'Singapore', continent: 'AS' },
  { code: 'SK', name: 'Slovakia', continent: 'EU' },
  { code: 'SI', name: 'Slovenia', continent: 'EU' },
  { code: 'ZA', name: 'South Africa', continent: 'AF' },
  { code: 'ES', name: 'Spain', continent: 'EU' },
  { code: 'LK', name: 'Sri Lanka', continent: 'AS' },
  { code: 'SD', name: 'Sudan', continent: 'AF' },
  { code: 'SE', name: 'Sweden', continent: 'EU' },
  { code: 'CH', name: 'Switzerland', continent: 'EU' },
  { code: 'SY', name: 'Syria', continent: 'AS' },
  { code: 'TW', name: 'Taiwan', continent: 'AS' },
  { code: 'TH', name: 'Thailand', continent: 'AS' },
  { code: 'TN', name: 'Tunisia', continent: 'AF' },
  { code: 'TR', name: 'Turkey', continent: 'AS' },
  { code: 'TM', name: 'Turkmenistan', continent: 'AS' },
  { code: 'UG', name: 'Uganda', continent: 'AF' },
  { code: 'UA', name: 'Ukraine', continent: 'EU' },
  { code: 'AE', name: 'United Arab Emirates', continent: 'AS' },
  { code: 'GB', name: 'United Kingdom', continent: 'EU' },
  { code: 'US', name: 'United States', continent: 'NA' },
  { code: 'UY', name: 'Uruguay', continent: 'SA' },
  { code: 'UZ', name: 'Uzbekistan', continent: 'AS' },
  { code: 'VE', name: 'Venezuela', continent: 'SA' },
  { code: 'VN', name: 'Vietnam', continent: 'AS' },
  { code: 'YE', name: 'Yemen', continent: 'AS' },
  { code: 'ZM', name: 'Zambia', continent: 'AF' },
  { code: 'ZW', name: 'Zimbabwe', continent: 'AF' },
];

const CONTINENT_OPTIONS = [
  { code: 'AF', name: 'Africa' },
  { code: 'AS', name: 'Asia' },
  { code: 'EU', name: 'Europe' },
  { code: 'NA', name: 'North America' },
  { code: 'SA', name: 'South America' },
  { code: 'OC', name: 'Oceania' },
  { code: 'AN', name: 'Antarctica' },
];

const FLAG_EMOJIS: Record<string, string> = {
  AF: '🇦🇫', AL: '🇦🇱', DZ: '🇩🇿', AR: '🇦🇷', AU: '🇦🇺', AT: '🇦🇹',
  AZ: '🇦🇿', BH: '🇧🇭', BD: '🇧🇩', BY: '🇧🇾', BE: '🇧🇪', BR: '🇧🇷',
  BG: '🇧🇬', CA: '🇨🇦', CL: '🇨🇱', CN: '🇨🇳', CO: '🇨🇴', HR: '🇭🇷',
  CU: '🇨🇺', CY: '🇨🇾', CZ: '🇨🇿', DK: '🇩🇰', EG: '🇪🇬', EE: '🇪🇪',
  FI: '🇫🇮', FR: '🇫🇷', GE: '🇬🇪', DE: '🇩🇪', GH: '🇬🇭', GR: '🇬🇷',
  HU: '🇭🇺', IS: '🇮🇸', IN: '🇮🇳', ID: '🇮🇩', IR: '🇮🇷', IQ: '🇮🇶',
  IE: '🇮🇪', IL: '🇮🇱', IT: '🇮🇹', JP: '🇯🇵', JO: '🇯🇴', KZ: '🇰🇿',
  KE: '🇰🇪', KP: '🇰🇵', KR: '🇰🇷', KW: '🇰🇼', LV: '🇱🇻', LB: '🇱🇧',
  LT: '🇱🇹', LU: '🇱🇺', MY: '🇲🇾', MX: '🇲🇽', MA: '🇲🇦', NL: '🇳🇱',
  NZ: '🇳🇿', NG: '🇳🇬', NO: '🇳🇴', OM: '🇴🇲', PK: '🇵🇰', PE: '🇵🇪',
  PH: '🇵🇭', PL: '🇵🇱', PT: '🇵🇹', QA: '🇶🇦', RO: '🇷🇴', RU: '🇷🇺',
  SA: '🇸🇦', SG: '🇸🇬', ZA: '🇿🇦', ES: '🇪🇸', SE: '🇸🇪', CH: '🇨🇭',
  SY: '🇸🇾', TW: '🇹🇼', TH: '🇹🇭', TN: '🇹🇳', TR: '🇹🇷', UA: '🇺🇦',
  AE: '🇦🇪', GB: '🇬🇧', US: '🇺🇸', UZ: '🇺🇿', VN: '🇻🇳', YE: '🇾🇪',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const flagOf = (code: string) => FLAG_EMOJIS[code] || '🏳';
const countryName = (code: string) =>
  ALL_COUNTRIES.find((c) => c.code === code)?.name ?? code;

const verdictColor = (v: string) => {
  if (v === 'BLOCKED') return 'bg-red-100 text-red-700 border-red-200';
  if (v === 'CHALLENGED') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-green-100 text-green-700 border-green-200';
};

const verdictIcon = (v: string) => {
  if (v === 'BLOCKED') return '🚫';
  if (v === 'CHALLENGED') return '⚠️';
  return '✅';
};

const riskColor = (score: number) => {
  if (score >= 70) return 'text-red-600 font-bold';
  if (score >= 40) return 'text-yellow-600 font-semibold';
  return 'text-green-600';
};

const formatDate = (ts: string) => {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
};

const EMPTY_CONFIG: GeoConfig = {
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
  allowedStartHour: null,
  allowedEndHour: null,
  lastModifiedNote: '',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GeofencingManager({ toast }: Props) {
  type SubTab = 'overview' | 'configuration' | 'countries' | 'continents' | 'ip-lists' | 'logs';

  const [subTab, setSubTab] = useState<SubTab>('overview');

  // Data
  const [config, setConfig] = useState<GeoConfig>(EMPTY_CONFIG);
  const [stats, setStats] = useState<GeoStats | null>(null);
  const [logs, setLogs] = useState<GeoLog[]>([]);
  const [logPagination, setLogPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // UI state
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Log filter state
  const [logVerdict, setLogVerdict] = useState('');
  const [logCountry, setLogCountry] = useState('');
  const [logEmail, setLogEmail] = useState('');
  const [logProxy, setLogProxy] = useState('');
  const [logPage, setLogPage] = useState(1);

  // Country list management
  const [countrySearch, setCountrySearch] = useState('');
  const [countryListTarget, setCountryListTarget] = useState<'allowedCountries' | 'blockedCountries'>('allowedCountries');

  // IP list management
  const [newIP, setNewIP] = useState('');
  const [ipListTarget, setIpListTarget] = useState<'whitelistedIPs' | 'blacklistedIPs'>('whitelistedIPs');

  // Test IP state
  const [testIP, setTestIP] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testingIP, setTestingIP] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchConfig = useCallback(async () => {
    try {
      setLoadingConfig(true);
      const res = await fetch('/api/geofencing/config', { headers });
      const data = await res.json();
      if (data.success) setConfig(data.config);
    } catch {
      toast.error('Failed to load geofencing config');
    } finally {
      setLoadingConfig(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await fetch('/api/geofencing/stats', { headers });
      const data = await res.json();
      if (data.success) setStats(data);
    } catch {
      toast.error('Failed to load geofencing stats');
    } finally {
      setLoadingStats(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLogs = useCallback(async (page = 1) => {
    try {
      setLoadingLogs(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (logVerdict) params.set('verdict', logVerdict);
      if (logCountry) params.set('countryCode', logCountry);
      if (logEmail) params.set('email', logEmail);
      if (logProxy) params.set('isProxy', logProxy);

      const res = await fetch(`/api/geofencing/logs?${params}`, { headers });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
        setLogPagination(data.pagination);
      }
    } catch {
      toast.error('Failed to load geo logs');
    } finally {
      setLoadingLogs(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logVerdict, logCountry, logEmail, logProxy]);

  useEffect(() => {
    fetchConfig();
    fetchStats();
  }, [fetchConfig, fetchStats]);

  useEffect(() => {
    if (subTab === 'logs') fetchLogs(logPage);
  }, [subTab, logPage, fetchLogs]);

  // ── Save config ───────────────────────────────────────────────────────────

  const saveConfig = async () => {
    if (config.challengeThreshold >= config.blockThreshold) {
      toast.error('Challenge threshold must be lower than block threshold');
      return;
    }
    try {
      setSavingConfig(true);
      const res = await fetch('/api/geofencing/config', {
        method: 'POST',
        headers,
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        toast.success('Geofencing configuration saved!');
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to save config');
    } finally {
      setSavingConfig(false);
    }
  };

  // ── Country list helpers ──────────────────────────────────────────────────

  const addCountry = async (code: string) => {
    try {
      const res = await fetch('/api/geofencing/config', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ operation: 'add', list: countryListTarget, values: [code] }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        toast.success(`Added ${countryName(code)} to ${countryListTarget === 'allowedCountries' ? 'allow' : 'block'} list`);
      } else throw new Error(data.error);
    } catch (e: any) {
      toast.error(e.message || 'Failed to add country');
    }
  };

  const removeCountry = async (code: string, list: 'allowedCountries' | 'blockedCountries') => {
    try {
      const res = await fetch('/api/geofencing/config', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ operation: 'remove', list, values: [code] }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        toast.success(`Removed ${countryName(code)}`);
      } else throw new Error(data.error);
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove country');
    }
  };

  const toggleContinent = async (code: string, adding: boolean) => {
    try {
      const res = await fetch('/api/geofencing/config', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          operation: adding ? 'add' : 'remove',
          list: 'allowedContinents',
          values: [code],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        toast.success(`${adding ? 'Added' : 'Removed'} continent`);
      } else throw new Error(data.error);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update continent list');
    }
  };

  // ── IP list helpers ───────────────────────────────────────────────────────

  const addIP = async () => {
    if (!newIP.trim()) return;
    try {
      const res = await fetch('/api/geofencing/config', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ operation: 'add', list: ipListTarget, values: [newIP.trim()] }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setNewIP('');
        toast.success(`IP added to ${ipListTarget === 'whitelistedIPs' ? 'whitelist' : 'blacklist'}`);
      } else throw new Error(data.error);
    } catch (e: any) {
      toast.error(e.message || 'Failed to add IP');
    }
  };

  const removeIP = async (ip: string, list: 'whitelistedIPs' | 'blacklistedIPs') => {
    try {
      const res = await fetch('/api/geofencing/config', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ operation: 'remove', list, values: [ip] }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        toast.success('IP removed');
      } else throw new Error(data.error);
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove IP');
    }
  };

  // ── Test IP ───────────────────────────────────────────────────────────────

  const handleTestIP = async () => {
    if (!testIP.trim()) return;
    try {
      setTestingIP(true);
      setTestResult(null);
      const res = await fetch('/api/geofencing/check', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ip: testIP.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(data.result);
      } else {
        toast.error(data.error || 'Check failed');
      }
    } catch {
      toast.error('Test failed');
    } finally {
      setTestingIP(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  const StatCard = ({
    label, value, sub, icon, color,
  }: { label: string; value: string | number; sub?: string; icon: string; color: string }) => (
    <div className={`bg-white p-5 rounded-xl border-l-4 ${color} shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <span className="text-4xl">{icon}</span>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Sub-tab: Overview
  // ─────────────────────────────────────────────────────────────────────────

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={`p-4 rounded-xl border flex items-center gap-4 ${config.enabled ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <span className="text-3xl">{config.enabled ? '🌐' : '⏸'}</span>
        <div>
          <p className={`font-bold text-lg ${config.enabled ? 'text-green-800' : 'text-yellow-800'}`}>
            Geofencing Engine is {config.enabled ? 'ACTIVE' : 'DISABLED'}
          </p>
          <p className="text-sm text-gray-600">
            Mode: {config.restrictiveMode ? '🔒 Restrictive (block unlisted regions)' : '🔑 Permissive (challenge unlisted regions)'} &nbsp;|&nbsp;
            Proxies: {config.blockProxies ? '🚫 Blocked' : '⚠️ Challenged'} &nbsp;|&nbsp;
            Challenge type: {config.challengeType}
          </p>
        </div>
        <button
          onClick={() => setSubTab('configuration')}
          className="ml-auto px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 whitespace-nowrap"
        >
          Configure →
        </button>
      </div>

      {/* Stats Cards */}
      {loadingStats ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Attempts (30d)" value={stats.summary.totalSince30d.toLocaleString()} icon="🔐" color="border-blue-500" />
            <StatCard label="Blocked" value={stats.summary.blocked30d.toLocaleString()} sub="Hard blocked logins" icon="🚫" color="border-red-500" />
            <StatCard label="Challenged" value={stats.summary.challenged30d.toLocaleString()} sub="Required extra verification" icon="⚠️" color="border-yellow-500" />
            <StatCard label="Allowed" value={stats.summary.allowed30d.toLocaleString()} sub="Passed all checks" icon="✅" color="border-green-500" />
            <StatCard label="Unique Countries" value={stats.summary.uniqueCountries} icon="🗺️" color="border-indigo-500" />
            <StatCard label="Top Blocked Country" value={stats.summary.topBlockedCountry} icon="🎯" color="border-orange-500" />
            <StatCard label="Proxy Attempts" value={stats.summary.proxyAttempts} sub="VPN/Proxy/Hosting IPs" icon="🕵️" color="border-purple-500" />
            <StatCard
              label="Allow Rate"
              value={stats.summary.totalSince30d > 0
                ? `${Math.round((stats.summary.allowed30d / stats.summary.totalSince30d) * 100)}%`
                : 'N/A'}
              icon="📊"
              color="border-teal-500"
            />
          </div>

          {/* Daily Activity mini-chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">14-Day Login Activity by Verdict</h3>
            <div className="overflow-x-auto">
              <div className="flex items-end gap-1 h-32 min-w-[600px]">
                {stats.dailySeries.map((day) => {
                  const total = day.blocked + day.challenged + day.allowed;
                  const maxTotal = Math.max(...stats.dailySeries.map(d => d.blocked + d.challenged + d.allowed), 1);
                  const scale = total / maxTotal;
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                      <div
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                      >
                        {day.date}<br />
                        🚫 {day.blocked} ⚠️ {day.challenged} ✅ {day.allowed}
                      </div>
                      <div className="w-full flex flex-col justify-end" style={{ height: `${scale * 100}%`, minHeight: total > 0 ? '4px' : '0' }}>
                        {day.blocked > 0 && (
                          <div
                            className="w-full bg-red-400 rounded-t-sm"
                            style={{ height: `${(day.blocked / (total || 1)) * 100}%`, minHeight: '4px' }}
                          ></div>
                        )}
                        {day.challenged > 0 && (
                          <div
                            className="w-full bg-yellow-400"
                            style={{ height: `${(day.challenged / (total || 1)) * 100}%`, minHeight: '4px' }}
                          ></div>
                        )}
                        {day.allowed > 0 && (
                          <div
                            className="w-full bg-green-400 rounded-b-sm"
                            style={{ height: `${(day.allowed / (total || 1)) * 100}%`, minHeight: '4px' }}
                          ></div>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-400 rotate-45 origin-left mt-1">{day.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span><span className="inline-block w-3 h-3 rounded bg-red-400 mr-1"></span>Blocked</span>
                <span><span className="inline-block w-3 h-3 rounded bg-yellow-400 mr-1"></span>Challenged</span>
                <span><span className="inline-block w-3 h-3 rounded bg-green-400 mr-1"></span>Allowed</span>
              </div>
            </div>
          </div>

          {/* Location stats table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">Top Countries by Attempt Volume (30d)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-600">Country</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Continent</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 text-right">Total</th>
                    <th className="px-4 py-3 font-semibold text-red-600 text-right">Blocked</th>
                    <th className="px-4 py-3 font-semibold text-yellow-600 text-right">Challenged</th>
                    <th className="px-4 py-3 font-semibold text-green-600 text-right">Allowed</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Block Rate</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.locationStats.slice(0, 20).map((row, i) => (
                    <tr key={row.countryCode} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3">
                        <span className="mr-2">{flagOf(row.countryCode)}</span>
                        <span className="font-medium">{row.country}</span>
                        <span className="ml-1 text-xs text-gray-400">{row.countryCode}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{row.continent}</td>
                      <td className="px-4 py-3 text-right font-bold">{row.totalAttempts}</td>
                      <td className="px-4 py-3 text-right text-red-600 font-semibold">{row.blocked}</td>
                      <td className="px-4 py-3 text-right text-yellow-600">{row.challenged}</td>
                      <td className="px-4 py-3 text-right text-green-600">{row.allowed}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-400 rounded-full"
                              style={{ width: `${Math.round((row.blocked / (row.totalAttempts || 1)) * 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 w-8 text-right">
                            {Math.round((row.blocked / (row.totalAttempts || 1)) * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(row.lastSeen).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top flags */}
          {stats.topFlags.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Top Risk Flags (30d)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {stats.topFlags.map((f) => (
                  <div key={f.flag} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                    <p className="text-xs font-mono text-gray-600 break-all">{f.flag}</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{f.count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500 text-center py-8">No statistics available yet.</p>
      )}

      {/* IP tester */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-3">Test IP Address</h3>
        <p className="text-sm text-gray-500 mb-4">
          Enter any IP to see how the current geofencing config would classify it.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={testIP}
            onChange={(e) => setTestIP(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTestIP()}
            placeholder="e.g. 1.2.3.4"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleTestIP}
            disabled={testingIP || !testIP.trim()}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {testingIP ? '⏳ Checking…' : 'Test'}
          </button>
        </div>

        {testResult && (
          <div className={`mt-4 p-4 rounded-xl border ${verdictColor(testResult.verdict)}`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{verdictIcon(testResult.verdict)}</span>
              <div>
                <p className="font-bold text-lg uppercase">{testResult.verdict}</p>
                <p className="text-sm">{testResult.reason}</p>
              </div>
              <span className={`ml-auto text-lg font-bold ${riskColor(testResult.riskScore)}`}>
                Risk: {testResult.riskScore}/100
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Country</p>
                <p className="font-medium">{flagOf(testResult.location.countryCode)} {testResult.location.country}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">City</p>
                <p className="font-medium">{testResult.location.city || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">ISP</p>
                <p className="font-medium truncate">{testResult.location.isp || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Proxy / Hosting</p>
                <p className="font-medium">
                  {testResult.location.isProxy ? '🔴 Proxy' : testResult.location.isHosting ? '🟡 Hosting' : '🟢 Clean'}
                </p>
              </div>
            </div>
            {testResult.flags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {testResult.flags.map((f: string) => (
                  <span key={f} className="px-2 py-0.5 bg-white bg-opacity-60 rounded text-xs font-mono border">{f}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Sub-tab: Configuration
  // ─────────────────────────────────────────────────────────────────────────

  const renderConfiguration = () => (
    <div className="space-y-6">
      {/* Master toggle */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Enable Geofencing Engine</h3>
            <p className="text-sm text-gray-500 mt-1">
              When disabled, all login attempts pass through regardless of location.
            </p>
          </div>
          <button
            onClick={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${config.enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${config.enabled ? 'translate-x-8' : 'translate-x-1'}`}></span>
          </button>
        </div>
      </div>

      {/* Behaviour modes */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
        <h3 className="font-bold text-gray-900 text-lg">Behaviour Modes</h3>

        {/* Restrictive mode */}
        <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
          <div>
            <p className="font-semibold text-gray-800">🔒 Restrictive Mode</p>
            <p className="text-sm text-gray-500 mt-1">
              When ON — logins from countries / continents NOT in the allowlists are BLOCKED.<br />
              When OFF — they receive a verification challenge instead.
            </p>
          </div>
          <button
            onClick={() => setConfig((c) => ({ ...c, restrictiveMode: !c.restrictiveMode }))}
            className={`relative inline-flex h-7 w-14 flex-shrink-0 items-center rounded-full transition-colors ${config.restrictiveMode ? 'bg-red-500' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${config.restrictiveMode ? 'translate-x-8' : 'translate-x-1'}`}></span>
          </button>
        </div>

        {/* Block proxies */}
        <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
          <div>
            <p className="font-semibold text-gray-800">🕵️ Block VPN / Proxy / Hosting IPs</p>
            <p className="text-sm text-gray-500 mt-1">
              Automatically block login attempts that originate from known VPN services,
              proxy servers, or data-centre hosting providers (detected via ip-api.com).
            </p>
          </div>
          <button
            onClick={() => setConfig((c) => ({ ...c, blockProxies: !c.blockProxies }))}
            className={`relative inline-flex h-7 w-14 flex-shrink-0 items-center rounded-full transition-colors ${config.blockProxies ? 'bg-red-500' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${config.blockProxies ? 'translate-x-8' : 'translate-x-1'}`}></span>
          </button>
        </div>
      </div>

      {/* Thresholds */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
        <h3 className="font-bold text-gray-900 text-lg">Risk Score Thresholds</h3>
        <p className="text-sm text-gray-500 -mt-4">
          The engine assigns a 0–100 risk score per login attempt based on IP reputation,
          proxy status, country, and time-of-day signals.
        </p>

        {/* Challenge threshold */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700">
              ⚠️ Challenge Threshold — score ≥ <span className="font-bold text-yellow-600">{config.challengeThreshold}</span>
            </label>
          </div>
          <input
            type="range"
            min={1}
            max={99}
            value={config.challengeThreshold}
            onChange={(e) => setConfig((c) => ({ ...c, challengeThreshold: +e.target.value }))}
            className="w-full accent-yellow-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1 (challenge everything)</span>
            <span>99 (almost never challenge)</span>
          </div>
        </div>

        {/* Block threshold */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700">
              🚫 Block Threshold — score ≥ <span className="font-bold text-red-600">{config.blockThreshold}</span>
            </label>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={config.blockThreshold}
            onChange={(e) => setConfig((c) => ({ ...c, blockThreshold: +e.target.value }))}
            className="w-full accent-red-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1 (block everything)</span>
            <span>100 (never block by score)</span>
          </div>
        </div>

        {config.challengeThreshold >= config.blockThreshold && (
          <p className="text-red-600 text-sm font-medium">
            ⚠️ Challenge threshold must be lower than block threshold.
          </p>
        )}
      </div>

      {/* Challenge type */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 text-lg mb-4">Challenge Verification Type</h3>
        <p className="text-sm text-gray-500 mb-4">
          When a login is challenged (not outright blocked), the user must pass this additional check.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['EMAIL_OTP', 'TOTP', 'ADMIN_APPROVAL'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setConfig((c) => ({ ...c, challengeType: type }))}
              className={`p-4 rounded-xl border-2 text-left transition-all ${config.challengeType === type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <p className="text-2xl mb-2">
                {type === 'EMAIL_OTP' ? '📧' : type === 'TOTP' ? '📱' : '👨‍💼'}
              </p>
              <p className="font-semibold text-gray-900">{type}</p>
              <p className="text-xs text-gray-500 mt-1">
                {type === 'EMAIL_OTP' && 'Send a one-time code to the user\'s registered email address'}
                {type === 'TOTP' && 'Require the TOTP authenticator app code (same as 2FA)'}
                {type === 'ADMIN_APPROVAL' && 'Queue the login for manual approval by an administrator'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Time-window enforcement */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-900 text-lg">Login Time Window (UTC)</h3>
        <p className="text-sm text-gray-500">
          Optionally restrict logins to certain UTC hours. Leave both fields empty to disable.
          Logins outside the window receive a risk-score penalty.
        </p>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Hour (0–23)</label>
            <input
              type="number"
              min={0}
              max={23}
              value={config.allowedStartHour ?? ''}
              onChange={(e) =>
                setConfig((c) => ({ ...c, allowedStartHour: e.target.value === '' ? null : +e.target.value }))
              }
              placeholder="e.g. 8"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Hour (0–23)</label>
            <input
              type="number"
              min={0}
              max={23}
              value={config.allowedEndHour ?? ''}
              onChange={(e) =>
                setConfig((c) => ({ ...c, allowedEndHour: e.target.value === '' ? null : +e.target.value }))
              }
              placeholder="e.g. 18"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        {(config.allowedStartHour !== null && config.allowedEndHour !== null) && (
          <p className="text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
            Logins will be allowed between <strong>{config.allowedStartHour}:00</strong> and{' '}
            <strong>{config.allowedEndHour}:00</strong> UTC.
            {(config.allowedStartHour ?? 0) > (config.allowedEndHour ?? 0) && ' (overnight window)'}
          </p>
        )}
      </div>

      {/* Change note */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-2">Change Note (optional)</label>
        <textarea
          value={config.lastModifiedNote ?? ''}
          onChange={(e) => setConfig((c) => ({ ...c, lastModifiedNote: e.target.value }))}
          rows={2}
          placeholder="Why are you changing the configuration?"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>

      {/* Save */}
      <div className="flex justify-end gap-3">
        <button
          onClick={fetchConfig}
          disabled={loadingConfig}
          className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Discard Changes
        </button>
        <button
          onClick={saveConfig}
          disabled={savingConfig || config.challengeThreshold >= config.blockThreshold}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {savingConfig ? '⏳ Saving…' : '💾 Save Configuration'}
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Sub-tab: Countries
  // ─────────────────────────────────────────────────────────────────────────

  const filteredCountries = ALL_COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase()),
  );

  const renderCountries = () => (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <p className="font-semibold">How country lists work:</p>
        <ul className="list-disc ml-5 mt-1 space-y-0.5">
          <li><strong>Allow list</strong> — Only logins from these countries pass (in restrictive mode) or get lower risk scores.</li>
          <li><strong>Block list</strong> — Logins from these countries are always hard-blocked, regardless of other settings.</li>
          <li>Both lists can be active simultaneously. The block list takes precedence.</li>
        </ul>
      </div>

      {/* List target toggle */}
      <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setCountryListTarget('allowedCountries')}
          className={`px-5 py-2 text-sm font-medium transition-colors ${countryListTarget === 'allowedCountries' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          ✅ Allow List ({config.allowedCountries.length})
        </button>
        <button
          onClick={() => setCountryListTarget('blockedCountries')}
          className={`px-5 py-2 text-sm font-medium transition-colors ${countryListTarget === 'blockedCountries' ? 'bg-red-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          🚫 Block List ({config.blockedCountries.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current list */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-bold text-gray-900">
              {countryListTarget === 'allowedCountries' ? '✅ Currently Allowed' : '🚫 Currently Blocked'}
              {' '}
              <span className="text-gray-400 font-normal text-sm">
                ({(countryListTarget === 'allowedCountries' ? config.allowedCountries : config.blockedCountries).length} countries)
              </span>
            </h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {(countryListTarget === 'allowedCountries' ? config.allowedCountries : config.blockedCountries).length === 0 ? (
              <p className="px-5 py-8 text-center text-gray-400 text-sm">
                {countryListTarget === 'allowedCountries'
                  ? 'No countries in allow list (all countries are considered)'
                  : 'No countries in block list'}
              </p>
            ) : (
              (countryListTarget === 'allowedCountries' ? config.allowedCountries : config.blockedCountries).map((code) => (
                <div key={code} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                  <span>
                    <span className="mr-2">{flagOf(code)}</span>
                    <span className="font-medium text-sm">{countryName(code)}</span>
                    <span className="ml-1.5 text-xs text-gray-400">{code}</span>
                  </span>
                  <button
                    onClick={() => removeCountry(code, countryListTarget)}
                    className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Country picker */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-bold text-gray-900 mb-2">Add Country to {countryListTarget === 'allowedCountries' ? 'Allow' : 'Block'} List</h3>
            <input
              type="text"
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              placeholder="Search by name or code…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {filteredCountries.map((country) => {
              const inAllowed = config.allowedCountries.includes(country.code);
              const inBlocked = config.blockedCountries.includes(country.code);
              const inCurrent = countryListTarget === 'allowedCountries' ? inAllowed : inBlocked;
              return (
                <div key={country.code} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
                  <span className="text-sm">
                    <span className="mr-2">{flagOf(country.code)}</span>
                    <span className="font-medium">{country.name}</span>
                    <span className="ml-1.5 text-xs text-gray-400">{country.code}</span>
                    {inAllowed && <span className="ml-2 text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">allowed</span>}
                    {inBlocked && <span className="ml-2 text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">blocked</span>}
                  </span>
                  <button
                    onClick={() => addCountry(country.code)}
                    disabled={inCurrent}
                    className="text-xs px-3 py-1 rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    {inCurrent ? 'Added' : '+ Add'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Sub-tab: Continents
  // ─────────────────────────────────────────────────────────────────────────

  const renderContinents = () => (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <p>
          <strong>Continent allow list:</strong> When empty, all continents are permitted.
          When one or more continents are selected, only logins from those continents pass
          (or get lower risk scores, depending on restrictive mode).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {CONTINENT_OPTIONS.map((c) => {
          const active = config.allowedContinents.includes(c.code);
          return (
            <button
              key={c.code}
              onClick={() => toggleContinent(c.code, !active)}
              className={`p-5 rounded-xl border-2 text-left transition-all ${active ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">{c.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${active ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {active ? '✓ Allowed' : 'Not listed'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Code: {c.code}</p>
              <p className="text-xs text-gray-500 mt-2">
                {ALL_COUNTRIES.filter(cn => cn.continent === c.code).length} countries
              </p>
            </button>
          );
        })}
      </div>

      {config.allowedContinents.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
          No continents selected — continent-level filtering is inactive. All continents are considered.
        </div>
      )}

      {config.allowedContinents.length > 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          Logins are {config.restrictiveMode ? 'hard-blocked' : 'challenged'} if originating from outside:{' '}
          <strong>{config.allowedContinents.map(code => CONTINENT_OPTIONS.find(c => c.code === code)?.name ?? code).join(', ')}</strong>.
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Sub-tab: IP Lists
  // ─────────────────────────────────────────────────────────────────────────

  const renderIPLists = () => (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <p className="font-semibold mb-1">IP / CIDR management</p>
        <ul className="list-disc ml-5 space-y-0.5">
          <li><strong>Whitelist</strong> — IPs that bypass ALL geofencing checks (e.g. your office, trusted servers).</li>
          <li><strong>Blacklist</strong> — IPs that are always hard-blocked regardless of country or score.</li>
          <li>Both single IPs (e.g. <code>203.0.113.5</code>) and CIDR ranges (e.g. <code>10.0.0.0/8</code>) are supported.</li>
        </ul>
      </div>

      {/* Add IP */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">Add IP or CIDR Range</h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={newIP}
              onChange={(e) => setNewIP(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addIP()}
              placeholder="e.g. 203.0.113.0/24 or 1.2.3.4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={ipListTarget}
            onChange={(e) => setIpListTarget(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
          >
            <option value="whitelistedIPs">→ Whitelist</option>
            <option value="blacklistedIPs">→ Blacklist</option>
          </select>
          <button
            onClick={addIP}
            disabled={!newIP.trim()}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Whitelist */}
        <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-green-200 bg-green-50 flex items-center justify-between">
            <h3 className="font-bold text-green-800">✅ Whitelist ({config.whitelistedIPs.length})</h3>
            <span className="text-xs text-green-600">Always allowed</span>
          </div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {config.whitelistedIPs.length === 0 ? (
              <p className="px-5 py-6 text-center text-gray-400 text-sm">No whitelisted IPs</p>
            ) : (
              config.whitelistedIPs.map((ip) => (
                <div key={ip} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                  <span className="font-mono text-sm text-gray-700">{ip}</span>
                  <button
                    onClick={() => removeIP(ip, 'whitelistedIPs')}
                    className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Blacklist */}
        <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-red-200 bg-red-50 flex items-center justify-between">
            <h3 className="font-bold text-red-800">🚫 Blacklist ({config.blacklistedIPs.length})</h3>
            <span className="text-xs text-red-600">Always blocked</span>
          </div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {config.blacklistedIPs.length === 0 ? (
              <p className="px-5 py-6 text-center text-gray-400 text-sm">No blacklisted IPs</p>
            ) : (
              config.blacklistedIPs.map((ip) => (
                <div key={ip} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                  <span className="font-mono text-sm text-gray-700">{ip}</span>
                  <button
                    onClick={() => removeIP(ip, 'blacklistedIPs')}
                    className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Sub-tab: Logs
  // ─────────────────────────────────────────────────────────────────────────

  const renderLogs = () => (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">Filter Logs</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Verdict</label>
            <select
              value={logVerdict}
              onChange={(e) => { setLogVerdict(e.target.value); setLogPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
            >
              <option value="">All</option>
              <option value="ALLOWED">✅ Allowed</option>
              <option value="CHALLENGED">⚠️ Challenged</option>
              <option value="BLOCKED">🚫 Blocked</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Country Code</label>
            <input
              type="text"
              value={logCountry}
              onChange={(e) => { setLogCountry(e.target.value.toUpperCase()); setLogPage(1); }}
              placeholder="e.g. CN, RU, US"
              maxLength={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Email</label>
            <input
              type="text"
              value={logEmail}
              onChange={(e) => { setLogEmail(e.target.value); setLogPage(1); }}
              placeholder="Partial email search"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Proxy/VPN</label>
            <select
              value={logProxy}
              onChange={(e) => { setLogProxy(e.target.value); setLogPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
            >
              <option value="">Any</option>
              <option value="true">Proxy/VPN IPs only</option>
              <option value="false">Clean IPs only</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex gap-3">
          <button
            onClick={() => fetchLogs(logPage)}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            🔍 Apply Filters
          </button>
          <button
            onClick={() => {
              setLogVerdict('');
              setLogCountry('');
              setLogEmail('');
              setLogProxy('');
              setLogPage(1);
              setTimeout(() => fetchLogs(1), 50);
            }}
            className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Log table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">
            Geo-Login Log
            <span className="ml-2 text-sm font-normal text-gray-400">({logPagination.total} total)</span>
          </h3>
          <button
            onClick={() => fetchLogs(logPage)}
            disabled={loadingLogs}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            {loadingLogs ? '⏳' : '↻'} Refresh
          </button>
        </div>

        {loadingLogs ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm">No log entries match your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600">Verdict</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">IP</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Location</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Email</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-center">Risk</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Proxy</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Reason</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Flags</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${verdictColor(log.verdict)}`}>
                        {verdictIcon(log.verdict)} {log.verdict}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{log.ip}</td>
                    <td className="px-4 py-3 text-xs">
                      <span>{flagOf(log.countryCode)}</span>
                      <span className="font-medium ml-1">{log.country}</span>
                      {log.city && <span className="text-gray-400">, {log.city}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[140px] truncate">{log.email || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-bold ${riskColor(log.riskScore)}`}>{log.riskScore}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.isProxy ? (
                        <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">VPN/Proxy</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate" title={log.reason}>{log.reason}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-0.5">
                        {log.flags.slice(0, 2).map((f) => (
                          <span key={f} className="text-[10px] px-1 py-0.5 bg-gray-100 text-gray-600 rounded font-mono">{f}</span>
                        ))}
                        {log.flags.length > 2 && (
                          <span className="text-[10px] text-gray-400">+{log.flags.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {logPagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {logPagination.page} of {logPagination.totalPages} — {logPagination.total} total entries
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { const p = logPage - 1; setLogPage(p); fetchLogs(p); }}
                disabled={logPage <= 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                ← Previous
              </button>
              <button
                onClick={() => { const p = logPage + 1; setLogPage(p); fetchLogs(p); }}
                disabled={logPage >= logPagination.totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Root render
  // ─────────────────────────────────────────────────────────────────────────

  const tabs: Array<{ key: SubTab; label: string; icon: string }> = [
    { key: 'overview', label: 'Overview', icon: '🌐' },
    { key: 'configuration', label: 'Configuration', icon: '⚙️' },
    { key: 'countries', label: 'Countries', icon: '🗺️' },
    { key: 'continents', label: 'Continents', icon: '🌍' },
    { key: 'ip-lists', label: 'IP Lists', icon: '📋' },
    { key: 'logs', label: 'Login Logs', icon: '📜' },
  ];

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-sm text-gray-500">Loading geofencing configuration…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white text-2xl flex-shrink-0">
            🌐
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Geofencing / Geo-restriction Engine</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Define trusted login regions, detect suspicious geographic access, and block or challenge
              login attempts from outside allowed zones.
            </p>
          </div>
          <div className="ml-auto flex-shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${config.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              <span className={`w-2 h-2 rounded-full ${config.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
              {config.enabled ? 'Active' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex overflow-x-auto border-b border-gray-200 bg-white">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              subTab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
            {t.key === 'countries' && (config.allowedCountries.length + config.blockedCountries.length) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                {config.allowedCountries.length + config.blockedCountries.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {subTab === 'overview' && renderOverview()}
        {subTab === 'configuration' && renderConfiguration()}
        {subTab === 'countries' && renderCountries()}
        {subTab === 'continents' && renderContinents()}
        {subTab === 'ip-lists' && renderIPLists()}
        {subTab === 'logs' && renderLogs()}
      </div>
    </div>
  );
}
