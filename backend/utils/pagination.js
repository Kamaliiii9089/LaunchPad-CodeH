
/**
 * Pagination Utility
 * ------------------
 * This helper extracts pagination parameters from request query
 * and returns skip, limit, page, and meta information
 */

const getPagination = (req) => {
  // Page number (default = 1)
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

  // Number of items per page (default = 10, max = 100)
  const limit = Math.min(
    Math.max(parseInt(req.query.limit, 10) || 10, 1),
    100
  );

  // Number of documents to skip
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

module.exports = getPagination;
