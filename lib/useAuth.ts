import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface AuthResponse {
  success: boolean;
  data?: {
    token: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
  message?: string;
}

export function useAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signup = async (name: string, email: string, password: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data: AuthResponse = await response.json();

      if (!response.ok) {
        setError(data.message || 'Signup failed');
        setLoading(false);
        return false;
      }

      // Store token in both localStorage and cookies
      if (data.data?.token) {
        const token = data.data.token;
        const user = data.data.user;
        
        // Store in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Store in cookie with 7-day expiration
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);
        document.cookie = `token=${token}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax`;
        
        // Force page reload to dashboard
        window.location.href = '/dashboard';
        return true;
      }

      setLoading(false);
      return false;
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data: AuthResponse = await response.json();

      if (!response.ok) {
        setError(data.message || 'Login failed');
        setLoading(false);
        return false;
      }

      // Store token in both localStorage and cookies
      if (data.data?.token) {
        const token = data.data.token;
        const user = data.data.user;
        
        // Store in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Store in cookie with 7-day expiration
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);
        document.cookie = `token=${token}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax`;
        
        // Force page reload to dashboard
        window.location.href = '/dashboard';
        return true;
      }

      setLoading(false);
      return false;
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Clear cookie
    document.cookie = 'token=; path=/; max-age=0';
    window.location.href = '/login';
  };

  return { signup, login, logout, loading, error };
}
