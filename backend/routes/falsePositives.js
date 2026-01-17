const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const falsePositiveController = require('../controllers/falsePositiveController');

const router = express.Router();

/**
 * Validation middleware
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

/**
 * Submit a false positive report
 * POST /api/false-positives
 */
router.post(
  '/',
  authMiddleware,
  [
    body('reportType')
      .isIn(['phishing', 'breach', 'suspicious_email', 'malicious_url', 'other'])
      .withMessage('Invalid report type'),
    body('referenceId')
      .notEmpty()
      .withMessage('Reference ID is required'),
    body('userFeedback.reason')
      .isIn([
        'legitimate_sender',
        'known_service',
        'expected_email',
        'incorrect_analysis',
        'trusted_domain',
        'false_urgency_detection',
        'other'
      ])
      .withMessage('Invalid feedback reason'),
    body('userFeedback.comment')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Comment must not exceed 1000 characters'),
    body('userFeedback.confidence')
      .optional()
      .isIn(['certain', 'likely', 'unsure'])
      .withMessage('Invalid confidence level')
  ],
  validate,
  falsePositiveController.submitReport
);

/**
 * Get user's false positive reports
 * GET /api/false-positives
 */
router.get(
  '/',
  authMiddleware,
  [
    query('status')
      .optional()
      .isIn(['pending', 'reviewed', 'accepted', 'rejected', 'needs_more_info'])
      .withMessage('Invalid status'),
    query('reportType')
      .optional()
      .isIn(['phishing', 'breach', 'suspicious_email', 'malicious_url', 'other'])
      .withMessage('Invalid report type'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  validate,
  falsePositiveController.getUserReports
);

/**
 * Get user's false positive statistics
 * GET /api/false-positives/stats
 */
router.get(
  '/stats',
  authMiddleware,
  [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date format'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date format')
  ],
  validate,
  falsePositiveController.getUserStats
);

/**
 * Check if an item has been reported as false positive
 * GET /api/false-positives/check/:referenceId
 */
router.get(
  '/check/:referenceId',
  authMiddleware,
  [
    param('referenceId')
      .notEmpty()
      .withMessage('Reference ID is required')
  ],
  validate,
  falsePositiveController.checkFalsePositive
);

/**
 * Get similar false positive reports
 * GET /api/false-positives/similar
 */
router.get(
  '/similar',
  authMiddleware,
  [
    query('emailFrom')
      .notEmpty()
      .isEmail()
      .withMessage('Valid email address is required'),
    query('subject')
      .optional()
      .isString()
      .withMessage('Subject must be a string'),
    query('riskLevel')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Invalid risk level')
  ],
  validate,
  falsePositiveController.getSimilarReports
);

/**
 * Get a specific false positive report
 * GET /api/false-positives/:id
 */
router.get(
  '/:id',
  authMiddleware,
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid report ID')
  ],
  validate,
  falsePositiveController.getReportById
);

/**
 * Update a false positive report
 * PATCH /api/false-positives/:id
 */
router.patch(
  '/:id',
  authMiddleware,
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid report ID'),
    body('userFeedback.reason')
      .optional()
      .isIn([
        'legitimate_sender',
        'known_service',
        'expected_email',
        'incorrect_analysis',
        'trusted_domain',
        'false_urgency_detection',
        'other'
      ])
      .withMessage('Invalid feedback reason'),
    body('userFeedback.comment')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Comment must not exceed 1000 characters'),
    body('userFeedback.confidence')
      .optional()
      .isIn(['certain', 'likely', 'unsure'])
      .withMessage('Invalid confidence level')
  ],
  validate,
  falsePositiveController.updateReport
);

/**
 * Delete a false positive report
 * DELETE /api/false-positives/:id
 */
router.delete(
  '/:id',
  authMiddleware,
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid report ID')
  ],
  validate,
  falsePositiveController.deleteReport
);

/**
 * Admin routes (require admin middleware - to be added)
 * For now, these are protected by authMiddleware only
 * TODO: Add role-based access control middleware
 */

/**
 * Review a false positive report (Admin)
 * POST /api/false-positives/:id/review
 */
router.post(
  '/:id/review',
  authMiddleware,
  // TODO: Add admin middleware here: adminMiddleware,
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid report ID'),
    body('decision')
      .isIn(['confirmed_false_positive', 'correct_detection', 'inconclusive'])
      .withMessage('Invalid decision'),
    body('notes')
      .optional()
      .isString()
      .withMessage('Notes must be a string'),
    body('actionTaken')
      .optional()
      .isString()
      .withMessage('Action taken must be a string')
  ],
  validate,
  falsePositiveController.reviewReport
);

/**
 * Get all false positive reports (Admin)
 * GET /api/false-positives/admin/all
 */
router.get(
  '/admin/all',
  authMiddleware,
  // TODO: Add admin middleware here: adminMiddleware,
  [
    query('status')
      .optional()
      .isIn(['pending', 'reviewed', 'accepted', 'rejected', 'needs_more_info'])
      .withMessage('Invalid status'),
    query('reportType')
      .optional()
      .isIn(['phishing', 'breach', 'suspicious_email', 'malicious_url', 'other'])
      .withMessage('Invalid report type'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date format'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date format'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  validate,
  falsePositiveController.getAllReports
);

/**
 * Get comprehensive statistics (Admin)
 * GET /api/false-positives/admin/stats
 */
router.get(
  '/admin/stats',
  authMiddleware,
  // TODO: Add admin middleware here: adminMiddleware,
  [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date format'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date format')
  ],
  validate,
  falsePositiveController.getAdminStats
);

module.exports = router;
