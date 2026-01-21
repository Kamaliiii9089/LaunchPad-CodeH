import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiShield, FiAlertCircle } from 'react-icons/fi';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import './AuthPages.css';

const LoginPage = () => {
  const { login, manualLogin, loading, error, clearError, getAuthUrl, getGithubAuthUrl } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    // Clear any previous errors when component mounts
    clearError();

    // Handle OAuth callback if code is present
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const provider = urlParams.get('provider') || 'google';

    if (error) {
      setAuthError('Authentication was cancelled or failed. Please try again.');
      return;
    }

    if (code) {
      handleOAuthCallback(code, provider);
    }
  }, [location, clearError]);

  const handleOAuthCallback = async (code, provider = 'google') => {
    try {
      setIsLoading(true);
      setAuthError(null);

      const result = await login(code, provider);

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

  const handleGithubLogin = async () => {
    try {
      setIsLoading(true);
      setAuthError(null);

      const authUrl = await getGithubAuthUrl();

      // Redirect to GitHub OAuth
      window.location.href = authUrl;
    } catch (error) {
      console.error('GitHub login error:', error);
      setAuthError('Failed to initialize GitHub login. Please try again.');
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleManualLogin = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      setAuthError(null);

      const result = await manualLogin(formData.email, formData.password);

      if (result.success) {
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else if (result.requires2FA) {
        navigate('/login/2fa', { state: { tempToken: result.tempToken } });
      } else {
        setAuthError(result.error || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthError('Login failed. Please try again.');
    } finally {
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
            <div className="social-buttons">
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

              <button
                onClick={handleGithubLogin}
                disabled={isLoading}
                className="btn btn-github btn-lg"
              >
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.13 0 0 .67-.22 2.2.82a7.6 7.6 0 012 0c1.53-1.04 2.2-.82 2.2-.82.44 1.11.16 1.93.08 2.13.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" fill="#ffffff"/>
                </svg>
                Continue with GitHub
              </button>
            </div>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <form className="auth-form-fields" onSubmit={handleManualLogin}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  className={`form-control ${formErrors.email ? 'error' : ''}`}
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                {formErrors.email && (
                  <span className="form-error">{formErrors.email}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  className={`form-control ${formErrors.password ? 'error' : ''}`}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                {formErrors.password && (
                  <span className="form-error">{formErrors.password}</span>
                )}
              </div>

              <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
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
