const HTTP_STATUS = require('../utils/httpStatus');

module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
};
