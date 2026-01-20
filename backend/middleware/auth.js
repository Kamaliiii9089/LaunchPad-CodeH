const jwt = require('jsonwebtoken');
const User = require('../models/User');
const securityLogger = require('../services/securityLogger');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

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
      console.log('🔍 Decoded token:', decoded);
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError.message);
      return res.status(401).json({
        message: 'Invalid token',
        error: 'TOKEN_EXPIRED_OR_INVALID'
      });
    }
    
    // Handle different token formats (userId, id, or email)
    let user;
    if (decoded.userId) {
      user = await User.findById(decoded.userId);
    } else if (decoded.id) {
      user = await User.findById(decoded.id);
    } else if (decoded.email) {
      user = await User.findOne({ email: decoded.email });
    }
    
    console.log('👤 Found user:', user ? user.email : 'NOT FOUND', 'Active:', user?.isActive);
    
    if (!user || !user.isActive) {
      const userId = decoded.userId || decoded.id || 'unknown';
      securityLogger.logTokenFailure(userId, ip, 'User not found or inactive', userAgent);
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || 'unknown';
    
    console.error('Auth middleware error:', error);
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

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied: Admin privileges required',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

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
