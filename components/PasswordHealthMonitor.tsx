'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToastAPI {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info?: (msg: string) => void;
}

interface StrengthResult {
  score: number;
  label: 'very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong';
  length: number;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
  isCommonPattern: boolean;
  isDictionaryWord: boolean;
  entropy: number;
}

interface BreachResult {
  isBreached: boolean;
  breachCount: number;
  checkedAt: string;
  source: string;
}

interface CheckAssessment {
  strength: StrengthResult;
  breach: BreachResult;
  reuse: { isReused: boolean; affectedAccounts: number };
  overallRisk: 'critical' | 'high' | 'medium' | 'low' | 'none';
  overallRiskScore: number;
  daysSincePasswordChange: number | null;
  issues: string[];
  recommendations: string[];
}

interface UserRecord {
  userId: string;
  email: string;
  strength: string;
  strengthScore: number;
  overallRisk: string;
  overallRiskScore: number;
  isBreached: boolean | null;
  breachCount: number;
  isReused: boolean;
  reuseCount: number;
  daysSincePasswordChange: number | null;
  lastScannedAt: string;
  issues: string[];
  recommendations: string[];
  passwordLength: number;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
  isCommonPattern: boolean;
  isDictionaryWord: boolean;
}

interface PlatformReport {
  generatedAt: string;
  totalUsersWithPasswords: number;
  totalUsersScanned: number;
  strengthDistribution: Record<string, number>;
  riskDistribution: Record<string, number>;
  breachedAccounts: number;
  reusedPasswords: number;
  averageStrengthScore: number;
  averageRiskScore: number;
  topIssues: Array<{ issue: string; affectedAccounts: number }>;
  recommendations: string[];
  stalePaswords: number;
  criticalAccounts: Array<{
    email: string;
    userId: string;
    overallRisk: string;
    overallRiskScore: number;
    issues: string[];
    daysSincePasswordChange: number | null;
  }>;
}

interface ScanStats {
  totalScanned: number;
  breachedCount: number;
  reusedCount: number;
  criticalCount: number;
  highRiskCount: number;
  averageStrengthScore: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-blue-400',
  none: 'text-green-400',
};

const RISK_BG: Record<string, string> = {
  critical: 'bg-red-500/20 border-red-500/40',
  high: 'bg-orange-500/20 border-orange-500/40',
  medium: 'bg-yellow-500/20 border-yellow-500/40',
  low: 'bg-blue-500/20 border-blue-500/40',
  none: 'bg-green-500/20 border-green-500/40',
};

const STRENGTH_COLORS: Record<string, string> = {
  very_weak: '#ef4444',
  weak: '#f97316',
  fair: '#eab308',
  strong: '#22c55e',
  very_strong: '#10b981',
};

const STRENGTH_LABELS: Record<string, string> = {
  very_weak: 'Very Weak',
  weak: 'Weak',
  fair: 'Fair',
  strong: 'Strong',
  very_strong: 'Very Strong',
};

function RiskBadge({ risk }: { risk: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${RISK_BG[risk] || 'bg-gray-700 border-gray-600'} ${RISK_COLORS[risk] || 'text-gray-300'}`}>
      {risk?.toUpperCase()}
    </span>
  );
}

function StrengthBar({ score, label }: { score: number; label: string }) {
  const color = STRENGTH_COLORS[label] || '#6b7280';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>Strength</span>
        <span style={{ color }}>{STRENGTH_LABELS[label] || label} ({score}/100)</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  color = 'text-white',
  icon,
}: {
  title: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: string;
}) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-gray-400 text-sm">{title}</p>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function CheckmarkRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={ok ? 'text-green-400' : 'text-red-400'}>{ok ? '✓' : '✗'}</span>
      <span className={ok ? 'text-gray-300' : 'text-gray-400'}>{label}</span>
    </div>
  );
}

// ─── Sub-tab: Overview ────────────────────────────────────────────────────────

function OverviewTab({
  stats,
  report,
  onRunScan,
  scanning,
}: {
  stats: ScanStats | null;
  report: PlatformReport | null;
  onRunScan: () => void;
  scanning: boolean;
}) {
  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-400">
        <span className="text-4xl">🔒</span>
        <p>No password health data yet.</p>
        <p className="text-sm text-gray-500">Users must submit their password to the health checker to generate data.</p>
      </div>
    );
  }

  const totalRisk = (report?.riskDistribution.critical || 0) +
    (report?.riskDistribution.high || 0) +
    (report?.riskDistribution.medium || 0) +
    (report?.riskDistribution.low || 0) +
    (report?.riskDistribution.none || 0);

  const riskBars = [
    { key: 'critical', label: 'Critical', color: '#ef4444' },
    { key: 'high', label: 'High', color: '#f97316' },
    { key: 'medium', label: 'Medium', color: '#eab308' },
    { key: 'low', label: 'Low', color: '#3b82f6' },
    { key: 'none', label: 'None', color: '#22c55e' },
  ];

  const overallHealthScore = report
    ? Math.max(0, Math.round(100 - (report.averageRiskScore)))
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Platform Password Health</h3>
        <button
          onClick={onRunScan}
          disabled={scanning}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {scanning ? (
            <>
              <span className="animate-spin">⟳</span> Scanning...
            </>
          ) : (
            <>⟳ Run Platform Scan</>
          )}
        </button>
      </div>

      {/* Platform health score */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-1">Overall Platform Health Score</p>
            <div className="flex items-end gap-3">
              <span className={`text-5xl font-bold ${
                overallHealthScore >= 75 ? 'text-green-400' :
                overallHealthScore >= 50 ? 'text-yellow-400' :
                overallHealthScore >= 25 ? 'text-orange-400' : 'text-red-400'
              }`}>{overallHealthScore}</span>
              <span className="text-gray-500 text-xl mb-1">/100</span>
            </div>
            <p className="text-gray-500 text-xs mt-1">
              {report?.totalUsersScanned ?? 0} of {report?.totalUsersWithPasswords ?? '—'} accounts scanned
            </p>
          </div>
          <div className="w-24 h-24 relative flex items-center justify-center">
            <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#374151" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke={overallHealthScore >= 75 ? '#22c55e' : overallHealthScore >= 50 ? '#eab308' : overallHealthScore >= 25 ? '#f97316' : '#ef4444'}
                strokeWidth="3"
                strokeDasharray={`${overallHealthScore} ${100 - overallHealthScore}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-sm font-bold text-white">{overallHealthScore}%</span>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Scanned" value={stats.totalScanned} icon="🔍" />
        <StatCard title="Breached" value={stats.breachedCount} color={stats.breachedCount > 0 ? 'text-red-400' : 'text-green-400'} icon="💥" />
        <StatCard title="Reused" value={stats.reusedCount} color={stats.reusedCount > 0 ? 'text-orange-400' : 'text-green-400'} icon="🔄" />
        <StatCard title="Critical" value={stats.criticalCount} color={stats.criticalCount > 0 ? 'text-red-400' : 'text-green-400'} icon="🚨" />
        <StatCard title="High Risk" value={stats.highRiskCount} color={stats.highRiskCount > 0 ? 'text-orange-400' : 'text-green-400'} icon="⚠️" />
        <StatCard title="Avg Score" value={`${stats.averageStrengthScore}/100`} icon="📊" />
      </div>

      {/* Risk distribution bar */}
      {report && totalRisk > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Risk Distribution</h4>
          <div className="flex h-6 rounded-full overflow-hidden gap-0.5">
            {riskBars.map(({ key, color }) => {
              const count = report.riskDistribution[key] || 0;
              const pct = totalRisk > 0 ? (count / totalRisk) * 100 : 0;
              return pct > 0 ? (
                <div
                  key={key}
                  style={{ width: `${pct}%`, backgroundColor: color }}
                  title={`${key}: ${count} (${Math.round(pct)}%)`}
                  className="cursor-default transition-all"
                />
              ) : null;
            })}
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            {riskBars.map(({ key, label, color }) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                {label}: {report.riskDistribution[key] || 0}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strength distribution */}
      {report && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Strength Distribution</h4>
          <div className="space-y-2">
            {[
              { key: 'very_weak', label: 'Very Weak', color: '#ef4444' },
              { key: 'weak', label: 'Weak', color: '#f97316' },
              { key: 'fair', label: 'Fair', color: '#eab308' },
              { key: 'strong', label: 'Strong', color: '#22c55e' },
              { key: 'very_strong', label: 'Very Strong', color: '#10b981' },
            ].map(({ key, label, color }) => {
              const count = report.strengthDistribution[key] || 0;
              const pct = report.totalUsersScanned > 0 ? (count / report.totalUsersScanned) * 100 : 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-20 shrink-0">{label}</span>
                  <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {report && report.recommendations.length > 0 && (
        <div className="bg-blue-900/20 border border-blue-700/40 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
            <span>💡</span> Platform Recommendations
          </h4>
          <ul className="space-y-2">
            {report.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-blue-400 shrink-0 mt-0.5">→</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top Issues */}
      {report && report.topIssues.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Top Reported Issues</h4>
          <div className="space-y-2">
            {report.topIssues.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-400 flex-1">{item.issue}</span>
                <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/30 shrink-0">
                  {item.affectedAccounts} accounts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-tab: My Password Check ───────────────────────────────────────────────

function MyPasswordTab({ toast }: { toast: ToastAPI }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckAssessment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCheck = useCallback(async () => {
    if (!password) return;
    setChecking(true);
    try {
      const res = await fetch('/api/password-health/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.assessment);
        toast.success('Password health check complete');
      } else {
        toast.error(data.message || 'Check failed');
      }
    } catch {
      toast.error('Network error during health check');
    } finally {
      setChecking(false);
    }
  }, [password, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCheck();
  };

  const clearCheck = () => {
    setPassword('');
    setResult(null);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">Check My Password Health</h3>
        <p className="text-gray-400 text-sm">
          Your password is never sent as-is. Only cryptographic hashes are used for checking — the plaintext stays in your browser until submitted, then is immediately discarded.
        </p>
      </div>

      {/* Password input */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Enter Your Password to Analyse</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your current password…"
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 pr-12 font-mono"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <button
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm"
                type="button"
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
            <button
              onClick={handleCheck}
              disabled={!password || checking}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
            >
              {checking ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin inline-block">⟳</span> Checking…
                </span>
              ) : 'Analyse'}
            </button>
          </div>
        </div>

        {/* Live mini-preview while typing */}
        {password.length >= 1 && (
          <div className="space-y-2">
            <div className="flex gap-1.5">
              {[
                { ok: password.length >= 8, label: '8+ chars' },
                { ok: /[A-Z]/.test(password), label: 'Uppercase' },
                { ok: /[a-z]/.test(password), label: 'Lowercase' },
                { ok: /[0-9]/.test(password), label: 'Numbers' },
                { ok: /[^a-zA-Z0-9]/.test(password), label: 'Special' },
              ].map(({ ok, label }) => (
                <span
                  key={label}
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    ok ? 'border-green-500/40 bg-green-500/10 text-green-400' : 'border-gray-600 bg-gray-700 text-gray-500'
                  }`}
                >
                  {ok ? '✓' : '✗'} {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Overall risk */}
          <div className={`rounded-xl border p-5 ${RISK_BG[result.overallRisk]}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Overall Password Risk</p>
                <div className="flex items-center gap-3">
                  <span className={`text-3xl font-bold ${RISK_COLORS[result.overallRisk]}`}>
                    {result.overallRisk.charAt(0).toUpperCase() + result.overallRisk.slice(1)}
                  </span>
                  <RiskBadge risk={result.overallRisk} />
                </div>
                <p className="text-gray-500 text-xs mt-1">Risk Score: {result.overallRiskScore}/100</p>
              </div>
              <span className="text-5xl">
                {result.overallRisk === 'critical' ? '🚨' :
                 result.overallRisk === 'high' ? '⚠️' :
                 result.overallRisk === 'medium' ? '⚡' :
                 result.overallRisk === 'low' ? '🔵' : '✅'}
              </span>
            </div>
          </div>

          {/* Strength details */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 space-y-4">
            <h4 className="font-semibold text-white text-sm">Strength Analysis</h4>
            <StrengthBar score={result.strength.score} label={result.strength.label} />
            <div className="grid grid-cols-2 gap-2 mt-3">
              <CheckmarkRow ok={result.strength.hasUppercase} label="Has uppercase (A-Z)" />
              <CheckmarkRow ok={result.strength.hasLowercase} label="Has lowercase (a-z)" />
              <CheckmarkRow ok={result.strength.hasNumbers} label="Has numbers (0-9)" />
              <CheckmarkRow ok={result.strength.hasSpecialChars} label="Has special chars" />
              <CheckmarkRow ok={result.strength.length >= 8} label={`Length ≥ 8 (got ${result.strength.length})`} />
              <CheckmarkRow ok={result.strength.length >= 12} label="Length ≥ 12 (strong)" />
              <CheckmarkRow ok={!result.strength.isCommonPattern} label="No common patterns" />
              <CheckmarkRow ok={!result.strength.isDictionaryWord} label="Not a dictionary word" />
            </div>
            <p className="text-xs text-gray-500">
              Entropy: {result.strength.entropy} bits
              {result.daysSincePasswordChange !== null &&
                ` · Changed ${result.daysSincePasswordChange} days ago`}
            </p>
          </div>

          {/* Breach status */}
          <div className={`rounded-xl border p-5 ${
            result.breach.isBreached
              ? 'bg-red-900/20 border-red-500/40'
              : 'bg-green-900/20 border-green-500/40'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{result.breach.isBreached ? '💥' : '✅'}</span>
              <div>
                <p className={`font-semibold ${result.breach.isBreached ? 'text-red-300' : 'text-green-300'}`}>
                  {result.breach.isBreached
                    ? `Breached: Found in ${result.breach.breachCount.toLocaleString()} data leak records`
                    : 'Not found in any known breach database'}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  Source: HaveIBeenPwned · Checked: {new Date(result.breach.checkedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Reuse status */}
          <div className={`rounded-xl border p-5 ${
            result.reuse.isReused
              ? 'bg-orange-900/20 border-orange-500/40'
              : 'bg-green-900/20 border-green-500/40'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{result.reuse.isReused ? '🔄' : '✅'}</span>
              <div>
                <p className={`font-semibold ${result.reuse.isReused ? 'text-orange-300' : 'text-green-300'}`}>
                  {result.reuse.isReused
                    ? `Reused: ${result.reuse.affectedAccounts} account(s) share this password`
                    : 'Unique: This password is not shared with other accounts'}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">Checked by hashed comparison only — no plaintext stored</p>
              </div>
            </div>
          </div>

          {/* Issues */}
          {result.issues.length > 0 && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
              <h4 className="text-sm font-semibold text-red-400 mb-3">Issues Found</h4>
              <ul className="space-y-2">
                {result.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-red-400 shrink-0 mt-0.5">✗</span> {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="bg-blue-900/10 border border-blue-700/30 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-blue-300 mb-3">Recommendations</h4>
              <ul className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-blue-400 shrink-0 mt-0.5">→</span> {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={clearCheck}
            className="text-sm text-gray-400 hover:text-white underline"
          >
            Clear and check another password
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-tab: Risk Report (admin) ─────────────────────────────────────────────

function RiskReportTab({ toast }: { toast: ToastAPI }) {
  const [records, setRecords] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [riskFilter, setRiskFilter] = useState('');
  const [showBreachedOnly, setShowBreachedOnly] = useState(false);
  const [showReusedOnly, setShowReusedOnly] = useState(false);
  const [sort, setSort] = useState('risk');

  const fetchRecords = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: '25',
        sort,
        ...(riskFilter ? { risk: riskFilter } : {}),
        ...(showBreachedOnly ? { breached: 'true' } : {}),
        ...(showReusedOnly ? { reused: 'true' } : {}),
      });
      const res = await fetch(`/api/password-health/report?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        setRecords(data.users.records);
        setTotalPages(data.users.totalPages);
        setTotalCount(data.users.totalCount);
        setPage(p);
      } else {
        toast.error(data.message || 'Failed to load report');
      }
    } catch {
      toast.error('Network error loading report');
    } finally {
      setLoading(false);
    }
  }, [riskFilter, showBreachedOnly, showReusedOnly, sort, toast]);

  useEffect(() => { fetchRecords(1); }, [fetchRecords]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-semibold text-white">Per-Account Risk Report</h3>
        <span className="text-xs text-gray-500 bg-gray-800 border border-gray-700 rounded-full px-3 py-0.5">
          {totalCount} records
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="bg-gray-800 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Risk Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="none">None</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-gray-800 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
        >
          <option value="risk">Sort: Highest Risk</option>
          <option value="strength">Sort: Weakest Password</option>
          <option value="lastScanned">Sort: Last Scanned</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showBreachedOnly}
            onChange={(e) => setShowBreachedOnly(e.target.checked)}
            className="accent-red-500"
          />
          Breached only
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showReusedOnly}
            onChange={(e) => setShowReusedOnly(e.target.checked)}
            className="accent-orange-500"
          />
          Reused only
        </label>
        <button
          onClick={() => fetchRecords(1)}
          className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm px-3 py-2 rounded-lg"
        >
          Apply
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12 text-gray-400">
          <span className="animate-spin text-2xl mr-3">⟳</span> Loading…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-700">
          <table className="w-full text-sm text-gray-300">
            <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Account</th>
                <th className="px-4 py-3 text-left">Risk</th>
                <th className="px-4 py-3 text-left">Strength</th>
                <th className="px-4 py-3 text-center">Breached</th>
                <th className="px-4 py-3 text-center">Reused</th>
                <th className="px-4 py-3 text-left">Age (days)</th>
                <th className="px-4 py-3 text-left">Last Scan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {records.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-500">No records match the current filters.</td>
                </tr>
              )}
              {records.map((r) => (
                <tr key={r.userId} className="hover:bg-gray-800/60 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <span className="text-white font-medium">{r.email}</span>
                      {r.issues.length > 0 && (
                        <p className="text-xs text-gray-500 truncate max-w-xs" title={r.issues.join('; ')}>
                          {r.issues[0]}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <RiskBadge risk={r.overallRisk} />
                      <span className="text-gray-500 text-xs">{r.overallRiskScore}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-32">
                      <StrengthBar score={r.strengthScore} label={r.strength} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.isBreached === null
                      ? <span className="text-gray-500 text-xs">N/A</span>
                      : r.isBreached
                      ? <span className="text-red-400 text-xs font-semibold">YES ({r.breachCount.toLocaleString()})</span>
                      : <span className="text-green-400 text-xs">No</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.isReused
                      ? <span className="text-orange-400 text-xs font-semibold">YES ({r.reuseCount})</span>
                      : <span className="text-green-400 text-xs">No</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {r.daysSincePasswordChange !== null
                      ? <span className={r.daysSincePasswordChange > 90 ? 'text-yellow-400' : ''}>
                          {r.daysSincePasswordChange}d
                        </span>
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {r.lastScannedAt ? new Date(r.lastScannedAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => fetchRecords(page - 1)}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-lg"
            >
              ← Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => fetchRecords(page + 1)}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-lg"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-tab: Recommendations ─────────────────────────────────────────────────

function RecommendationsTab({ report, stats }: { report: PlatformReport | null; stats: ScanStats | null }) {
  const cards = [];

  if (stats && stats.breachedCount > 0) {
    cards.push({
      icon: '💥',
      severity: 'critical',
      title: `${stats.breachedCount} Account(s) Have Breached Passwords`,
      detail: 'These passwords have appeared in data breach databases. Affected users should change their passwords immediately.',
      action: 'Force mandatory password reset for breached accounts',
      color: 'border-red-500/40 bg-red-500/10',
      textColor: 'text-red-300',
    });
  }
  if (stats && stats.reusedCount > 0) {
    cards.push({
      icon: '🔄',
      severity: 'high',
      title: `${stats.reusedCount} Account(s) Share Passwords`,
      detail: 'Multiple accounts using the same password creates a single point of failure. One compromise exposes all.',
      action: 'Send password-change reminders to affected users',
      color: 'border-orange-500/40 bg-orange-500/10',
      textColor: 'text-orange-300',
    });
  }
  if (stats && stats.criticalCount > 0) {
    cards.push({
      icon: '🚨',
      severity: 'critical',
      title: `${stats.criticalCount} Account(s) at Critical Risk`,
      detail: 'These accounts have a combination of extreme weakness, known breaches, or other risk factors.',
      action: 'Review critical accounts and enforce immediate password change',
      color: 'border-red-500/40 bg-red-500/10',
      textColor: 'text-red-300',
    });
  }
  if (report && report.stalePaswords > 0) {
    cards.push({
      icon: '⏰',
      severity: 'medium',
      title: `${report.stalePaswords} Account(s) Have Stale Passwords`,
      detail: 'Passwords not changed in over 90 days. Stale credentials increase risk from undetected credential theft.',
      action: 'Implement a 90-day password rotation policy',
      color: 'border-yellow-500/40 bg-yellow-500/10',
      textColor: 'text-yellow-300',
    });
  }
  if (report && report.averageStrengthScore < 60) {
    cards.push({
      icon: '🔑',
      severity: 'high',
      title: 'Platform Average Password Strength is Low',
      detail: `Average strength score: ${report.averageStrengthScore}/100. Enforcing minimum strength requirements will significantly reduce risk.`,
      action: 'Add server-side minimum length (12 chars) and complexity requirements',
      color: 'border-orange-500/40 bg-orange-500/10',
      textColor: 'text-orange-300',
    });
  }
  if (cards.length === 0) {
    cards.push({
      icon: '✅',
      severity: 'none',
      title: 'Password Security Looks Good',
      detail: 'No critical issues detected. Continue running periodic scans to stay on top of new breaches.',
      action: 'Schedule regular automated scans',
      color: 'border-green-500/40 bg-green-500/10',
      textColor: 'text-green-300',
    });
  }

  // General best practices
  const bestPractices = [
    { icon: '🔒', text: 'Enforce a minimum password length of 12+ characters' },
    { icon: '🎲', text: 'Require at least 3 of 4 character classes: uppercase, lowercase, numbers, symbols' },
    { icon: '🚫', text: 'Block the top-1000 most common passwords at signup and password change' },
    { icon: '🔔', text: 'Notify users when their credentials appear in a new breach database' },
    { icon: '🔐', text: 'Enforce multi-factor authentication for all accounts' },
    { icon: '📋', text: 'Encourage users to use a trusted password manager' },
    { icon: '⏱', text: 'Implement session expiry to limit credential theft windows' },
    { icon: '📊', text: 'Run automated HIBP checks after major public data breach events' },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">Security Recommendations</h3>

      {/* Actionable alerts */}
      <div className="space-y-4">
        {cards.map((c, i) => (
          <div key={i} className={`rounded-xl border p-5 ${c.color}`}>
            <div className="flex items-start gap-4">
              <span className="text-3xl shrink-0">{c.icon}</span>
              <div className="flex-1">
                <p className={`font-semibold mb-1 ${c.textColor}`}>{c.title}</p>
                <p className="text-gray-300 text-sm mb-2">{c.detail}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="font-medium text-gray-300">Suggested action:</span> {c.action}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Best practices */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h4 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <span>📚</span> Password Security Best Practices
        </h4>
        <div className="grid md:grid-cols-2 gap-3">
          {bestPractices.map((bp, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-gray-400">
              <span className="shrink-0 mt-0.5">{bp.icon}</span>
              <span>{bp.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-tab: Scan Control ────────────────────────────────────────────────────

function ScanControlTab({ toast }: { toast: ToastAPI }) {
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<any>(null);
  const [stats, setStats] = useState<ScanStats | null>(null);

  const fetchScanInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/password-health/scan', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setLastScan(data.lastScanAt);
      }
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => { fetchScanInfo(); }, [fetchScanInfo]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/password-health/scan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Scan completed');
        setLastScan(new Date().toISOString());
        if (data.stats) setStats(data.stats);
      } else {
        toast.error(data.message || 'Scan failed');
      }
    } catch {
      toast.error('Failed to run scan');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">Platform Scan Control</h3>
        <p className="text-gray-400 text-sm">
          Run a full platform-wide password health rescan. This operation re-evaluates password
          reuse flags and stale password counters for all users. Admin-only.
        </p>
      </div>

      {/* Last scan info */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Last Scan</p>
            <p className="text-white font-mono text-sm mt-0.5">
              {lastScan ? new Date(lastScan).toLocaleString() : 'No scan recorded yet'}
            </p>
          </div>
          <button
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
          >
            {scanning ? (
              <><span className="animate-spin">⟳</span> Running…</>
            ) : (
              <>⟳ Run Full Scan</>
            )}
          </button>
        </div>
      </div>

      {/* Current stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard title="Total Scanned" value={stats.totalScanned} icon="🔍" />
          <StatCard title="Breached" value={stats.breachedCount} color={stats.breachedCount > 0 ? 'text-red-400' : 'text-green-400'} icon="💥" />
          <StatCard title="Reused" value={stats.reusedCount} color={stats.reusedCount > 0 ? 'text-orange-400' : 'text-green-400'} icon="🔄" />
          <StatCard title="Critical Risk" value={stats.criticalCount} color={stats.criticalCount > 0 ? 'text-red-400' : 'text-green-400'} icon="🚨" />
          <StatCard title="High Risk" value={stats.highRiskCount} color={stats.highRiskCount > 0 ? 'text-orange-400' : 'text-green-400'} icon="⚠️" />
          <StatCard title="Avg Strength" value={`${stats.averageStrengthScore}/100`} icon="📊" />
        </div>
      )}

      {/* Info about HIBP */}
      <div className="bg-blue-900/10 border border-blue-700/30 rounded-xl p-5 space-y-2 text-sm text-gray-400">
        <h4 className="font-semibold text-blue-300">About HIBP Breach Checks</h4>
        <p>
          HaveIBeenPwned breach checks require access to the user's plaintext password at submission time.
          Since passwords are stored as one-way bcrypt hashes, bulk HIBP checks are not possible from the server side.
        </p>
        <p>
          HIBP checks run automatically when a user submits their password via the <strong className="text-gray-300">My Password</strong> tab.
          This ensures maximum security: the plaintext is never persisted.
        </p>
        <p>
          This platform scan (reuse + stale detection) uses only the stored SHA-256 hashes for comparison.
        </p>
      </div>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

interface PasswordHealthMonitorProps {
  toast: ToastAPI;
}

type ActiveSubTab = 'overview' | 'my-password' | 'risk-report' | 'recommendations' | 'scan';

export default function PasswordHealthMonitor({ toast }: PasswordHealthMonitorProps) {
  const [activeSubTab, setActiveSubTab] = useState<ActiveSubTab>('overview');
  const [stats, setStats] = useState<ScanStats | null>(null);
  const [report, setReport] = useState<PlatformReport | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [scanning, setScanning] = useState(false);

  const fetchOverviewData = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const [scanRes, reportRes] = await Promise.all([
        fetch('/api/password-health/scan', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
        fetch('/api/password-health/report?limit=1', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
      ]);

      const scanData = await scanRes.json().catch(() => ({}));
      const reportData = await reportRes.json().catch(() => ({}));

      if (scanData.success) setStats(scanData.stats);
      if (reportData.success) setReport(reportData.report);
    } catch {
      // non-fatal — overview may just show empty state
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  const handleRunScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/password-health/scan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Scan completed');
        if (data.stats) setStats(data.stats);
        fetchOverviewData();
      } else {
        toast.error(data.message || 'Scan failed');
      }
    } catch {
      toast.error('Failed to run scan');
    } finally {
      setScanning(false);
    }
  };

  const subTabs: Array<{ key: ActiveSubTab; label: string; icon: string }> = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'my-password', label: 'My Password', icon: '🔐' },
    { key: 'risk-report', label: 'Risk Report', icon: '📋' },
    { key: 'recommendations', label: 'Recommendations', icon: '💡' },
    { key: 'scan', label: 'Scan Control', icon: '⟳' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-purple-600/20 rounded-xl border border-purple-500/30">
          <span className="text-2xl">🔒</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Password Health Monitor</h2>
          <p className="text-gray-400 text-sm">Detect weak, breached, and reused passwords across the platform</p>
        </div>
        {loadingOverview && (
          <span className="ml-auto text-gray-500 text-sm flex items-center gap-1">
            <span className="animate-spin">⟳</span> Loading…
          </span>
        )}
      </div>

      {/* Sub-tab navigation */}
      <div className="flex gap-1 bg-gray-800/60 border border-gray-700 p-1 rounded-xl overflow-x-auto">
        {subTabs.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveSubTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeSubTab === key
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/60'
            }`}
          >
            <span>{icon}</span> {label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      <div>
        {activeSubTab === 'overview' && (
          <OverviewTab stats={stats} report={report} onRunScan={handleRunScan} scanning={scanning} />
        )}
        {activeSubTab === 'my-password' && <MyPasswordTab toast={toast} />}
        {activeSubTab === 'risk-report' && <RiskReportTab toast={toast} />}
        {activeSubTab === 'recommendations' && <RecommendationsTab report={report} stats={stats} />}
        {activeSubTab === 'scan' && <ScanControlTab toast={toast} />}
      </div>
    </div>
  );
}
