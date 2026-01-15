import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiShield, FiAlertCircle } from 'react-icons/fi';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import './AuthPages.css';

const LoginPage = () => {
  const { login, loading, error, clearError, getAuthUrl } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Clear any previous errors when component mounts
    clearError();

    // Handle OAuth callback if code is present
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      setAuthError('Authentication was cancelled or failed. Please try again.');
      return;
    }

    if (code) {
      handleGoogleCallback(code);
    }
  }, [location, clearError]);

  const handleGoogleCallback = async (code) => {
    try {
      setIsLoading(true);
      setAuthError(null);

      const result = await login(code);

      if (result.success) {
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else if (result.requires2FA) {
        navigate('/login/2fa', { state: { tempToken: result.tempToken } });
      } else {
        setAuthError(result.error || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login callback error:', error);
      setAuthError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setAuthError(null);

      const authUrl = await getAuthUrl();

      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (error) {
      console.error('Google login error:', error);
      setAuthError('Failed to initialize Google login. Please try again.');
      setIsLoading(false);
    }
  };

  const displayError = error || authError;

  if (loading || isLoading) {
    return (
      <div className="auth-page">
        <div className="container container-sm">
          <LoadingSpinner text="Signing you in..." />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="container container-sm">
        <div className="auth-container">
          <div className="auth-header">
            <div className="auth-logo">
              <FiMail />
            </div>
            <h1>Welcome Back</h1>
            <p>Sign in to your Gmail Subscription Manager account</p>
          </div>

          {displayError && (
            <div className="alert alert-error">
              <FiAlertCircle />
              {displayError}
            </div>
          )}

          <div className="auth-form">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="btn btn-google btn-lg"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z" fill="#4285F4" />
                <path d="M9 18C11.43 18 13.4673 17.1945 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z" fill="#34A853" />
                <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957273C0.347727 6.17318 0 7.54772 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z" fill="#FBBC05" />
                <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <form className="auth-form-fields" onSubmit={(e) => e.preventDefault()}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter your email"
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter your password"
                  disabled
                />
              </div>

              <button type="submit" className="btn btn-primary btn-lg" disabled>
                Sign In (Coming Soon)
              </button>
            </form>

            <p className="auth-note">
              <FiShield className="shield-icon" />
              Your privacy is our priority. We only access email metadata to identify subscriptions.
            </p>
          </div>

          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/signup" className="auth-link">
                Sign up here
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-features">
          <div className="feature">
            <FiMail className="feature-icon" />
            <div>
              <h4>Secure Gmail Integration</h4>
              <p>Connect safely with OAuth 2.0 authentication</p>
            </div>
          </div>
          <div className="feature">
            <FiShield className="feature-icon" />
            <div>
              <h4>Privacy Protected</h4>
              <p>We never store your actual email content</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
