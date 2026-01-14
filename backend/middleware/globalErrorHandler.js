const HTTP_STATUS = require("../utils/httpStatus");

module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const code = err.code || "INTERNAL_ERROR";

  const payload = {
    success: false,
    code,
    message: err.message || "Internal Server Error",
  };

  if (process.env.NODE_ENV !== "production") {
    // Provide non-sensitive details in non-production for easier debugging
    payload.details = err.details || undefined;
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};
