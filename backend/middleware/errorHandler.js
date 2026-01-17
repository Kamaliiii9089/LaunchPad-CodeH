const AppError = require('../errors/AppError');

// MongoDB Cast Error (invalid ObjectId)
const handleCastErrorDB = err => {
  return new AppError(`Invalid ${err.path}: ${err.value}`, 400);
};

// MongoDB Duplicate Key Error
const handleDuplicateFieldsDB = err => {
  const field = Object.keys(err.keyValue)[0];
  return new AppError(
    `Duplicate value for field: ${field}. Please use another value.`,
    400
  );
};

// Mongoose Validation Error
const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  return new AppError(`Invalid input data. ${errors.join('. ')}`, 400);
};

// JWT Errors
const handleJWTError = () =>
  new AppError('Invalid token. Please login again.', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired. Please login again.', 401);

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // 🟢 DEVELOPMENT
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: err,
      stack: err.stack
    });
  }

  // 🟡 PRODUCTION
  let error = { ...err };
  error.message = err.message;

  if (error.name === 'CastError') error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === 'ValidationError')
    error = handleValidationErrorDB(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError')
    error = handleJWTExpiredError();

  // Operational errors → safe message
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      status: error.status,
      message: error.message
    });
  }

  // 🔥 Unknown / Programming errors
  console.error('🔥 ERROR:', err);

  res.status(500).json({
    status: 'error',
    message: 'Something went wrong'
  });
};
