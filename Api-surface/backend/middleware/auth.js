import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    // Reset monthly usage if needed
    user.resetMonthlyUsage();
    await user.save();

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }
    next();
  };
};

export const checkPlanLimits = (resource) => {
  return (req, res, next) => {
    const user = req.user;
    
    switch (resource) {
      case 'domain':
        if (user.usage.domainsUsed >= user.planLimits.domainsAllowed) {
          return res.status(402).json({
            success: false,
            message: 'Domain limit reached. Please upgrade your plan.',
            currentUsage: user.usage.domainsUsed,
            limit: user.planLimits.domainsAllowed
          });
        }
        break;
        
      case 'scan':
        if (user.usage.scansThisMonth >= user.planLimits.scansPerMonth) {
          return res.status(402).json({
            success: false,
            message: 'Monthly scan limit reached. Please upgrade your plan.',
            currentUsage: user.usage.scansThisMonth,
            limit: user.planLimits.scansPerMonth
          });
        }
        break;
        
      case 'ai_analysis':
        if (!user.planLimits.aiAnalysisEnabled) {
          return res.status(402).json({
            success: false,
            message: 'AI analysis not available in your plan. Please upgrade.'
          });
        }
        break;
        
      case 'monitoring':
        if (!user.planLimits.realTimeMonitoring) {
          return res.status(402).json({
            success: false,
            message: 'Real-time monitoring not available in your plan. Please upgrade.'
          });
        }
        break;
    }
    
    next();
  };
};

export const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};
