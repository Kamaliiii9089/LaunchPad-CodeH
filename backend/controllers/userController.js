const User = require('../models/User');
const getPagination = require('../utils/pagination');

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
