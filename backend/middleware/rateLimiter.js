const rateLimit = require('express-rate-limit');
const securityLogger = require('../services/securityLogger');

/**
 * Rate Limiter Configuration for Authentication Security
 * 
 * This module provides configurable rate limiting middleware to protect
 * against brute-force attacks, credential stuffing, and DDoS attempts.
 */

// Store for tracking failed authentication attempts
const loginAttempts = new Map();

/**
 * Strict rate limiter for critical authentication endpoints
 * Protects against brute-force attacks on login/callback endpoints
 */
const authStrictLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5, // 5 requests per window default
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests, not just failed ones
  skipFailedRequests: false,
  
  // Custom key generator to track by IP + user agent for better identification
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || 'unknown';
    return `${ip}-${userAgent.substring(0, 50)}`;
  },
  
  // Custom handler when limit is exceeded
  handler: (req, res) => {
    const userAgent = req.get('user-agent') || 'unknown';
    
    // Log rate limit violation
    securityLogger.logRateLimitViolation(
      req.ip,
      req.path,
      req.rateLimit.limit,
      req.rateLimit.current,
      userAgent
    );
    
    console.warn(`🚨 Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'You have exceeded the maximum number of authentication attempts. Please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() - Date.now()) / 1000,
      limit: req.rateLimit.limit,
      current: req.rateLimit.current
    });
  },
  
  // Skip rate limiting for trusted IPs in development
  skip: (req) => {
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT_DEV === 'true') {
      const ip = req.ip || req.connection.remoteAddress;
      return ip === '127.0.0.1' || ip === '::1';
    }
    return false;
  }
});

/**
 * Moderate rate limiter for general authentication operations
 * Used for token validation, profile fetches, etc.
 */
const authModerateL = rateLimit({
  windowMs: parseInt(process.env.AUTH_MODERATE_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_MODERATE_MAX_REQUESTS) || 50, // 50 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  
  handler: (req, res) => {
    const userAgent = req.get('user-agent') || 'unknown';
    
    // Log rate limit violation
    securityLogger.logRateLimitViolation(
      req.ip,
      req.path,
      req.rateLimit.limit,
      req.rateLimit.current,
      userAgent
    );
    
    console.warn(`⚠️ Moderate rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have made too many requests. Please slow down.',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() - Date.now()) / 1000
    });
  },
  
  skip: (req) => {
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT_DEV === 'true') {
      const ip = req.ip || req.connection.remoteAddress;
      return ip === '127.0.0.1' || ip === '::1';
    }
    return false;
  }
});

/**
 * General API rate limiter for non-authentication endpoints
 * More lenient limits for regular API usage
 */
const apiGeneralLimiter = rateLimit({
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  
  handler: (req, res) => {
    const userAgent = req.get('user-agent') || 'unknown';
    
    // Log rate limit violation
    securityLogger.logRateLimitViolation(
      req.ip,
      req.path,
      req.rateLimit.limit,
      req.rateLimit.current,
      userAgent
    );
    
    console.warn(`⚠️ API rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'API rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() - Date.now()) / 1000
    });
  },
  
  skip: (req) => {
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT_DEV === 'true') {
      const ip = req.ip || req.connection.remoteAddress;
      return ip === '127.0.0.1' || ip === '::1' || ip?.startsWith('192.168.') || ip?.startsWith('10.') || ip?.startsWith('172.');
    }
    return false;
  }
});

/**
 * Progressive penalty system for failed login attempts
 * Tracks and applies increasing delays after repeated failures
 */
const loginAttemptTracker = (req, res, next) => {
  const key = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Clean up old entries (older than 1 hour)
  for (const [k, v] of loginAttempts.entries()) {
    if (now - v.firstAttempt > 60 * 60 * 1000) {
      loginAttempts.delete(k);
    }
  }
  
  const attempt = loginAttempts.get(key) || {
    count: 0,
    firstAttempt: now,
    lastAttempt: now
  };
  
  // If more than 10 failed attempts in the last hour, block completely
  if (attempt.count >= 10) {
    const timeLeft = Math.ceil((attempt.firstAttempt + 60 * 60 * 1000 - now) / 1000);
    const userAgent = req.get('user-agent') || 'unknown';
    
    // Log account lockout
    securityLogger.logAccountLockout(key, attempt.count, timeLeft, userAgent);
    
    console.warn(`🚫 IP ${key} blocked due to excessive failed login attempts`);
    return res.status(429).json({
      error: 'Too many failed login attempts',
      message: 'Your account has been temporarily locked due to multiple failed login attempts. Please try again later.',
      retryAfter: timeLeft,
      lockedUntil: new Date(attempt.firstAttempt + 60 * 60 * 1000).toISOString()
    });
  }
  
  // Store the attempt info for use in response handlers
  req.loginAttemptKey = key;
  req.currentAttempt = attempt;
  
  next();
};

/**
 * Middleware to track failed authentication attempts
 * Call this after authentication failure to increment counter
 */
const trackFailedLogin = (ip) => {
  const now = Date.now();
  const attempt = loginAttempts.get(ip) || {
    count: 0,
    firstAttempt: now,
    lastAttempt: now
  };
  
  attempt.count += 1;
  attempt.lastAttempt = now;
  
  loginAttempts.set(ip, attempt);
  
  console.warn(`⚠️ Failed login attempt #${attempt.count} from IP: ${ip}`);
};

/**
 * Middleware to clear failed attempts on successful login
 */
const clearFailedAttempts = (ip) => {
  if (loginAttempts.has(ip)) {
    loginAttempts.delete(ip);
    console.log(`✅ Cleared failed login attempts for IP: ${ip}`);
  }
};

/**
 * Enhanced middleware to add attempt tracking to authentication responses
 */
const wrapAuthResponse = (handler) => {
  return async (req, res, next) => {
    // Store original json and status methods
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);
    
    let statusCode = 200;
    
    // Override status to capture status code
    res.status = function(code) {
      statusCode = code;
      return originalStatus(code);
    };
    
    // Override json to track success/failure
    res.json = function(body) {
      if (req.loginAttemptKey) {
        // Success: 200-299 status codes or explicit success indicators
        if (statusCode >= 200 && statusCode < 300 && (body.token || body.authUrl)) {
          clearFailedAttempts(req.loginAttemptKey);
        } 
        // Failure: 400-499 status codes or error indicators
        else if ((statusCode >= 400 && statusCode < 500) || body.error || body.message?.includes('failed')) {
          trackFailedLogin(req.loginAttemptKey);
        }
      }
      
      return originalJson(body);
    };
    
    try {
      await handler(req, res, next);
    } catch (error) {
      // Track error as failed attempt
      if (req.loginAttemptKey) {
        trackFailedLogin(req.loginAttemptKey);
      }
      throw error;
    }
  };
};

module.exports = {
  authStrictLimiter,
  authModerateLimiter: authModerateL,
  apiGeneralLimiter,
  loginAttemptTracker,
  trackFailedLogin,
  clearFailedAttempts,
  wrapAuthResponse
};
