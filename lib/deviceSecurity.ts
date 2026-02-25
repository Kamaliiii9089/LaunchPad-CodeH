/**
 * Client-side device security utilities
 * Call these functions from the browser to collect device information
 */

export interface ClientDeviceFingerprint {
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
  browserFeatures: {
    webGL: boolean;
    canvas: boolean;
    webRTC: boolean;
    localStorage: boolean;
    sessionStorage: boolean;
    indexedDB: boolean;
  };
}

/**
 * Generate device fingerprint on the client side
 */
export function generateDeviceFingerprint(): ClientDeviceFingerprint {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;

  return {
    userAgent,
    browser: parseBrowser(userAgent),
    os: parseOS(userAgent, platform),
    device: parseDevice(userAgent),
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform,
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack === '1',
    browserFeatures: {
      webGL: detectWebGL(),
      canvas: detectCanvas(),
      webRTC: detectWebRTC(),
      localStorage: detectLocalStorage(),
      sessionStorage: detectSessionStorage(),
      indexedDB: detectIndexedDB(),
    },
  };
}

/**
 * Verify current device against server
 */
export async function verifyCurrentDevice(token: string): Promise<{
  success: boolean;
  device?: {
    deviceId: string;
    deviceName: string;
    isNewDevice: boolean;
    isTrusted: boolean;
    trustScore: number;
    securityScore: number;
    suspiciousFlags: string[];
    requiresVerification: boolean;
  };
  error?: string;
}> {
  try {
    const fingerprint = generateDeviceFingerprint();
    
    const response = await fetch('/api/devices/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        clientFingerprint: fingerprint,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to verify device',
      };
    }

    return {
      success: true,
      device: data.device,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to verify device',
    };
  }
}

/**
 * Get all trusted devices
 */
export async function getTrustedDevices(token: string): Promise<{
  success: boolean;
  devices?: any[];
  error?: string;
}> {
  try {
    const response = await fetch('/api/devices', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to get devices',
      };
    }

    return {
      success: true,
      devices: data.devices,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get devices',
    };
  }
}

/**
 * Trust a new device (requires 2FA if enabled)
 */
export async function trustDevice(token: string, deviceId: string, code?: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const response = await fetch('/api/devices/trust', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ deviceId, code }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to trust device',
      };
    }

    return {
      success: true,
      message: data.message,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to trust device',
    };
  }
}

/**
 * Remove a trusted device
 */
export async function removeDevice(token: string, deviceId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const response = await fetch('/api/devices', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ deviceId }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to remove device',
      };
    }

    return {
      success: true,
      message: data.message,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to remove device',
    };
  }
}

/**
 * Browser Security Check - Detect if running in secure context
 */
export function performBrowserSecurityCheck(): {
  isSecure: boolean;
  warnings: string[];
  score: number;
} {
  const warnings: string[] = [];
  let score = 100;

  // Check if HTTPS
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    warnings.push('Not using HTTPS');
    score -= 30;
  }

  // Check if cookies are enabled
  if (!navigator.cookieEnabled) {
    warnings.push('Cookies are disabled');
    score -= 10;
  }

  // Check if JavaScript is restricted
  if (typeof window.localStorage === 'undefined') {
    warnings.push('LocalStorage not available');
    score -= 10;
  }

  // Check for mixed content
  if (window.location.protocol === 'https:' && document.querySelector('img[src^="http:"], script[src^="http:"]')) {
    warnings.push('Mixed content detected');
    score -= 15;
  }

  // Check for outdated browser (basic check)
  const isOutdated = checkBrowserOutdated();
  if (isOutdated) {
    warnings.push('Browser may be outdated');
    score -= 20;
  }

  // Check for developer tools open (basic detection)
  if (isDevToolsOpen()) {
    warnings.push('Developer tools detected');
    score -= 5;
  }

  return {
    isSecure: score >= 70,
    warnings,
    score: Math.max(0, score),
  };
}

// Helper functions

function parseBrowser(userAgent: string): { name: string; version: string; engine: string } {
  let name = 'Unknown';
  let version = 'Unknown';
  let engine = 'Unknown';

  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    name = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
    engine = 'Blink';
  } else if (userAgent.includes('Edg')) {
    name = 'Edge';
    const match = userAgent.match(/Edg\/(\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
    engine = 'Blink';
  } else if (userAgent.includes('Firefox')) {
    name = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
    engine = 'Gecko';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    name = 'Safari';
    const match = userAgent.match(/Version\/(\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
    engine = 'WebKit';
  }

  return { name, version, engine };
}

function parseOS(userAgent: string, platform: string): { name: string; version: string } {
  let name = 'Unknown';
  let version = 'Unknown';

  if (userAgent.includes('Windows NT')) {
    name = 'Windows';
    const match = userAgent.match(/Windows NT (\d+\.\d+)/);
    const versionMap: { [key: string]: string } = {
      '10.0': '10/11',
      '6.3': '8.1',
      '6.2': '8',
      '6.1': '7',
    };
    version = match ? (versionMap[match[1]] || match[1]) : 'Unknown';
  } else if (userAgent.includes('Mac OS X')) {
    name = 'macOS';
    const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
    version = match ? match[1].replace('_', '.') : 'Unknown';
  } else if (userAgent.includes('Android')) {
    name = 'Android';
    const match = userAgent.match(/Android (\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    name = 'iOS';
    const match = userAgent.match(/OS (\d+_\d+)/);
    version = match ? match[1].replace('_', '.') : 'Unknown';
  } else if (userAgent.includes('Linux')) {
    name = 'Linux';
  }

  return { name, version };
}

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

  if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('Macintosh')) {
    vendor = 'Apple';
  } else if (userAgent.includes('Samsung')) {
    vendor = 'Samsung';
  } else if (userAgent.includes('Pixel')) {
    vendor = 'Google';
  }

  return { type, vendor, model };
}

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

function checkBrowserOutdated(): boolean {
  const userAgent = navigator.userAgent;
  const browser = parseBrowser(userAgent);
  
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

function isDevToolsOpen(): boolean {
  // Basic detection - can be bypassed
  const threshold = 160;
  return (
    window.outerWidth - window.innerWidth > threshold ||
    window.outerHeight - window.innerHeight > threshold
  );
}
