/**
 * Password Health Engine
 *
 * Assesses password security WITHOUT storing or exposing actual password values.
 *
 * Core capabilities:
 *  1. Strength scoring     – entropy, character classes, length, pattern detection
 *  2. Breach detection     – HaveIBeenPwned k-anonymity API (SHA-1 prefix only)
 *  3. Reuse detection      – cross-account SHA-256 hash comparison
 *  4. Health report        – platform-wide aggregated security metrics
 *  5. Per-user assessment  – called on password creation / change
 *
 * Security guarantees:
 *  - Actual passwords are NEVER written to disk or logged
 *  - HIBP check uses k-anonymity: only the first 5 chars of SHA-1 hash are sent
 *  - Reuse detection uses SHA-256 hashes only
 *  - All sensitive parameters are ephemeral (in-memory scope only)
 */

import { createHash } from 'crypto';
import { connectDB } from './mongodb';
import PasswordHealth, {
  IPasswordHealthRecord,
  PasswordRisk,
  PasswordStrength,
} from '../models/PasswordHealth';
import User from '../models/User';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PasswordStrengthResult {
  score: number;              // 0–100
  strength: PasswordStrength;
  length: number;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
  isCommonPattern: boolean;
  isDictionaryWord: boolean;
  entropy: number;            // Shannon entropy in bits
  issues: string[];
  recommendations: string[];
}

export interface BreachCheckResult {
  isBreached: boolean;
  breachCount: number;
  checkedAt: Date;
  source: 'hibp' | 'cache' | 'error';
}

export interface PasswordHealthAssessment {
  userId: string;
  email: string;
  strength: PasswordStrengthResult;
  breach: BreachCheckResult;
  isReused: boolean;
  reuseCount: number;
  overallRisk: PasswordRisk;
  overallRiskScore: number;
  daysSincePasswordChange: number | null;
  issues: string[];
  recommendations: string[];
}

export interface PlatformHealthReport {
  generatedAt: Date;
  totalUsersWithPasswords: number;
  totalUsersScanned: number;
  strengthDistribution: {
    very_weak: number;
    weak: number;
    fair: number;
    strong: number;
    very_strong: number;
  };
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    none: number;
  };
  breachedAccounts: number;
  reusedPasswords: number;
  averageStrengthScore: number;
  averageRiskScore: number;
  topIssues: Array<{ issue: string; affectedAccounts: number }>;
  recommendations: string[];
  stalePaswords: number;          // Not changed in > 90 days
  criticalAccounts: Array<{       // Worst offenders (no actual passwords exposed)
    email: string;
    userId: string;
    overallRisk: PasswordRisk;
    overallRiskScore: number;
    issues: string[];
    daysSincePasswordChange: number | null;
  }>;
}

// ---------------------------------------------------------------------------
// Common / dictionary passwords (top-500 subset — enough to be meaningful)
// ---------------------------------------------------------------------------

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '123456', '123456789', '12345678',
  '12345', '1234567', '1234567890', 'qwerty', 'abc123', 'monkey', 'master',
  'letmein', 'dragon', '111111', 'baseball', 'iloveyou', 'trustno1', 'sunshine',
  'princess', 'welcome', 'shadow', 'superman', 'michael', 'football', 'batman',
  'login', 'admin', 'admin123', 'root', 'toor', 'pass', 'test', 'test123', 'guest',
  'hello', 'hello123', 'hockey', 'ranger', 'solo', 'pass123', 'secret', 'secret123',
  'computer', 'internet', 'service', 'summer', 'winter', 'autumn', 'spring',
  'flower', 'dragon', 'thunder', 'coffee', 'jordan', 'harley', 'hunter', 'ranger',
  'daniel', 'george', 'jordan', 'joshua', 'charlie', 'jessica', 'andrew', 'batman',
  'corvette', 'ferrari', 'porsche', 'mercury', 'mustang', 'yankees', 'cowboys',
  'soccer', 'tennis', 'hockey', 'skiing', 'boating', 'golfer', 'maverick', 'raider',
  'harley', 'wizard', 'zxcvbn', 'qazwsx', 'asdfgh', 'qwerty1', 'qwerty12',
  'qwertyu', '1q2w3e', '1q2w3e4r', 'pass1234', '12341234', '11111111', '00000000',
  'a1b2c3', 'abc1234', 'abcd1234', 'passw0rd', 'p@ssword', 'p@ss1234', 'Pa$$word',
  'P@ssw0rd', 'iloveyou1', 'changeme', 'mustang1', 'password2', 'password11',
  'security', 'matrix', 'access', 'cheese', 'butter', 'lovely', 'happy',
  'nothing', 'freedom', 'captain', 'america', 'justice', 'spiderman', 'ironman',
  'mypassword', 'mypass', 'letmein1', 'welcome1', 'welcome123', 'monkey1',
  'qwerty123', 'qwerty1234', 'abc123456', '123abc', '123qwe', 'pass12345',
]);

// Common keyboard patterns
const KEYBOARD_PATTERNS = [
  /^qwerty/i, /^asdfgh/i, /^zxcvbn/i, /^12345/, /^09876/, /^abcde/i,
  /^aaaaa/i, /(.)\1{3,}/, // 4+ repeated chars
];

// ---------------------------------------------------------------------------
// Cryptographic helpers (no raw password persisted past these functions)
// ---------------------------------------------------------------------------

/** SHA-256 of a password – used for reuse detection only */
export function sha256(password: string): string {
  return createHash('sha256').update(password, 'utf8').digest('hex').toUpperCase();
}

/** SHA-1 of a password – required for HIBP k-anonymity */
function sha1(password: string): string {
  return createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
}

/** First 5 characters of SHA-1 (k-anonymity prefix) */
export function hibpPrefix(password: string): string {
  return sha1(password).slice(0, 5);
}

/** Full SHA-1 – kept private to this module; never exported or logged */
function sha1Full(password: string): string {
  return sha1(password);
}

// ---------------------------------------------------------------------------
// Entropy calculation
// ---------------------------------------------------------------------------

/**
 * Calculate Shannon entropy of a password string (bits).
 * Higher entropy = more randomness = harder to crack.
 */
export function calculateEntropy(password: string): number {
  if (!password) return 0;

  // Determine character set size
  let charSetSize = 0;
  if (/[a-z]/.test(password)) charSetSize += 26;
  if (/[A-Z]/.test(password)) charSetSize += 26;
  if (/[0-9]/.test(password)) charSetSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charSetSize += 32;

  return Math.round(Math.log2(Math.pow(charSetSize, password.length)) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Strength analysis
// ---------------------------------------------------------------------------

/**
 * Analyse password strength without storing the password.
 * Returns a fully structured result with score, labels, and advice.
 */
export function analysePasswordStrength(password: string): PasswordStrengthResult {
  const issues: string[] = [];
  const recommendations: string[] = [];

  const length = password.length;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChars = /[^a-zA-Z0-9]/.test(password);
  const isCommonPattern = KEYBOARD_PATTERNS.some((p) => p.test(password));
  const lowerPassword = password.toLowerCase();
  const isDictionaryWord = COMMON_PASSWORDS.has(lowerPassword) ||
    COMMON_PASSWORDS.has(lowerPassword.replace(/[^a-z]/g, ''));
  const entropy = calculateEntropy(password);

  let score = 0;

  // ── Length scoring ────────────────────────────────────────────────────────
  if (length < 6) {
    score += 0;
    issues.push('Password is too short (minimum 8 characters recommended)');
    recommendations.push('Use at least 8 characters, ideally 12+');
  } else if (length < 8) {
    score += 5;
    issues.push('Password is shorter than recommended (8+ characters)');
    recommendations.push('Increase password length to at least 8 characters');
  } else if (length < 10) {
    score += 15;
    recommendations.push('Consider using a longer password (12+ characters)');
  } else if (length < 12) {
    score += 25;
  } else if (length < 16) {
    score += 35;
  } else {
    score += 45;
  }

  // ── Character class scoring ───────────────────────────────────────────────
  if (hasUppercase) score += 10;
  else { issues.push('No uppercase letters'); recommendations.push('Add uppercase letters (A-Z)'); }

  if (hasLowercase) score += 5;
  else { issues.push('No lowercase letters'); recommendations.push('Add lowercase letters (a-z)'); }

  if (hasNumbers) score += 10;
  else { issues.push('No numbers'); recommendations.push('Include numbers (0-9)'); }

  if (hasSpecialChars) score += 15;
  else { issues.push('No special characters'); recommendations.push('Add special characters (!@#$%^&*)'); }

  // ── Pattern penalties ─────────────────────────────────────────────────────
  if (isCommonPattern) {
    score -= 20;
    issues.push('Password follows a common keyboard pattern (qwerty, 12345, etc.)');
    recommendations.push('Avoid keyboard patterns and sequential characters');
  }

  if (isDictionaryWord) {
    score -= 30;
    issues.push('Password is a common or dictionary word');
    recommendations.push('Avoid common words; use a random passphrase instead');
  }

  // ── Entropy bonus ─────────────────────────────────────────────────────────
  if (entropy >= 50) score += 15;
  else if (entropy >= 35) score += 8;
  else if (entropy >= 20) score += 3;
  else {
    issues.push(`Low password entropy (${entropy} bits)`);
    recommendations.push('Increase password complexity for higher entropy');
  }

  // ── Repeating character penalty ───────────────────────────────────────────
  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
    issues.push('Password contains repeating characters');
    recommendations.push('Avoid repeating the same character multiple times');
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine strength label
  let strength: PasswordStrength;
  if (score < 20) strength = 'very_weak';
  else if (score < 40) strength = 'weak';
  else if (score < 60) strength = 'fair';
  else if (score < 80) strength = 'strong';
  else strength = 'very_strong';

  // Generic recommendation if none were added
  if (recommendations.length === 0) {
    recommendations.push('Your password looks strong! Consider using a password manager to generate even stronger passwords.');
  }

  return {
    score,
    strength,
    length,
    hasUppercase,
    hasLowercase,
    hasNumbers,
    hasSpecialChars,
    isCommonPattern,
    isDictionaryWord,
    entropy,
    issues,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// HIBP k-anonymity breach check
// ---------------------------------------------------------------------------

/**
 * Check whether a password appears in the HaveIBeenPwned breach database.
 *
 * Uses k-anonymity: only the first 5 characters of the SHA-1 hash are sent
 * to the HIBP API. The check is done entirely server-side.
 *
 * @param password The plaintext password to check (never sent to HIBP)
 */
export async function checkPasswordBreach(password: string): Promise<BreachCheckResult> {
  const nowDate = new Date();

  try {
    const fullHash = sha1Full(password);
    const prefix = fullHash.slice(0, 5);
    const suffix = fullHash.slice(5);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        signal: controller.signal,
        headers: {
          'Add-Padding': 'true',
          'User-Agent': 'PasswordHealthMonitor/1.0',
        },
      },
    );
    clearTimeout(timeout);

    if (!response.ok) {
      return { isBreached: false, breachCount: 0, checkedAt: nowDate, source: 'error' };
    }

    const text = await response.text();
    const lines = text.split('\r\n');

    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(':');
      if (hashSuffix && hashSuffix.toUpperCase() === suffix.toUpperCase()) {
        const count = parseInt(countStr, 10) || 0;
        return { isBreached: true, breachCount: count, checkedAt: nowDate, source: 'hibp' };
      }
    }

    return { isBreached: false, breachCount: 0, checkedAt: nowDate, source: 'hibp' };
  } catch {
    return { isBreached: false, breachCount: 0, checkedAt: nowDate, source: 'error' };
  }
}

// ---------------------------------------------------------------------------
// Reuse detection
// ---------------------------------------------------------------------------

/**
 * Check how many accounts share the same password hash.
 * The hash itself is never a recoverable password — this is purely for
 * detecting when multiple accounts use the exact same password.
 */
export async function checkPasswordReuse(
  passwordHash: string,
  excludeUserId?: string,
): Promise<{ isReused: boolean; reuseCount: number }> {
  await connectDB();

  const query: Record<string, any> = { passwordHashForReuse: passwordHash };
  if (excludeUserId) {
    query.userId = { $ne: excludeUserId };
  }

  const count = await PasswordHealth.countDocuments(query);
  return { isReused: count > 0, reuseCount: count + 1 };
}

// ---------------------------------------------------------------------------
// Overall risk calculation
// ---------------------------------------------------------------------------

export function calculateOverallRisk(
  strengthScore: number,
  isBreached: boolean | null,
  isReused: boolean,
  breachCount: number,
  isDictionaryWord: boolean,
  isCommonPattern: boolean,
  daysSinceChange: number | null,
): { risk: PasswordRisk; riskScore: number } {
  let riskScore = 0;

  // Breach is the most critical factor
  if (isBreached === true) {
    riskScore += breachCount > 1000 ? 70 : breachCount > 100 ? 55 : 40;
  }

  // Weak strength
  if (strengthScore < 20) riskScore += 50;
  else if (strengthScore < 40) riskScore += 35;
  else if (strengthScore < 60) riskScore += 20;
  else if (strengthScore < 80) riskScore += 5;

  // Reuse is highly dangerous
  if (isReused) riskScore += 30;

  // Dictionary / common pattern
  if (isDictionaryWord) riskScore += 20;
  else if (isCommonPattern) riskScore += 15;

  // Stale password (> 90 days)
  if (daysSinceChange !== null && daysSinceChange > 365) riskScore += 20;
  else if (daysSinceChange !== null && daysSinceChange > 180) riskScore += 10;
  else if (daysSinceChange !== null && daysSinceChange > 90) riskScore += 5;

  riskScore = Math.min(100, riskScore);

  let risk: PasswordRisk;
  if (riskScore >= 75) risk = 'critical';
  else if (riskScore >= 55) risk = 'high';
  else if (riskScore >= 35) risk = 'medium';
  else if (riskScore >= 15) risk = 'low';
  else risk = 'none';

  return { risk, riskScore };
}

// ---------------------------------------------------------------------------
// Full assessment (called after password creation or change)
// ---------------------------------------------------------------------------

/**
 * Perform a complete password health assessment and persist results.
 *
 * @param userId   The MongoDB user _id
 * @param email    The user's email
 * @param password The plaintext password (ephemeral — never persisted)
 * @param checkBreachOnline  Set false to skip live HIBP API call (e.g. in bulk scans)
 */
export async function assessPasswordHealth(
  userId: string,
  email: string,
  password: string,
  checkBreachOnline = true,
): Promise<PasswordHealthAssessment> {
  await connectDB();

  // 1. Strength analysis (no I/O needed)
  const strength = analysePasswordStrength(password);

  // 2. Compute hashes (ephemeral)
  const reuseHash = sha256(password);
  const prefix = hibpPrefix(password);

  // 3. Breach check (optional live network call)
  let breach: BreachCheckResult;
  if (checkBreachOnline) {
    breach = await checkPasswordBreach(password);
  } else {
    breach = { isBreached: null as any, breachCount: 0, checkedAt: new Date(), source: 'cache' };
  }

  // 4. Reuse detection
  const { isReused, reuseCount } = await checkPasswordReuse(reuseHash, userId);
  if (isReused) strength.issues.push('This password is used by other accounts on the platform');
  if (isReused) strength.recommendations.push('Use a unique password not shared with any other account');

  // 5. Days since password change
  const user = await User.findById(userId).select('lastPasswordChange').lean() as any;
  let daysSincePasswordChange: number | null = null;
  if (user?.lastPasswordChange) {
    daysSincePasswordChange = Math.floor(
      (Date.now() - new Date(user.lastPasswordChange).getTime()) / 86_400_000,
    );
  }

  // 6. Overall risk
  const { risk, riskScore } = calculateOverallRisk(
    strength.score,
    breach.isBreached,
    isReused,
    breach.breachCount,
    strength.isDictionaryWord,
    strength.isCommonPattern,
    daysSincePasswordChange,
  );

  if (daysSincePasswordChange !== null && daysSincePasswordChange > 90) {
    strength.issues.push(`Password not changed for ${daysSincePasswordChange} days`);
    strength.recommendations.push('Change your password every 90 days for best security');
  }

  if (breach.isBreached) {
    strength.issues.push(
      `Password found in ${breach.breachCount.toLocaleString()} data breach records`,
    );
    strength.recommendations.push(
      'Change this password immediately — it has appeared in known data breaches',
    );
  }

  // 7. Upsert the health record (no raw password stored)
  await PasswordHealth.findOneAndUpdate(
    { userId },
    {
      userId,
      email: email.toLowerCase(),
      strength: strength.strength,
      strengthScore: strength.score,
      passwordLength: strength.length,
      hasUppercase: strength.hasUppercase,
      hasLowercase: strength.hasLowercase,
      hasNumbers: strength.hasNumbers,
      hasSpecialChars: strength.hasSpecialChars,
      isCommonPattern: strength.isCommonPattern,
      isDictionaryWord: strength.isDictionaryWord,
      isBreached: breach.isBreached,
      breachCount: breach.breachCount,
      lastBreachCheck: breach.checkedAt,
      passwordHashForReuse: reuseHash,
      hibpPrefix: prefix,
      isReused,
      reuseCount,
      overallRisk: risk,
      overallRiskScore: riskScore,
      issues: strength.issues,
      recommendations: strength.recommendations,
      lastScannedAt: new Date(),
      daysSincePasswordChange,
    },
    { upsert: true, new: true },
  );

  return {
    userId,
    email,
    strength,
    breach,
    isReused,
    reuseCount,
    overallRisk: risk,
    overallRiskScore: riskScore,
    daysSincePasswordChange,
    issues: strength.issues,
    recommendations: strength.recommendations,
  };
}

// ---------------------------------------------------------------------------
// Bulk scan – re-assess all users without their raw passwords
// ---------------------------------------------------------------------------

/**
 * Re-run platform-wide reuse detection and stale password checks for all
 * existing PasswordHealth records (does NOT re-check HIBP since we
 * don't have the plaintext passwords in a recoverable form).
 *
 * Returns the number of records updated.
 */
export async function runBulkReuseRescan(): Promise<number> {
  await connectDB();

  // Build a frequency map of all password hashes
  const reuseAgg = await PasswordHealth.aggregate([
    {
      $group: {
        _id: '$passwordHashForReuse',
        count: { $sum: 1 },
        userIds: { $addToSet: '$userId' },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  let updatedCount = 0;

  // Mark reused passwords
  const reusedHashes = new Set<string>();
  for (const row of reuseAgg) {
    reusedHashes.add(row._id);
  }

  // Update all records with correct reuseCount
  const allRecords = await PasswordHealth.find({}).select('userId passwordHashForReuse isReused reuseCount').lean();

  for (const record of allRecords) {
    const hashEntry = reuseAgg.find((r: any) => r._id === record.passwordHashForReuse);
    const newIsReused = reusedHashes.has(record.passwordHashForReuse);
    const newReuseCount = hashEntry ? hashEntry.count : 1;

    if (record.isReused !== newIsReused || record.reuseCount !== newReuseCount) {
      await PasswordHealth.updateOne(
        { userId: record.userId },
        { isReused: newIsReused, reuseCount: newReuseCount },
      );
      updatedCount++;
    }
  }

  // Update stale password days
  const users = await User.find({ isDeleted: { $ne: true } })
    .select('_id lastPasswordChange')
    .lean() as any[];

  for (const user of users) {
    if (!user.lastPasswordChange) continue;
    const days = Math.floor(
      (Date.now() - new Date(user.lastPasswordChange).getTime()) / 86_400_000,
    );
    await PasswordHealth.updateOne(
      { userId: user._id.toString() },
      { daysSincePasswordChange: days },
    );
  }

  return updatedCount;
}

// ---------------------------------------------------------------------------
// Platform health report generation
// ---------------------------------------------------------------------------

export async function generatePlatformHealthReport(): Promise<PlatformHealthReport> {
  await connectDB();

  // Count total password-based users
  const totalUsersWithPasswords = await User.countDocuments({
    authMethod: { $ne: 'sso' },
    isDeleted: { $ne: true },
  });

  const allRecords = await PasswordHealth.find({}).lean() as IPasswordHealthRecord[];
  const totalUsersScanned = allRecords.length;

  // Strength distribution
  const strengthDistribution = {
    very_weak: 0, weak: 0, fair: 0, strong: 0, very_strong: 0,
  };
  for (const r of allRecords) {
    strengthDistribution[r.strength] = (strengthDistribution[r.strength] || 0) + 1;
  }

  // Risk distribution
  const riskDistribution = {
    critical: 0, high: 0, medium: 0, low: 0, none: 0,
  };
  for (const r of allRecords) {
    riskDistribution[r.overallRisk] = (riskDistribution[r.overallRisk] || 0) + 1;
  }

  // Counts
  const breachedAccounts = allRecords.filter((r) => r.isBreached === true).length;
  const reusedPasswords = allRecords.filter((r) => r.isReused).length;
  const stalePaswords = allRecords.filter(
    (r) => r.daysSincePasswordChange !== null && (r.daysSincePasswordChange ?? 0) > 90,
  ).length;

  // Averages
  const avgStrength = totalUsersScanned > 0
    ? Math.round(allRecords.reduce((s, r) => s + r.strengthScore, 0) / totalUsersScanned)
    : 0;
  const avgRisk = totalUsersScanned > 0
    ? Math.round(allRecords.reduce((s, r) => s + r.overallRiskScore, 0) / totalUsersScanned)
    : 0;

  // Top issues – flatten all issues and count occurrences
  const issueCounts: Record<string, number> = {};
  for (const r of allRecords) {
    for (const issue of r.issues) {
      const key = issue.length > 60 ? issue.slice(0, 60) + '…' : issue;
      issueCounts[key] = (issueCounts[key] || 0) + 1;
    }
  }
  const topIssues = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([issue, affectedAccounts]) => ({ issue, affectedAccounts }));

  // Critical accounts (sorted worst-first, no passwords)
  const criticalAccounts = allRecords
    .filter((r) => r.overallRisk === 'critical' || r.overallRisk === 'high')
    .sort((a, b) => b.overallRiskScore - a.overallRiskScore)
    .slice(0, 20)
    .map((r) => ({
      email: r.email,
      userId: r.userId,
      overallRisk: r.overallRisk,
      overallRiskScore: r.overallRiskScore,
      issues: r.issues,
      daysSincePasswordChange: r.daysSincePasswordChange ?? null,
    }));

  // Platform-level recommendations
  const platformRecs: string[] = [];
  if (breachedAccounts > 0)
    platformRecs.push(`${breachedAccounts} account(s) use breached passwords — force a mandatory password reset`);
  if (reusedPasswords > 0)
    platformRecs.push(`${reusedPasswords} account(s) share passwords — user education campaign recommended`);
  if (riskDistribution.critical + riskDistribution.high > totalUsersScanned * 0.1)
    platformRecs.push('More than 10% of accounts have high/critical password risk — enforce a minimum strength policy');
  if (stalePaswords > totalUsersScanned * 0.2)
    platformRecs.push('Over 20% of passwords are stale (>90 days) — implement a password rotation policy');
  if (avgStrength < 50)
    platformRecs.push('Average password strength is below acceptable — consider enforcing stronger password requirements');
  if (platformRecs.length === 0)
    platformRecs.push('Password security is in good shape. Continue monitoring regularly.');

  return {
    generatedAt: new Date(),
    totalUsersWithPasswords,
    totalUsersScanned,
    strengthDistribution,
    riskDistribution,
    breachedAccounts,
    reusedPasswords,
    averageStrengthScore: avgStrength,
    averageRiskScore: avgRisk,
    topIssues,
    recommendations: platformRecs,
    stalePaswords,
    criticalAccounts,
  };
}

// ---------------------------------------------------------------------------
// Per-user health fetch (read-only – no password needed)
// ---------------------------------------------------------------------------

export async function getUserPasswordHealth(
  userId: string,
): Promise<IPasswordHealthRecord | null> {
  await connectDB();
  return PasswordHealth.findOne({ userId }).lean() as Promise<IPasswordHealthRecord | null>;
}

// ---------------------------------------------------------------------------
// Stats helpers
// ---------------------------------------------------------------------------

export async function getPasswordHealthStats(): Promise<{
  totalScanned: number;
  breachedCount: number;
  reusedCount: number;
  criticalCount: number;
  highRiskCount: number;
  averageStrengthScore: number;
}> {
  await connectDB();

  const agg = await PasswordHealth.aggregate([
    {
      $group: {
        _id: null,
        totalScanned: { $sum: 1 },
        breachedCount: { $sum: { $cond: [{ $eq: ['$isBreached', true] }, 1, 0] } },
        reusedCount: { $sum: { $cond: ['$isReused', 1, 0] } },
        criticalCount: { $sum: { $cond: [{ $eq: ['$overallRisk', 'critical'] }, 1, 0] } },
        highRiskCount: { $sum: { $cond: [{ $eq: ['$overallRisk', 'high'] }, 1, 0] } },
        avgStrength: { $avg: '$strengthScore' },
      },
    },
  ]);

  const row = agg[0] || {};
  return {
    totalScanned: row.totalScanned || 0,
    breachedCount: row.breachedCount || 0,
    reusedCount: row.reusedCount || 0,
    criticalCount: row.criticalCount || 0,
    highRiskCount: row.highRiskCount || 0,
    averageStrengthScore: Math.round(row.avgStrength || 0),
  };
}
