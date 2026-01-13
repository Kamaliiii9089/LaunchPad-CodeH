import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

class ApiClient {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor to handle common errors
    this.client.interceptors.response.use(
      (response) => {
        return response
      },
      (error) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('token')
          window.location.href = '/login'
        } else if (error.response?.status === 402) {
          // Payment required - plan limits exceeded
          console.warn('Plan limits exceeded:', error.response.data.message)
        } else if (error.response?.status >= 500) {
          // Server error
          console.error('Server error:', error.response.data.message)
        }
        return Promise.reject(error)
      }
    )
  }

  setAuthToken(token) {
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete this.client.defaults.headers.common['Authorization']
    }
  }

  removeAuthToken() {
    delete this.client.defaults.headers.common['Authorization']
  }

  // Generic HTTP methods
  async get(url, config = {}) {
    return this.client.get(url, config)
  }

  async post(url, data = {}, config = {}) {
    return this.client.post(url, data, config)
  }

  async put(url, data = {}, config = {}) {
    return this.client.put(url, data, config)
  }

  async delete(url, config = {}) {
    return this.client.delete(url, config)
  }

  // Auth endpoints
  async login(email, password) {
    return this.post('/auth/login', { email, password })
  }

  async register(userData) {
    return this.post('/auth/register', userData)
  }

  async getProfile() {
    return this.get('/auth/profile')
  }

  async updateProfile(updates) {
    return this.put('/auth/profile', updates)
  }

  async changePassword(currentPassword, newPassword) {
    return this.put('/auth/change-password', { currentPassword, newPassword })
  }

  // Domain endpoints
  async getDomains(params = {}) {
    return this.get('/domains', { params })
  }

  async getDomain(id) {
    return this.get(`/domains/${id}`)
  }

  async createDomain(domainData) {
    return this.post('/domains', domainData)
  }

  async updateDomain(id, updates) {
    return this.put(`/domains/${id}`, updates)
  }

  async deleteDomain(id) {
    return this.delete(`/domains/${id}`)
  }

  async getDomainStats(id) {
    return this.get(`/domains/${id}/stats`)
  }

  async getDomainEndpoints(id, params = {}) {
    return this.get(`/domains/${id}/endpoints`, { params })
  }

  // Scan endpoints
  async getScans(params = {}) {
    return this.get('/scans', { params })
  }

  async getScan(id) {
    return this.get(`/scans/${id}`)
  }

  async startScan(scanData) {
    return this.post('/scans/start', scanData)
  }

  async cancelScan(id) {
    return this.post(`/scans/${id}/cancel`)
  }

  async getScanStats() {
    return this.get('/scans/stats/overview')
  }

  // Report endpoints
  async getScanReport(scanId, format = 'json') {
    return this.get(`/reports/scan/${scanId}`, { params: { format } })
  }

  async getDomainReport(domainId, format = 'json', includeScans = 5) {
    return this.get(`/reports/domain/${domainId}`, { 
      params: { format, includeScans } 
    })
  }

  async getExecutiveSummary(format = 'json', period = 'month') {
    return this.get('/reports/executive-summary', { 
      params: { format, period } 
    })
  }

  async getVulnerabilityTrends(domainId = null, days = 30) {
    return this.get('/reports/trends/vulnerabilities', {
      params: { domainId, days }
    })
  }

  // Utility methods
  async downloadReport(url, filename) {
    try {
      const response = await this.get(url, { responseType: 'blob' })
      
      // Create blob link to download
      const blob = new Blob([response.data])
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
      
      return { success: true }
    } catch (error) {
      console.error('Download failed:', error)
      return { success: false, error: error.message }
    }
  }

  // Health check
  async healthCheck() {
    return this.get('/health')
  }
}

const api = new ApiClient()
export { api }
export default api
