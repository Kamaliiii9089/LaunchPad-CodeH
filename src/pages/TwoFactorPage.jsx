import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import { FiLock, FiShield, FiAlertCircle, FiKey } from 'react-icons/fi';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import './AuthPages.css';

const TwoFactorPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { updateUser } = useAuth();

    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [useRecoveryCode, setUseRecoveryCode] = useState(false);

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
        
        const minLength = useRecoveryCode ? 8 : 6;
        if (!code || code.length < minLength) {
            return setError(`Please enter a valid ${useRecoveryCode ? '8-character recovery' : '6-digit'} code`);
        }

        setLoading(true);
        setError('');

        try {
            const response = await authAPI.validate2FA({
                tempToken,
                token: code,
                isRecoveryCode: useRecoveryCode
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
            setError(err.response?.data?.message || `Invalid ${useRecoveryCode ? 'recovery' : 'authentication'} code`);
        } finally {
            setLoading(false);
        }
    };

    const toggleRecoveryMode = () => {
        setUseRecoveryCode(!useRecoveryCode);
        setCode('');
        setError('');
    };

    return (
        <div className="auth-page">
            <div className="container container-sm">
                <div className="auth-container">
                    <div className="auth-header">
                        <div className="auth-logo" style={{ background: 'var(--primary-color)', color: 'white' }}>
                            {useRecoveryCode ? <FiKey /> : <FiLock />}
                        </div>
                        <h1>Two-Factor Authentication</h1>
                        <p>
                            {useRecoveryCode 
                                ? 'Enter one of your 8-character recovery codes'
                                : 'Enter the 6-digit code from your authenticator app'
                            }
                        </p>
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
                                <label className="form-label">
                                    {useRecoveryCode ? 'Recovery Code' : 'Authentication Code'}
                                </label>
                                <div className="input-with-icon">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder={useRecoveryCode ? 'XXXXXXXX' : '000000'}
                                        value={code}
                                        onChange={(e) => {
                                            if (useRecoveryCode) {
                                                // Allow alphanumeric for recovery codes
                                                const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                                                if (val.length <= 8) setCode(val);
                                            } else {
                                                // Only allow numbers for authenticator codes
                                                const val = e.target.value.replace(/\D/g, '');
                                                if (val.length <= 6) setCode(val);
                                            }
                                        }}
                                        maxLength={useRecoveryCode ? 8 : 6}
                                        autoFocus
                                        required
                                        style={{ 
                                            letterSpacing: useRecoveryCode ? '0.25em' : '0.5em', 
                                            fontSize: '1.25rem', 
                                            textAlign: 'center',
                                            fontFamily: useRecoveryCode ? 'monospace' : 'inherit'
                                        }}
                                    />
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !tempToken}>
                                {loading ? <LoadingSpinner size="small" color="white" /> : 'Verify'}
                            </button>
                        </form>

                        <div className="auth-links text-center" style={{ marginTop: '1.5rem' }}>
                            <button
                                onClick={toggleRecoveryMode}
                                className="btn btn-text"
                                style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', width: '100%' }}
                            >
                                {useRecoveryCode 
                                    ? '← Use Authenticator Code' 
                                    : 'Lost your device? Use recovery code →'
                                }
                            </button>
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
