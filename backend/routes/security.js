const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const securityLogger = require('../services/securityLogger');
const { authModerateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * Get security event counters
 * Admin only endpoint to view security metrics
 */
router.get('/metrics', authMiddleware, adminMiddleware, authModerateLimiter, (req, res) => {
  try {
    const counters = securityLogger.getEventCounters();
    
    res.json({
      success: true,
      metrics: counters,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching security metrics:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch security metrics' 
    });
  }
});

/**
 * Get recent security events
 * Admin only endpoint to view recent security logs
 */
router.get('/events', authMiddleware, adminMiddleware, authModerateLimiter, (req, res) => {
  try {
    const count = parseInt(req.query.count) || 100;
    const events = securityLogger.getRecentEvents(count);
    
    res.json({
      success: true,
      count: events.length,
      events,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching security events:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch security events' 
    });
  }
});

/**
 * Reset security event counters
 * Admin only endpoint to reset metrics
 */
router.post('/metrics/reset', authMiddleware, adminMiddleware, authModerateLimiter, (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    
    securityLogger.resetEventCounters();
    securityLogger.logSuspiciousActivity(
      ip, 
      'Security metrics reset', 
      `Reset by admin user ${req.user.email}`,
      req.get('user-agent') || 'unknown'
    );
    
    res.json({
      success: true,
      message: 'Security metrics reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error resetting security metrics:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to reset security metrics' 
    });
  }
});

/**
 * Trigger log archival manually
 * Admin only endpoint
 */
router.post('/logs/archive', authMiddleware, adminMiddleware, authModerateLimiter, (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    
    securityLogger.archiveLogs();
    securityLogger.logSuspiciousActivity(
      ip, 
      'Manual log archival', 
      `Triggered by admin user ${req.user.email}`,
      req.get('user-agent') || 'unknown'
    );
    
    res.json({
      success: true,
      message: 'Logs archived successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error archiving logs:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to archive logs' 
    });
  }
});

module.exports = router;
