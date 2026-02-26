/**
 * PII (Personally Identifiable Information) Detection and Masking Utilities
 * Helps identify and protect sensitive personal data in compliance with GDPR and CCPA
 */

export interface PIIField {
  field: string;
  type: string;
  value: string;
  masked: boolean;
  maskedValue?: string;
}

export interface PIIAnalysis {
  totalDataPoints: number;
  piiFields: number;
  anonymizedFields: number;
  piiDetected: PIIField[];
}

// Regex patterns for common PII types
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
  ipv4: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  ipv6: /\b([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
  name: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
  address: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct)\b/gi,
  zipCode: /\b\d{5}(?:-\d{4})?\b/g,
  dateOfBirth: /\b(?:0[1-9]|1[0-2])\/(?:0[1-9]|[12]\d|3[01])\/(?:19|20)\d{2}\b/g,
};

/**
 * Detect PII in a given text or object
 */
export function detectPII(data: any, fieldName: string = 'data'): PIIField[] {
  const detectedPII: PIIField[] = [];

  if (typeof data === 'string') {
    // Check for each PII type
    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      const matches = data.match(pattern);
      if (matches) {
        matches.forEach(match => {
          detectedPII.push({
            field: fieldName,
            type,
            value: match,
            masked: false,
          });
        });
      }
    }
  } else if (typeof data === 'object' && data !== null) {
    // Recursively check object properties
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        detectedPII.push(...detectPII(value, key));
      } else if (typeof value === 'object') {
        detectedPII.push(...detectPII(value, key));
      }
    }
  }

  return detectedPII;
}

/**
 * Mask PII data for privacy protection
 */
export function maskPII(value: string, type: string): string {
  switch (type) {
    case 'email':
      const [user, domain] = value.split('@');
      if (!domain) return '***@***';
      return `${user.substring(0, 2)}***@${domain}`;
    
    case 'phone':
      return value.replace(/\d(?=\d{4})/g, '*');
    
    case 'ssn':
      return '***-**-' + value.slice(-4);
    
    case 'creditCard':
      return '**** **** **** ' + value.replace(/\D/g, '').slice(-4);
    
    case 'ipv4':
      const parts = value.split('.');
      return `${parts[0]}.${parts[1]}.***.**`;
    
    case 'ipv6':
      const ipParts = value.split(':');
      return ipParts.slice(0, 4).join(':') + ':****:****:****';
    
    case 'name':
      const names = value.split(' ');
      return names.map((n, i) => i === names.length - 1 ? n : n[0] + '***').join(' ');
    
    case 'address':
      return '*** ' + value.split(' ').slice(-2).join(' ');
    
    case 'zipCode':
      return value.slice(0, 3) + '**';
    
    case 'dateOfBirth':
      return '**/**/' + value.slice(-4);
    
    default:
      return '*'.repeat(Math.min(value.length, 8));
  }
}

/**
 * Anonymize user data by hashing or pseudonymizing
 */
export function anonymizeData(data: any): any {
  if (typeof data === 'string') {
    // Detect and mask all PII
    let anonymized = data;
    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      anonymized = anonymized.replace(pattern, (match) => maskPII(match, type));
    }
    return anonymized;
  } else if (Array.isArray(data)) {
    return data.map(item => anonymizeData(item));
  } else if (typeof data === 'object' && data !== null) {
    const anonymized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip certain fields that should never be anonymized
      if (['_id', 'id', 'createdAt', 'updatedAt'].includes(key)) {
        anonymized[key] = value;
      } else {
        anonymized[key] = anonymizeData(value);
      }
    }
    return anonymized;
  }
  return data;
}

/**
 * Generate pseudonymous identifier
 */
export function generatePseudonym(original: string): string {
  // Simple hash function for demo purposes
  // In production, use a proper cryptographic hash
  let hash = 0;
  for (let i = 0; i < original.length; i++) {
    const char = original.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `user_${Math.abs(hash).toString(36)}`;
}

/**
 * Analyze user data for PII and privacy compliance
 */
export function analyzePrivacy(userData: any): PIIAnalysis {
  const piiDetected = detectPII(userData);
  
  // Count unique fields with PII
  const uniquePIIFields = new Set(piiDetected.map(p => p.field));
  
  // Count total data points
  const totalDataPoints = countDataPoints(userData);
  
  // Count anonymized fields (fields that have been masked)
  const anonymizedFields = piiDetected.filter(p => p.masked).length;
  
  return {
    totalDataPoints,
    piiFields: uniquePIIFields.size,
    anonymizedFields,
    piiDetected: piiDetected.slice(0, 20), // Limit to first 20 for display
  };
}

/**
 * Count total data points in an object
 */
function countDataPoints(data: any): number {
  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return 1;
  } else if (Array.isArray(data)) {
    return data.reduce((sum: number, item) => sum + countDataPoints(item), 0);
  } else if (typeof data === 'object' && data !== null) {
    return Object.values(data).reduce((sum: number, value) => sum + countDataPoints(value), 0);
  }
  return 0;
}

/**
 * Check if a field contains sensitive PII
 */
export function isSensitivePII(fieldName: string): boolean {
  const sensitiveFields = [
    'password',
    'ssn',
    'socialSecurityNumber',
    'creditCard',
    'creditCardNumber',
    'cvv',
    'pin',
    'bankAccount',
    'routingNumber',
    'driverLicense',
    'passport',
    'taxId',
  ];
  
  return sensitiveFields.some(field => 
    fieldName.toLowerCase().includes(field.toLowerCase())
  );
}

/**
 * Mask object fields containing PII
 */
export function maskObjectPII(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const masked = { ...obj };
  
  for (const [key, value] of Object.entries(masked)) {
    if (isSensitivePII(key)) {
      masked[key] = '***REDACTED***';
    } else if (typeof value === 'string') {
      const piiDetected = detectPII(value, key);
      if (piiDetected.length > 0) {
        let maskedValue = value;
        piiDetected.forEach(pii => {
          maskedValue = maskedValue.replace(pii.value, maskPII(pii.value, pii.type));
        });
        masked[key] = maskedValue;
      }
    } else if (typeof value === 'object') {
      masked[key] = maskObjectPII(value);
    }
  }
  
  return masked;
}
