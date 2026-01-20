const User = require('../models/User');
const getPagination = require('../utils/pagination');
const securityLogger = require('../services/securityLogger');
const { logActivity } = require('../services/activityLogger');
const AppError = require('../errors/AppError');

/**
 * Get All Users (Paginated)
 * ------------------------
 * Supports:
 *  - page (default: 1)
 *  - limit (default: 10)
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    // Extract pagination params
    const { page, limit, skip } = getPagination(req);

    // Total documents count
    const totalRecords = await User.countDocuments();

    // Fetch paginated data
    const users = await User.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Calculate total pages
    const totalPages = Math.ceil(totalRecords / limit);

    res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change User Password
 * --------------------
 * Allows authenticated users to change their password
 * Requires:
 *  - currentPassword: current password for verification
 *  - newPassword: new password (must meet strength requirements)
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    // Validation: Check if both passwords are provided
    if (!currentPassword || !newPassword) {
      securityLogger.logAuthFailure(req.user.email, ip, 'Password change failed - missing fields');
      return res.status(400).json({
        success: false,
        message: 'Both current password and new password are required'
      });
    }

    // Validation: Check new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    // Check password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password must contain at least one uppercase letter, one lowercase letter, and one number'
      });
    }

    // Validation: Ensure new password is different from current
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Find user with password field (select: false by default)
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      securityLogger.logAuthFailure(req.user.email, ip, 'Password change failed - user not found');
      throw new AppError('User not found', 404);
    }

    // Check if user has a password (OAuth users might not)
    if (!user.password) {
      securityLogger.logAuthFailure(req.user.email, ip, 'Password change failed - OAuth account');
      return res.status(400).json({
        success: false,
        message: 'Cannot change password for OAuth-linked accounts. Please use your OAuth provider.'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      securityLogger.logAuthFailure(req.user.email, ip, 'Password change failed - incorrect current password');
      
      // Log failed attempt
      await logActivity(
        user._id,
        'PASSWORD_CHANGE_FAILED',
        'Failed password change attempt - incorrect current password',
        req,
        'failure',
        { reason: 'incorrect_current_password' }
      );

      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    // Log successful password change
    securityLogger.logAuthSuccess(user._id, user.email, ip, 'password-change');
    
    await logActivity(
      user._id,
      'PASSWORD_CHANGE',
      'Password changed successfully',
      req,
      'success',
      { ip }
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};
