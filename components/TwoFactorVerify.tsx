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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl border border-transparent dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Two-Factor Authentication
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {isBackupCode
            ? 'Enter one of your backup codes'
            : 'Enter the 6-digit code from your authenticator app'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
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
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl font-mono tracking-widest placeholder-gray-300 dark:placeholder-gray-600"
            maxLength={isBackupCode ? 8 : 6}
            autoFocus
          />
        </div>

        <div className="space-y-3">
          <button
            onClick={handleVerify}
            disabled={loading || code.length < 6}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>

          <button
            onClick={() => {
              setIsBackupCode(!isBackupCode);
              setCode('');
              setError('');
            }}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors text-sm"
          >
            {isBackupCode ? 'Use Authenticator Code' : 'Use Backup Code'}
          </button>

          <button
            onClick={onCancel}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors border border-gray-300 dark:border-gray-600"
          >
            Cancel
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
          Lost your device? <span className="text-blue-600 dark:text-blue-400 font-medium">Use a backup code to sign in.</span>
        </p>
      </div>
    </div>
  );
}
