const Email = require('../models/Email');
const getPagination = require('../utils/pagination');

/**
 * Get Emails (Paginated)
 */
exports.getEmails = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req);

    const totalEmails = await Email.countDocuments({ userId: req.user.id });

    const emails = await Email.find({ userId: req.user.id })
      .skip(skip)
      .limit(limit)
      .sort({ receivedAt: -1 });

    res.status(200).json({
      success: true,
      pagination: {
        totalEmails,
        currentPage: page,
        limit,
        totalPages: Math.ceil(totalEmails / limit),
      },
      data: emails,
    });
  } catch (err) {
    next(err);
  }
};
