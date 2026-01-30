'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
}

export default function Dashboard() {
  const { logout } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userStr || !token) {
      window.location.href = '/login';
      return;
    }

    setUser(JSON.parse(userStr));
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-20">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <button
            onClick={logout}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-bold mb-6">Welcome, {user?.name}!</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg">
              <div className="text-4xl font-bold mb-2">0</div>
              <p className="text-blue-100">Active Alerts</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg">
              <div className="text-4xl font-bold mb-2">0</div>
              <p className="text-green-100">Passwords Secure</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg">
              <div className="text-4xl font-bold mb-2">0</div>
              <p className="text-purple-100">Breaches Detected</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <h3 className="text-2xl font-bold mb-6">Account Information</h3>

          <div className="space-y-4">
            <div>
              <label className="text-gray-600 font-semibold">Name</label>
              <p className="text-lg text-gray-800">{user?.name}</p>
            </div>

            <div>
              <label className="text-gray-600 font-semibold">Email</label>
              <p className="text-lg text-gray-800">{user?.email}</p>
            </div>

            <div>
              <label className="text-gray-600 font-semibold">Member Since</label>
              <p className="text-lg text-gray-800">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t">
            <Link href="/" className="text-blue-600 hover:text-blue-700 font-semibold">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
