import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import { FiLock, FiShield, FiAlertCircle } from 'react-icons/fi';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import './AuthPages.css';

const TwoFactorPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { updateUser } = useAuth();

    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Retrieve tempToken from navigation state or URL query parameters
    const getTempToken = () => {
        if (location.state?.tempToken) return location.state.tempToken;
        const params = new URLSearchParams(location.search);
        return params.get('tempToken');
    };

    const tempToken = getTempToken();

    useEffect(() => {
        if (!tempToken) {
            setError('Session expired or invalid. Please login again.');
            // Optional: redirect to login after timeout
            setTimeout(() => navigate('/login'), 3000);
        }
    }, [tempToken, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!code || code.length < 6) {
            return setError('Please enter a valid 6-digit code');
        }

        setLoading(true);
        setError('');

        try {
            const response = await authAPI.validate2FA({
                tempToken,
                token: code
            });

            const { token, user } = response.data;

            // Update global auth state
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            updateUser(user);

            // Navigate to dashboard
            navigate('/dashboard', { replace: true });
        } catch (err) {
            console.error('2FA Validation Error:', err);
            setError(err.response?.data?.message || 'Invalid authentication code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="container container-sm">
                <div className="auth-container">
                    <div className="auth-header">
                        <div className="auth-logo" style={{ background: 'var(--primary-color)', color: 'white' }}>
                            <FiLock />
                        </div>
                        <h1>Two-Factor Authentication</h1>
                        <p>Enter the 6-digit code from your authenticator app</p>
                    </div>

                    {error && (
                        <div className="alert alert-error">
                            <FiAlertCircle />
                            {error}
                        </div>
                    )}

                    <div className="auth-form">
                        <form onSubmit={handleSubmit} className="auth-form-fields">
                            <div className="form-group">
                                <label className="form-label">Authentication Code</label>
                                <div className="input-with-icon">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="000000"
                                        value={code}
                                        onChange={(e) => {
                                            // Only allow numbers
                                            const val = e.target.value.replace(/\D/g, '');
                                            if (val.length <= 6) setCode(val);
                                        }}
                                        maxLength={6}
                                        autoFocus
                                        required
                                        style={{ letterSpacing: '0.5em', fontSize: '1.25rem', textAlign: 'center' }}
                                    />
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !tempToken}>
                                {loading ? <LoadingSpinner size="small" color="white" /> : 'Verify'}
                            </button>
                        </form>

                        <div className="auth-links text-center" style={{ marginTop: '1.5rem' }}>
                            <button
                                onClick={() => navigate('/login')}
                                className="btn btn-text"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                Back to Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TwoFactorPage;
