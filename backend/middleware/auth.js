const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError.message);
      return res.status(401).json({
        message: 'Invalid token',
        error: 'TOKEN_EXPIRED_OR_INVALID'
      });
    }

    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
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
