import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 600000, // 10 minutes for comprehensive email scanning
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  getGoogleAuthUrl: () => api.get('/auth/google/url'),
  getGoogleReauthUrl: () => api.get('/auth/google/reauth-url'),
  googleCallback: (code) => api.post('/auth/google/callback', { code }),
  manualLogin: (email, password) => api.post('/auth/login', { email, password }),
  manualRegister: (name, email, password) => api.post('/auth/register', { name, email, password }),
  getProfile: () => api.get('/auth/profile'),
  updatePreferences: (preferences) => api.patch('/auth/preferences', preferences),
  logout: () => api.post('/auth/logout'),
  revokeGmailAccess: () => api.post('/auth/revoke-gmail'),
  revokeGmailAccess: () => api.post('/auth/revoke-gmail'),
  revokeAccess: () => api.delete('/auth/revoke'),
  // 2FA
  setup2FA: () => api.post('/auth/2fa/setup'),
  verify2FA: (token) => api.post('/auth/2fa/verify', { token }),
  disable2FA: (token) => api.post('/auth/2fa/disable', { token }),
  validate2FA: (data) => api.post('/auth/2fa/validate', data),
  regenerateRecoveryCodes: (token) => api.post('/auth/2fa/regenerate-recovery-codes', { token }),
  getRecoveryCodesStatus: () => api.get('/auth/2fa/recovery-codes-status'),
};

// Dashboard API
export const dashboardAPI = {
  getOverview: () => api.get('/dashboard/overview'),
  getSubscriptions: (params) => api.get('/dashboard/subscriptions', { params }),
  getSubscriptionDetails: (id) => api.get(`/dashboard/subscriptions/${id}`),
  getActivity: (params) => api.get('/dashboard/activity', { params }),
  getAnalytics: (params) => api.get('/dashboard/analytics', { params }),
};

// Email API
export const emailAPI = {
  scanEmails: (data) => api.post('/emails/scan', data),
  getScanStatus: () => api.get('/emails/scan/status'),
  getRecentEmails: (params) => api.get('/emails/recent', { params }),
  getEmailDetails: (messageId) => api.get(`/emails/${messageId}`),
  reprocessEmail: (messageId) => api.post(`/emails/${messageId}/reprocess`),
  archiveEmail: (messageId) => api.patch(`/emails/${messageId}/archive`),
  getCategorySummary: () => api.get('/emails/categories/summary'),
};

// Subscription API
export const subscriptionAPI = {
  getOverview: () => api.get('/dashboard/overview'), // Add overview endpoint
  getSubscriptions: (params) => api.get('/subscriptions', { params }),
  getSubscription: (id) => api.get(`/subscriptions/${id}`),
  revokeSubscription: (id) => api.patch(`/subscriptions/${id}/revoke`),
  grantSubscription: (id) => api.patch(`/subscriptions/${id}/grant`),
  updateSubscription: (id, data) => api.patch(`/subscriptions/${id}`, data),
  deleteSubscription: (id) => api.delete(`/subscriptions/${id}`),
  bulkOperation: (data) => api.post('/subscriptions/bulk', data),
  getStats: () => api.get('/subscriptions/stats/summary'),
  searchSubscriptions: (query) => api.get(`/subscriptions/search/${query}`),
};

// Notification API
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Breach Check API
export const breachCheckAPI = {
  getStatus: () => api.get('/breach-check/status'),
  runCheck: (data) => api.post('/breach-check/run', data),
  getHistory: (params) => api.get('/breach-check/history', { params }),
  getDetails: (subscriptionId) => api.get(`/breach-check/details/${subscriptionId}`),
  updateActions: (subscriptionId, data) => api.patch(`/breach-check/actions/${subscriptionId}`, data),
};

// Admin API
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUserRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

export default api;
