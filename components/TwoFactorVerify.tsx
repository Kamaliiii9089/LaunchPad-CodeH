'use client';

import { useState } from 'react';

interface TwoFactorVerifyProps {
  userId: string;
  onSuccess: (token: string, user: any) => void;
  onCancel: () => void;
}

export default function TwoFactorVerify({ userId, onSuccess, onCancel }: TwoFactorVerifyProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);

  const handleVerify = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/auth/2fa/verify-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid code');
      }

      // Success!
      if (data.usedBackupCode && data.remainingBackupCodes === 0) {
        alert('Warning: You have used your last backup code! Please set up a new authenticator as soon as possible.');
      }

      onSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length >= 6) {
      handleVerify();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Two-Factor Authentication
        </h2>
        <p className="text-gray-600 mb-6">
          {isBackupCode
            ? 'Enter one of your backup codes'
            : 'Enter the 6-digit code from your authenticator app'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="mb-6">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              const value = isBackupCode 
                ? e.target.value.toUpperCase().slice(0, 8)
                : e.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(value);
            }}
            onKeyPress={handleKeyPress}
            placeholder={isBackupCode ? 'XXXXXXXX' : '000000'}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-center text-2xl font-mono tracking-widest"
            maxLength={isBackupCode ? 8 : 6}
            autoFocus
          />
        </div>

        <div className="space-y-3">
          <button
            onClick={handleVerify}
            disabled={loading || code.length < 6}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>

          <button
            onClick={() => {
              setIsBackupCode(!isBackupCode);
              setCode('');
              setError('');
            }}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors text-sm"
          >
            {isBackupCode ? 'Use Authenticator Code' : 'Use Backup Code'}
          </button>

          <button
            onClick={onCancel}
            className="w-full px-4 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors border border-gray-300"
          >
            Cancel
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          Lost your device? Use a backup code to sign in.
        </p>
      </div>
    </div>
  );
}
