'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';
import Link from 'next/link';
import TwoFactorVerify from '@/components/TwoFactorVerify';
import { generateDeviceFingerprint } from '@/lib/deviceSecurity';

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [checking, setChecking] = useState(true);
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId, setUserId] = useState('');

  // Check if already logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Already logged in, go to dashboard
      window.location.href = '/dashboard';
    } else {
      setChecking(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    try {
      // Generate device fingerprint for enhanced security
      const deviceFingerprint = generateDeviceFingerprint();
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password,
          deviceFingerprint,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Check if 2FA is required
      if (data.requires2FA) {
        setRequires2FA(true);
        setUserId(data.userId);
        
        // Show device warnings if any
        if (data.deviceInfo?.isNewDevice) {
          console.log('New device detected:', data.deviceInfo);
        }
        if (data.deviceInfo?.suspiciousFlags?.length > 0) {
          console.warn('Suspicious device flags:', data.deviceInfo.suspiciousFlags);
        }
      } else {
        // Normal login without 2FA
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Show device information
        if (data.deviceInfo?.isNewDevice) {
          console.log('Login from new device:', data.deviceInfo);
        }
        
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  const handle2FASuccess = (token: string, user: any) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    window.location.href = '/dashboard';
  };

  const handle2FACancel = () => {
    setRequires2FA(false);
    setUserId('');
    setPassword('');
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      {requires2FA && (
        <TwoFactorVerify
          userId={userId}
          onSuccess={handle2FASuccess}
          onCancel={handle2FACancel}
        />
      )}

      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-8">Welcome Back</h1>

        {(error || localError) && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error || localError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>
            <a href="#" className="text-sm text-blue-600 hover:text-blue-700">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          Don't have an account?{" "}
          <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-semibold">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
