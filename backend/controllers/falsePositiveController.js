const FalsePositive = require('../models/FalsePositive');
const Email = require('../models/Email');
const { securityLogger } = require('../services/securityLogger');

/**
 * False Positive Controller
 * 
 * Handles user feedback on incorrectly flagged security alerts and emails.
 * Provides endpoints for submitting, managing, and analyzing false positive reports.
 */

/**
 * Submit a false positive report
 * POST /api/false-positives
 */
exports.submitReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      reportType,
      referenceId,
      originalDetection,
      emailData,
      userFeedback,
      metadata
    } = req.body;

    // Validation
    if (!reportType || !referenceId || !userFeedback?.reason) {
      return res.status(400).json({
        success: false,
        message: 'Report type, reference ID, and feedback reason are required'
      });
    }

    // Verify the email/item exists and belongs to the user
    if (['phishing', 'suspicious_email'].includes(reportType)) {
      const email = await Email.findOne({
        messageId: referenceId,
        userId
      });

      if (!email) {
        return res.status(404).json({
          success: false,
          message: 'Referenced email not found or does not belong to you'
        });
      }
    }

    // Check for duplicate reports
    const existingReport = await FalsePositive.findOne({
      userId,
      referenceId,
      reportType
    });

    if (existingReport) {
      return res.status(409).json({
        success: false,
        message: 'You have already reported this item as a false positive',
        reportId: existingReport._id
      });
    }

    // Check for similar existing reports
    let similarReports = [];
    if (emailData?.from?.email) {
      similarReports = await FalsePositive.findSimilar(
        emailData.from.email,
        emailData.subject || '',
        originalDetection?.riskLevel
      );
    }

    // Create the false positive report
    const falsePositiveReport = new FalsePositive({
      userId,
      reportType,
      referenceId,
      originalDetection: {
        riskScore: originalDetection?.riskScore,
        riskLevel: originalDetection?.riskLevel,
        indicators: originalDetection?.indicators || [],
        detectionMethod: originalDetection?.detectionMethod,
        timestamp: originalDetection?.timestamp || new Date()
      },
      emailData: emailData ? {
        from: emailData.from,
        subject: emailData.subject,
        snippet: emailData.snippet,
        messageId: emailData.messageId,
        links: emailData.links || []
      } : undefined,
      userFeedback: {
        reason: userFeedback.reason,
        comment: userFeedback.comment,
        confidence: userFeedback.confidence || 'certain'
      },
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        reportSource: metadata?.reportSource || 'web'
      },
      impact: {
        similarReports: similarReports.map(r => r._id)
      }
    });

    await falsePositiveReport.save();

    // Log the security event
    if (securityLogger && securityLogger.logFalsePositiveReport) {
      securityLogger.logFalsePositiveReport({
        userId,
        reportType,
        referenceId,
        reason: userFeedback.reason,
        riskLevel: originalDetection?.riskLevel
      });
    }

    res.status(201).json({
      success: true,
      message: 'False positive report submitted successfully',
      data: {
        reportId: falsePositiveReport._id,
        status: falsePositiveReport.status,
        similarReportsCount: similarReports.length
      }
    });

  } catch (error) {
    console.error('Error submitting false positive report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit false positive report',
      error: error.message
    });
  }
};

/**
 * Get user's false positive reports
 * GET /api/false-positives
 */
exports.getUserReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      status,
      reportType,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { userId };
    if (status) query.status = status;
    if (reportType) query.reportType = reportType;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [reports, total] = await Promise.all([
      FalsePositive.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-metadata.ipAddress -metadata.userAgent')
        .lean(),
      FalsePositive.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalReports: total,
          hasMore: skip + reports.length < total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error.message
    });
  }
};

/**
 * Get a specific false positive report
 * GET /api/false-positives/:id
 */
exports.getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const report = await FalsePositive.findOne({
      _id: id,
      userId
    }).select('-metadata.ipAddress -metadata.userAgent');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report',
      error: error.message
    });
  }
};

/**
 * Update a false positive report (add comment, change confidence)
 * PATCH /api/false-positives/:id
 */
exports.updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { userFeedback } = req.body;

    const report = await FalsePositive.findOne({ _id: id, userId });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Only allow updates to pending or needs_more_info reports
    if (!['pending', 'needs_more_info'].includes(report.status)) {
      return res.status(403).json({
        success: false,
        message: 'Cannot update a report that has been reviewed'
      });
    }

    // Update feedback
    if (userFeedback) {
      if (userFeedback.comment) report.userFeedback.comment = userFeedback.comment;
      if (userFeedback.confidence) report.userFeedback.confidence = userFeedback.confidence;
      if (userFeedback.reason) report.userFeedback.reason = userFeedback.reason;
    }

    await report.save();

    res.json({
      success: true,
      message: 'Report updated successfully',
      data: report
    });

  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update report',
      error: error.message
    });
  }
};

/**
 * Delete a false positive report (only if pending)
 * DELETE /api/false-positives/:id
 */
exports.deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const report = await FalsePositive.findOne({ _id: id, userId });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Only allow deletion of pending reports
    if (report.status !== 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete a report that has been reviewed'
      });
    }

    await report.deleteOne();

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete report',
      error: error.message
    });
  }
};

/**
 * Get false positive statistics for the user
 * GET /api/false-positives/stats
 */
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const matchStage = {
      userId: userId
    };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const stats = await FalsePositive.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          byType: {
            $push: {
              type: '$reportType',
              status: '$status'
            }
          },
          byStatus: {
            $push: '$status'
          },
          avgRiskScore: { $avg: '$originalDetection.riskScore' },
          acceptedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
          },
          pendingReports: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalReports: 1,
          acceptedReports: 1,
          pendingReports: 1,
          avgRiskScore: { $round: ['$avgRiskScore', 2] },
          acceptanceRate: {
            $cond: [
              { $eq: ['$totalReports', 0] },
              0,
              { $round: [{ $multiply: [{ $divide: ['$acceptedReports', '$totalReports'] }, 100] }, 2] }
            ]
          }
        }
      }
    ]);

    // Get counts by type
    const typeStats = await FalsePositive.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$reportType',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overall: stats[0] || {
          totalReports: 0,
          acceptedReports: 0,
          pendingReports: 0,
          avgRiskScore: 0,
          acceptanceRate: 0
        },
        byType: typeStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

/**
 * Check if an item has been reported as false positive
 * GET /api/false-positives/check/:referenceId
 */
exports.checkFalsePositive = async (req, res) => {
  try {
    const { referenceId } = req.params;
    const userId = req.user.id;

    const report = await FalsePositive.findOne({
      userId,
      referenceId,
      status: { $in: ['accepted', 'reviewed'] }
    }).select('reportType status createdAt');

    res.json({
      success: true,
      data: {
        isFalsePositive: !!report,
        report: report || null
      }
    });

  } catch (error) {
    console.error('Error checking false positive:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check false positive status',
      error: error.message
    });
  }
};

/**
 * Get similar false positive reports (for pattern detection)
 * GET /api/false-positives/similar
 */
exports.getSimilarReports = async (req, res) => {
  try {
    const { emailFrom, subject, riskLevel } = req.query;

    if (!emailFrom) {
      return res.status(400).json({
        success: false,
        message: 'Email sender (emailFrom) is required'
      });
    }

    const similarReports = await FalsePositive.findSimilar(
      emailFrom,
      subject || '',
      riskLevel
    );

    res.json({
      success: true,
      data: {
        count: similarReports.length,
        reports: similarReports
      }
    });

  } catch (error) {
    console.error('Error fetching similar reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch similar reports',
      error: error.message
    });
  }
};

/**
 * Admin: Review a false positive report
 * POST /api/false-positives/:id/review
 * (Requires admin role - add middleware in routes)
 */
exports.reviewReport = async (req, res) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user.id;
    const { decision, notes, actionTaken } = req.body;

    if (!decision) {
      return res.status(400).json({
        success: false,
        message: 'Review decision is required'
      });
    }

    const report = await FalsePositive.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Update review information
    report.review = {
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      decision,
      notes,
      actionTaken
    };

    // Update status based on decision
    if (decision === 'confirmed_false_positive') {
      report.status = 'accepted';
    } else if (decision === 'correct_detection') {
      report.status = 'rejected';
    } else {
      report.status = 'reviewed';
    }

    await report.save();

    // Log the review
    if (securityLogger && securityLogger.logFalsePositiveReview) {
      securityLogger.logFalsePositiveReview({
        reportId: id,
        reviewerId,
        decision,
        originalUserId: report.userId
      });
    }

    res.json({
      success: true,
      message: 'Report reviewed successfully',
      data: report
    });

  } catch (error) {
    console.error('Error reviewing report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review report',
      error: error.message
    });
  }
};

/**
 * Admin: Get all false positive reports with filters
 * GET /api/false-positives/admin/all
 */
exports.getAllReports = async (req, res) => {
  try {
    const {
      status,
      reportType,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (reportType) query.reportType = reportType;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [reports, total] = await Promise.all([
      FalsePositive.find(query)
        .populate('userId', 'email name')
        .populate('review.reviewedBy', 'email name')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      FalsePositive.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalReports: total,
          hasMore: skip + reports.length < total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching all reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error.message
    });
  }
};

/**
 * Admin: Get comprehensive statistics
 * GET /api/false-positives/admin/stats
 */
exports.getAdminStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = await FalsePositive.getStatistics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    // Get top false positive patterns
    const topPatterns = await FalsePositive.aggregate([
      {
        $match: {
          status: 'accepted',
          'emailData.from.email': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$emailData.from.email',
          count: { $sum: 1 },
          avgRiskScore: { $avg: '$originalDetection.riskScore' },
          indicators: { $addToSet: '$originalDetection.indicators' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        statistics: stats,
        topFalsePositivePatterns: topPatterns
      }
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

module.exports = exports;
