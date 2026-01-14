const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

exports.isAccountLocked = (user) => {
  if (!user.lockUntil) return false;

  if (user.lockUntil > Date.now()) {
    return true;
  }

  // Lock expired → reset
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.save();

  return false;
};

exports.handleFailedLogin = async (user) => {
  user.failedLoginAttempts += 1;

  if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
    user.lockUntil = new Date(Date.now() + LOCK_TIME);
  }

  await user.save();
};

exports.handleSuccessfulLogin = async (user) => {
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();
};
