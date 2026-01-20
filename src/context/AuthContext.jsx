import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import i18n from 'i18next';
import { authAPI } from '../utils/api';

const AuthContext = createContext();

export { AuthContext };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const initializeAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);

          // Verify token is still valid by fetching fresh profile data
          const response = await authAPI.getProfile();
          const freshUser = response.data.user;
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));

          // Apply language preference
          if (freshUser.preferences?.language) {
            i18n.changeLanguage(freshUser.preferences.language);
          }
        } catch (error) {
          console.error('Token validation failed:', error);
          // Token might be invalid, clear local storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      // Clear potentially corrupted data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setError('Failed to initialize authentication');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Apply Theme (Light/Dark Mode)
  useEffect(() => {
    if (user?.preferences?.theme) {
      const { theme } = user.preferences;
      const root = document.documentElement;

      if (theme === 'dark') {
        root.classList.add('dark-mode');
        root.classList.remove('light-mode');
        root.setAttribute('data-theme', 'dark'); // Use dark theme
      } else {
        root.classList.add('light-mode');
        root.classList.remove('dark-mode');
        root.setAttribute('data-theme', 'light'); // Use light theme
      }
    } else {
      // Default to light mode if no preference
      const root = document.documentElement;
      root.classList.add('light-mode');
      root.classList.remove('dark-mode');
      root.setAttribute('data-theme', 'light');
    }
  }, [user?.preferences?.theme]);

  const login = useCallback(async (code) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authAPI.googleCallback(code);

      if (response.data.requires2FA) {
        return {
          success: false,
          requires2FA: true,
          tempToken: response.data.tempToken
        };
      }

      const { token, user: userData } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Login failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const manualLogin = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authAPI.manualLogin(email, password);

      if (response.data.requires2FA) {
        return {
          success: false,
          requires2FA: true,
          tempToken: response.data.tempToken
        };
      }

      const { token, user: userData } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return { success: true };
    } catch (error) {
      console.error('Manual login error:', error);
      const message = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Login failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const manualSignup = useCallback(async (name, email, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authAPI.manualRegister(name, email, password);

      const { token, user: userData } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return { success: true };
    } catch (error) {
      console.error('Manual signup error:', error);
      const message = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Signup failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);

      // Call backend logout endpoint
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state regardless of API call result
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, []);

  const updatePreferences = useCallback(async (preferences) => {
    try {
      const response = await authAPI.updatePreferences(preferences);
      const updatedUser = { ...user, preferences: response.data.preferences };
      updateUser(updatedUser);

      // Apply language preference
      if (response.data.preferences?.language) {
        i18n.changeLanguage(response.data.preferences.language);
      }

      return { success: true };
    } catch (error) {
      console.error('Update preferences error:', error);
      const message = error.response?.data?.message || 'Failed to update preferences';
      setError(message);
      return { success: false, error: message };
    }
  }, [user, updateUser]);

  const revokeAccess = useCallback(async () => {
    try {
      setLoading(true);
      await authAPI.revokeAccess();

      // Clear everything after successful revocation
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);

      return { success: true };
    } catch (error) {
      console.error('Revoke access error:', error);
      const message = error.response?.data?.message || 'Failed to revoke access';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isAuthenticated = useCallback(() => {
    return !!user && !!localStorage.getItem('token');
  }, [user]);

  const getAuthUrl = useCallback(async () => {
    try {
      const response = await authAPI.getGoogleAuthUrl();
      return response.data.authUrl;
    } catch (error) {
      console.error('Get auth URL error:', error);
      throw new Error('Failed to get authentication URL');
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    login,
    manualLogin,
    manualSignup,
    logout,
    updateUser,
    updatePreferences,
    revokeAccess,
    clearError,
    isAuthenticated,
    getAuthUrl,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
