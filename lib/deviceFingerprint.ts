/**
 * Device Fingerprinting & Browser Security Utility
 * Collects browser and device information for security purposes
 */

import crypto from 'crypto';

export interface DeviceFingerprint {
  deviceId: string;
  userAgent: string;
  browser: {
    name: string;
    version: string;
    engine: string;
  };
  os: {
    name: string;
    version: string;
  };
  device: {
    type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    vendor: string;
    model: string;
  };
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
  };
  timezone: string;
  language: string;
  platform: string;
  cookiesEnabled: boolean;
  doNotTrack: boolean;
  ip?: string;
  location?: {
    country?: string;
    city?: string;
  };
  securityScore: number;
  browserFeatures: {
    webGL: boolean;
    canvas: boolean;
    webRTC: boolean;
    localStorage: boolean;
    sessionStorage: boolean;
    indexedDB: boolean;
  };
  suspiciousFlags: string[];
}

export interface TrustedDevice {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  lastUsed: Date;
  firstSeen: Date;
  trustScore: number;
  isTrusted: boolean;
  ip?: string;
  location?: string;
}

/**
 * Client-side device fingerprinting
 * Call this from the browser to collect device information
 */
export function generateClientFingerprint(): Omit<DeviceFingerprint, 'deviceId' | 'securityScore' | 'suspiciousFlags' | 'ip' | 'location'> {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  
  // Parse browser info
  const browser = parseBrowser(userAgent);
  const os = parseOS(userAgent, platform);
  const device = parseDevice(userAgent);

  // Screen information
  const screen = {
    width: window.screen.width,
    height: window.screen.height,
    colorDepth: window.screen.colorDepth,
    pixelRatio: window.devicePixelRatio || 1,
  };

  // Browser features detection
  const browserFeatures = {
    webGL: detectWebGL(),
    canvas: detectCanvas(),
    webRTC: detectWebRTC(),
    localStorage: detectLocalStorage(),
    sessionStorage: detectSessionStorage(),
    indexedDB: detectIndexedDB(),
  };

  return {
    userAgent,
    browser,
    os,
    device,
    screen,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform,
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack === '1',
    browserFeatures,
  };
}

/**
 * Server-side fingerprint processing
 * Adds security scoring and generates device ID
 */
export function processFingerprint(
  clientData: Omit<DeviceFingerprint, 'deviceId' | 'securityScore' | 'suspiciousFlags' | 'ip' | 'location'>,
  ip?: string,
  location?: { country?: string; city?: string }
): DeviceFingerprint {
  // Generate unique device ID
  const deviceId = generateDeviceId(clientData);
  
  // Calculate security score and detect suspicious flags
  const { securityScore, suspiciousFlags } = analyzeDeviceSecurity(clientData);

  return {
    ...clientData,
    deviceId,
    securityScore,
    suspiciousFlags,
    ip,
    location,
  };
}

/**
 * Generate unique device ID based on fingerprint data
 */
function generateDeviceId(data: Partial<DeviceFingerprint>): string {
  const components = [
    data.userAgent,
    data.platform,
    data.screen?.width,
    data.screen?.height,
    data.screen?.colorDepth,
    data.timezone,
    data.language,
  ].filter(Boolean).join('|');

  return crypto.createHash('sha256').update(components).digest('hex');
}

/**
 * Analyze device security and detect suspicious patterns
 */
function analyzeDeviceSecurity(data: Omit<DeviceFingerprint, 'deviceId' | 'securityScore' | 'suspiciousFlags' | 'ip' | 'location'>): {
  securityScore: number;
  suspiciousFlags: string[];
} {
  let score = 100;
  const flags: string[] = [];

  // Check for headless browsers
  if (isHeadlessBrowser(data.userAgent)) {
    score -= 30;
    flags.push('HEADLESS_BROWSER');
  }

  // Check for automation tools
  if (isAutomationTool(data.userAgent)) {
    score -= 40;
    flags.push('AUTOMATION_TOOL');
  }

  // Check for suspicious user agent
  if (isSuspiciousUserAgent(data.userAgent)) {
    score -= 20;
    flags.push('SUSPICIOUS_USER_AGENT');
  }

  // Check for outdated browser (security risk)
  if (isOutdatedBrowser(data.browser)) {
    score -= 15;
    flags.push('OUTDATED_BROWSER');
  }

  // Check if cookies are disabled
  if (!data.cookiesEnabled) {
    score -= 10;
    flags.push('COOKIES_DISABLED');
  }

  // Check for missing browser features (possible spoofing)
  if (!data.browserFeatures.localStorage || !data.browserFeatures.sessionStorage) {
    score -= 15;
    flags.push('MISSING_STORAGE_FEATURES');
  }

  // Check for unusual screen resolution
  if (isUnusualScreenResolution(data.screen)) {
    score -= 5;
    flags.push('UNUSUAL_SCREEN_RESOLUTION');
  }

  // Check for Tor browser indicators
  if (isTorBrowser(data.userAgent)) {
    score -= 25;
    flags.push('TOR_BROWSER');
  }

  // Check for VPN/Proxy indicators
  if (data.timezone && data.language && isTimezoneLanguageMismatch(data.timezone, data.language)) {
    score -= 10;
    flags.push('TIMEZONE_LANGUAGE_MISMATCH');
  }

  return {
    securityScore: Math.max(0, Math.min(100, score)),
    suspiciousFlags: flags,
  };
}

/**
 * Parse browser information from user agent
 */
function parseBrowser(userAgent: string): { name: string; version: string; engine: string } {
  let name = 'Unknown';
  let version = 'Unknown';
  let engine = 'Unknown';

  // Chrome
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    name = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
    engine = 'Blink';
  }
  // Edge
  else if (userAgent.includes('Edg')) {
    name = 'Edge';
    const match = userAgent.match(/Edg\/(\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
    engine = 'Blink';
  }
  // Firefox
  else if (userAgent.includes('Firefox')) {
    name = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
    engine = 'Gecko';
  }
  // Safari
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    name = 'Safari';
    const match = userAgent.match(/Version\/(\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
    engine = 'WebKit';
  }
  // Opera
  else if (userAgent.includes('OPR') || userAgent.includes('Opera')) {
    name = 'Opera';
    const match = userAgent.match(/(?:OPR|Opera)\/(\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
    engine = 'Blink';
  }

  return { name, version, engine };
}

/**
 * Parse operating system information
 */
function parseOS(userAgent: string, platform: string): { name: string; version: string } {
  let name = 'Unknown';
  let version = 'Unknown';

  if (userAgent.includes('Windows NT')) {
    name = 'Windows';
    const versionMap: { [key: string]: string } = {
      '10.0': '10/11',
      '6.3': '8.1',
      '6.2': '8',
      '6.1': '7',
      '6.0': 'Vista',
    };
    const match = userAgent.match(/Windows NT (\d+\.\d+)/);
    version = match ? (versionMap[match[1]] || match[1]) : 'Unknown';
  } else if (userAgent.includes('Mac OS X')) {
    name = 'macOS';
    const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
    version = match ? match[1].replace('_', '.') : 'Unknown';
  } else if (userAgent.includes('Linux')) {
    name = 'Linux';
  } else if (userAgent.includes('Android')) {
    name = 'Android';
    const match = userAgent.match(/Android (\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    name = 'iOS';
    const match = userAgent.match(/OS (\d+_\d+)/);
    version = match ? match[1].replace('_', '.') : 'Unknown';
  }

  return { name, version };
}

/**
 * Parse device type information
 */
function parseDevice(userAgent: string): { type: 'desktop' | 'mobile' | 'tablet' | 'unknown'; vendor: string; model: string } {
  let type: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';
  let vendor = 'Unknown';
  let model = 'Unknown';

  if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
    type = 'mobile';
  } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    type = 'tablet';
  } else if (userAgent.includes('Windows') || userAgent.includes('Mac') || userAgent.includes('Linux')) {
    type = 'desktop';
  }

  // Detect vendor
  if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('Macintosh')) {
    vendor = 'Apple';
  } else if (userAgent.includes('Samsung')) {
    vendor = 'Samsung';
  } else if (userAgent.includes('Pixel')) {
    vendor = 'Google';
  }

  return { type, vendor, model };
}

/**
 * Security check functions
 */
function isHeadlessBrowser(userAgent: string): boolean {
  const headlessIndicators = ['HeadlessChrome', 'PhantomJS', 'Nightmare'];
  return headlessIndicators.some(indicator => userAgent.includes(indicator));
}

function isAutomationTool(userAgent: string): boolean {
  const automationIndicators = ['Selenium', 'WebDriver', 'Puppeteer', 'Playwright'];
  return automationIndicators.some(indicator => userAgent.includes(indicator));
}

function isSuspiciousUserAgent(userAgent: string): boolean {
  // Check for very short or suspicious user agents
  if (userAgent.length < 20) return true;
  
  // Check for curl, wget, etc.
  const suspiciousTools = ['curl', 'wget', 'python-requests', 'bot', 'crawler', 'spider'];
  return suspiciousTools.some(tool => userAgent.toLowerCase().includes(tool));
}

function isOutdatedBrowser(browser: { name: string; version: string }): boolean {
  const minVersions: { [key: string]: number } = {
    'Chrome': 100,
    'Firefox': 100,
    'Safari': 14,
    'Edge': 100,
  };

  const minVersion = minVersions[browser.name];
  if (!minVersion) return false;

  const currentVersion = parseInt(browser.version);
  return !isNaN(currentVersion) && currentVersion < minVersion;
}

function isUnusualScreenResolution(screen: { width: number; height: number }): boolean {
  // Very small or very large resolutions might indicate emulation
  const minSize = 320;
  const maxSize = 7680;
  return screen.width < minSize || screen.height < minSize || 
         screen.width > maxSize || screen.height > maxSize;
}

function isTorBrowser(userAgent: string): boolean {
  return userAgent.includes('Tor Browser');
}

function isTimezoneLanguageMismatch(timezone: string, language: string): boolean {
  // Basic check - can be expanded with more sophisticated logic
  const europeanTimezones = ['Europe/', 'GMT', 'UTC'];
  const europeanLanguages = ['en-GB', 'fr', 'de', 'es', 'it'];
  
  const isEuropeanTimezone = europeanTimezones.some(tz => timezone.includes(tz));
  const isEuropeanLanguage = europeanLanguages.some(lang => language.startsWith(lang));
  
  // More checks can be added for other regions
  return false; // Simplified for now
}

/**
 * Browser feature detection functions
 */
function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

function detectCanvas(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext && canvas.getContext('2d'));
  } catch {
    return false;
  }
}

function detectWebRTC(): boolean {
  return !!(
    (window as any).RTCPeerConnection ||
    (window as any).mozRTCPeerConnection ||
    (window as any).webkitRTCPeerConnection
  );
}

function detectLocalStorage(): boolean {
  try {
    return typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function detectSessionStorage(): boolean {
  try {
    return typeof window.sessionStorage !== 'undefined';
  } catch {
    return false;
  }
}

function detectIndexedDB(): boolean {
  try {
    return typeof window.indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Calculate trust score for a device based on usage history
 */
export function calculateDeviceTrustScore(device: {
  firstSeen: Date;
  lastUsed: Date;
  loginCount: number;
  failedAttempts: number;
  securityScore: number;
}): number {
  let trustScore = 50; // Start with neutral score

  // Age of device (older trusted devices get higher scores)
  const daysSinceFirstSeen = Math.floor(
    (Date.now() - new Date(device.firstSeen).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceFirstSeen > 90) trustScore += 20;
  else if (daysSinceFirstSeen > 30) trustScore += 15;
  else if (daysSinceFirstSeen > 7) trustScore += 10;
  else if (daysSinceFirstSeen > 1) trustScore += 5;

  // Recent activity (recently used devices are more trusted)
  const daysSinceLastUsed = Math.floor(
    (Date.now() - new Date(device.lastUsed).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceLastUsed === 0) trustScore += 10;
  else if (daysSinceLastUsed < 7) trustScore += 5;
  else if (daysSinceLastUsed > 90) trustScore -= 10;

  // Login history
  if (device.loginCount > 50) trustScore += 15;
  else if (device.loginCount > 20) trustScore += 10;
  else if (device.loginCount > 5) trustScore += 5;

  // Failed attempts penalty
  if (device.failedAttempts > 5) trustScore -= 20;
  else if (device.failedAttempts > 2) trustScore -= 10;
  else if (device.failedAttempts > 0) trustScore -= 5;

  // Security score factor
  trustScore += (device.securityScore - 50) * 0.3;

  return Math.max(0, Math.min(100, Math.round(trustScore)));
}

/**
 * Determine if a device should be automatically trusted
 */
export function shouldTrustDevice(fingerprint: DeviceFingerprint, trustScore: number): boolean {
  // High security score and no suspicious flags
  if (fingerprint.securityScore >= 80 && fingerprint.suspiciousFlags.length === 0 && trustScore >= 70) {
    return true;
  }
  
  // Medium security but high trust score (long-term device)
  if (fingerprint.securityScore >= 60 && trustScore >= 85) {
    return true;
  }

  return false;
}

/**
 * Check if device requires additional verification
 */
export function requiresAdditionalVerification(fingerprint: DeviceFingerprint): boolean {
  // Low security score
  if (fingerprint.securityScore < 50) return true;
  
  // Has suspicious flags
  if (fingerprint.suspiciousFlags.length > 1) return true;
  
  // Critical flags
  const criticalFlags = ['HEADLESS_BROWSER', 'AUTOMATION_TOOL', 'TOR_BROWSER'];
  if (fingerprint.suspiciousFlags.some(flag => criticalFlags.includes(flag))) {
    return true;
  }

  return false;
}
