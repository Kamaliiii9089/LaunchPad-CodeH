const jwt = require('jsonwebtoken');
const User = require('../models/User');
const securityLogger = require('../services/securityLogger');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || 'unknown';
    
    if (!authHeader) {
      securityLogger.logTokenFailure(null, ip, 'No token provided', userAgent);
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      securityLogger.logTokenFailure(null, ip, 'Invalid token format', userAgent);
      return res.status(401).json({ message: 'Invalid token format' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError.message);
      securityLogger.logTokenFailure(null, ip, `JWT verification failed: ${jwtError.message}`, userAgent);
      return res.status(401).json({ 
        message: 'Invalid token',
        error: 'TOKEN_EXPIRED_OR_INVALID'
      });
    }
    
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      securityLogger.logTokenFailure(decoded.userId, ip, 'User not found or inactive', userAgent);
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || 'unknown';
    
    console.error('Auth middleware error:', error);
    securityLogger.logTokenFailure(null, ip, `Middleware error: ${error.message}`, userAgent);
    
    return res.status(401).json({ 
      message: 'Authentication failed',
      error: 'MIDDLEWARE_ERROR'
    });
  }
};

const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Add admin check logic here if needed
    // For now, all authenticated users have access
    
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(403).json({ message: 'Admin access required' });
  }
};

module.exports = {
  authMiddleware,
  adminMiddleware
};
