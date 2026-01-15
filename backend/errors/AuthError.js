const AppError = require('./AppError');

class AuthError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
  }
}

module.exports = AuthError;
