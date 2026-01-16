const fs = require('fs');
const path = require('path');

/**
 * Security Event Logging Service
 * 
 * Provides structured logging for security-related events including:
 * - Authentication attempts (success/failure)
 * - Rate limiting violations
 * - Suspicious activities
 * - Account lockouts
 * - Token validation failures
 */

class SecurityLogger {
  constructor() {
    this.logsDir = path.join(__dirname, '../logs');
    this.securityLogFile = path.join(this.logsDir, 'security.log');
    this.auditLogFile = path.join(this.logsDir, 'audit.log');
    
    // Ensure logs directory exists
    this.ensureLogsDirectory();
    
    // Event counters for monitoring
    this.eventCounters = {
      authSuccess: 0,
      authFailure: 0,
      rateLimitViolation: 0,
      suspiciousActivity: 0,
      accountLockout: 0,
      tokenFailure: 0
    };
  }

  /**
   * Ensure logs directory exists
   */
  ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Format log entry with timestamp and structured data
   */
  formatLogEntry(level, eventType, data) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      eventType,
      ...data
    };
    
    return JSON.stringify(logEntry) + '\n';
  }

  /**
   * Write log entry to file
   */
  writeLog(filePath, entry) {
    try {
      fs.appendFileSync(filePath, entry, 'utf8');
    } catch (error) {
      console.error('Failed to write security log:', error);
    }
  }

  /**
   * Log authentication success
   */
  logAuthSuccess(userId, email, ip, method = 'oauth') {
    this.eventCounters.authSuccess++;
    
    const entry = this.formatLogEntry('INFO', 'AUTH_SUCCESS', {
      userId,
      email,
      ip,
      method,
      userAgent: 'N/A'
    });
    
    this.writeLog(this.securityLogFile, entry);
    this.writeLog(this.auditLogFile, entry);
    
    console.log(`✅ [AUTH SUCCESS] User ${email} authenticated from ${ip}`);
  }

  /**
   * Log authentication failure
   */
  logAuthFailure(email, ip, reason, userAgent = 'N/A') {
    this.eventCounters.authFailure++;
    
    const entry = this.formatLogEntry('WARN', 'AUTH_FAILURE', {
      email,
      ip,
      reason,
      userAgent
    });
    
    this.writeLog(this.securityLogFile, entry);
    
    console.warn(`⚠️ [AUTH FAILURE] Failed login for ${email || 'unknown'} from ${ip}: ${reason}`);
  }

  /**
   * Log rate limit violation
   */
  logRateLimitViolation(ip, endpoint, limit, current, userAgent = 'N/A') {
    this.eventCounters.rateLimitViolation++;
    
    const entry = this.formatLogEntry('WARN', 'RATE_LIMIT_VIOLATION', {
      ip,
      endpoint,
      limit,
      current,
      userAgent
    });
    
    this.writeLog(this.securityLogFile, entry);
    
    console.warn(`🚨 [RATE LIMIT] IP ${ip} exceeded rate limit on ${endpoint} (${current}/${limit})`);
  }

  /**
   * Log account lockout
   */
  logAccountLockout(ip, attempts, lockoutDuration, userAgent = 'N/A') {
    this.eventCounters.accountLockout++;
    
    const entry = this.formatLogEntry('ERROR', 'ACCOUNT_LOCKOUT', {
      ip,
      attempts,
      lockoutDuration,
      userAgent
    });
    
    this.writeLog(this.securityLogFile, entry);
    this.writeLog(this.auditLogFile, entry);
    
    console.error(`🚫 [LOCKOUT] IP ${ip} locked out after ${attempts} failed attempts (${lockoutDuration}s)`);
  }

  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(ip, activity, details, userAgent = 'N/A') {
    this.eventCounters.suspiciousActivity++;
    
    const entry = this.formatLogEntry('ERROR', 'SUSPICIOUS_ACTIVITY', {
      ip,
      activity,
      details,
      userAgent
    });
    
    this.writeLog(this.securityLogFile, entry);
    this.writeLog(this.auditLogFile, entry);
    
    console.error(`⚠️ [SUSPICIOUS] ${activity} detected from IP ${ip}: ${details}`);
  }

  /**
   * Log token validation failure
   */
  logTokenFailure(userId, ip, reason, userAgent = 'N/A') {
    this.eventCounters.tokenFailure++;
    
    const entry = this.formatLogEntry('WARN', 'TOKEN_FAILURE', {
      userId,
      ip,
      reason,
      userAgent
    });
    
    this.writeLog(this.securityLogFile, entry);
    
    console.warn(`⚠️ [TOKEN FAILURE] Token validation failed for ${userId || 'unknown'} from ${ip}: ${reason}`);
  }

  /**
   * Log OAuth callback
   */
  logOAuthCallback(email, ip, success, error = null) {
    const eventType = success ? 'OAUTH_SUCCESS' : 'OAUTH_FAILURE';
    const level = success ? 'INFO' : 'WARN';
    
    if (success) {
      this.eventCounters.authSuccess++;
    } else {
      this.eventCounters.authFailure++;
    }
    
    const entry = this.formatLogEntry(level, eventType, {
      email,
      ip,
      success,
      error
    });
    
    this.writeLog(this.securityLogFile, entry);
    
    if (success) {
      console.log(`✅ [OAUTH SUCCESS] User ${email} completed OAuth from ${ip}`);
    } else {
      console.warn(`⚠️ [OAUTH FAILURE] OAuth failed for ${email || 'unknown'} from ${ip}: ${error}`);
    }
  }

  /**
   * Log account deletion
   */
  logAccountDeletion(userId, email, ip, deletedData) {
    const entry = this.formatLogEntry('INFO', 'ACCOUNT_DELETION', {
      userId,
      email,
      ip,
      deletedData
    });
    
    this.writeLog(this.auditLogFile, entry);
    
    console.log(`🗑️ [ACCOUNT DELETION] User ${email} deleted account from ${ip}`);
  }

  /**
   * Log password reset attempt
   */
  logPasswordReset(email, ip, success) {
    const eventType = success ? 'PASSWORD_RESET_SUCCESS' : 'PASSWORD_RESET_FAILURE';
    const level = success ? 'INFO' : 'WARN';
    
    const entry = this.formatLogEntry(level, eventType, {
      email,
      ip,
      success
    });
    
    this.writeLog(this.securityLogFile, entry);
    this.writeLog(this.auditLogFile, entry);
  }

  /**
   * Log permission denied
   */
  logPermissionDenied(userId, resource, action, ip) {
    const entry = this.formatLogEntry('WARN', 'PERMISSION_DENIED', {
      userId,
      resource,
      action,
      ip
    });
    
    this.writeLog(this.securityLogFile, entry);
    
    console.warn(`⛔ [PERMISSION DENIED] User ${userId} attempted ${action} on ${resource} from ${ip}`);
  }

  /**
   * Log session creation
   */
  logSessionCreated(userId, email, ip, sessionId) {
    const entry = this.formatLogEntry('INFO', 'SESSION_CREATED', {
      userId,
      email,
      ip,
      sessionId
    });
    
    this.writeLog(this.auditLogFile, entry);
  }

  /**
   * Log session termination
   */
  logSessionTerminated(userId, email, ip, reason = 'logout') {
    const entry = this.formatLogEntry('INFO', 'SESSION_TERMINATED', {
      userId,
      email,
      ip,
      reason
    });
    
    this.writeLog(this.auditLogFile, entry);
  }

  /**
   * Log false positive report submission
   */
  logFalsePositiveReport({ userId, reportType, referenceId, reason, riskLevel }) {
    const entry = this.formatLogEntry('INFO', 'FALSE_POSITIVE_REPORT', {
      userId,
      reportType,
      referenceId,
      reason,
      riskLevel
    });
    
    this.writeLog(this.auditLogFile, entry);
    
    console.log(`📊 [FALSE POSITIVE] User ${userId} reported ${reportType} (${referenceId}) as false positive - Reason: ${reason}`);
  }

  /**
   * Log false positive report review
   */
  logFalsePositiveReview({ reportId, reviewerId, decision, originalUserId }) {
    const entry = this.formatLogEntry('INFO', 'FALSE_POSITIVE_REVIEW', {
      reportId,
      reviewerId,
      decision,
      originalUserId
    });
    
    this.writeLog(this.auditLogFile, entry);
    
    console.log(`👁️ [FALSE POSITIVE REVIEW] Reviewer ${reviewerId} marked report ${reportId} as ${decision}`);
  }

  /**
   * Log false positive detection override
   */
  logFalsePositiveOverride({ emailFrom, subject, userId, confidence, reportCount }) {
    const entry = this.formatLogEntry('INFO', 'FALSE_POSITIVE_OVERRIDE', {
      emailFrom,
      subject: subject?.substring(0, 50),
      userId,
      confidence,
      reportCount
    });
    
    this.writeLog(this.securityLogFile, entry);
    
    console.log(`🔄 [FALSE POSITIVE OVERRIDE] Email from ${emailFrom} not flagged due to ${reportCount} false positive reports (${confidence}% confidence)`);
  }

  /**
   * Log false positive pattern detection
   */
  logFalsePositivePattern({ pattern, frequency, emailSender, action }) {
    const entry = this.formatLogEntry('INFO', 'FALSE_POSITIVE_PATTERN', {
      pattern,
      frequency,
      emailSender,
      action
    });
    
    this.writeLog(this.auditLogFile, entry);
    
    console.log(`🔍 [FALSE POSITIVE PATTERN] Detected pattern: ${pattern} for ${emailSender} (${frequency} occurrences) - Action: ${action}`);
  }

  /**
   * Get event counters for monitoring
   */
  getEventCounters() {
    return { ...this.eventCounters };
  }

  /**
   * Reset event counters
   */
  resetEventCounters() {
    Object.keys(this.eventCounters).forEach(key => {
      this.eventCounters[key] = 0;
    });
  }

  /**
   * Get recent security events
   */
  getRecentEvents(count = 100) {
    try {
      if (!fs.existsSync(this.securityLogFile)) {
        return [];
      }

      const logs = fs.readFileSync(this.securityLogFile, 'utf8');
      const lines = logs.trim().split('\n');
      const recentLines = lines.slice(-count);
      
      return recentLines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    } catch (error) {
      console.error('Failed to read security logs:', error);
      return [];
    }
  }

  /**
   * Archive old logs (called periodically)
   */
  archiveLogs() {
    const timestamp = new Date().toISOString().split('T')[0];
    
    try {
      // Archive security log
      if (fs.existsSync(this.securityLogFile)) {
        const archivePath = path.join(this.logsDir, `security_${timestamp}.log`);
        fs.copyFileSync(this.securityLogFile, archivePath);
        fs.writeFileSync(this.securityLogFile, '');
      }
      
      // Archive audit log
      if (fs.existsSync(this.auditLogFile)) {
        const archivePath = path.join(this.logsDir, `audit_${timestamp}.log`);
        fs.copyFileSync(this.auditLogFile, archivePath);
        fs.writeFileSync(this.auditLogFile, '');
      }
      
      console.log(`📦 [LOG ARCHIVE] Logs archived for ${timestamp}`);
    } catch (error) {
      console.error('Failed to archive logs:', error);
    }
  }

  /**
   * Clean up old archived logs (keep last 30 days)
   */
  cleanupOldLogs(daysToKeep = 30) {
    try {
      const files = fs.readdirSync(this.logsDir);
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000;
      
      files.forEach(file => {
        if (file.startsWith('security_') || file.startsWith('audit_')) {
          const filePath = path.join(this.logsDir, file);
          const stats = fs.statSync(filePath);
          const age = now - stats.mtime.getTime();
          
          if (age > maxAge) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ [LOG CLEANUP] Deleted old log file: ${file}`);
          }
        }
      });
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }
}

// Create singleton instance
const securityLogger = new SecurityLogger();

// Schedule daily log archival (at midnight)
if (process.env.NODE_ENV === 'production') {
  const scheduleArchival = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow - now;
    
    setTimeout(() => {
      securityLogger.archiveLogs();
      securityLogger.cleanupOldLogs();
      scheduleArchival(); // Schedule next archival
    }, timeUntilMidnight);
  };
  
  scheduleArchival();
}

module.exports = securityLogger;
