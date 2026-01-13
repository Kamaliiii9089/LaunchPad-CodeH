import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Date formatting utilities
export const formatDate = (date, options = {}) => {
  if (!date) return 'N/A'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
  
  return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options })
}

export const formatRelativeTime = (date) => {
  if (!date) return 'N/A'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now - dateObj) / 1000)
  
  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days !== 1 ? 's' : ''} ago`
  } else {
    return formatDate(dateObj, { year: 'numeric', month: 'short', day: 'numeric' })
  }
}

// Duration formatting
export const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return 'N/A'
  
  if (seconds < 60) {
    return `${seconds}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  } else {
    const hours = Math.floor(seconds / 3600)
    const remainingMinutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${remainingMinutes}m`
  }
}

// Number formatting utilities
export const formatNumber = (number, options = {}) => {
  if (typeof number !== 'number' || isNaN(number)) return '0'
  
  return new Intl.NumberFormat('en-US', options).format(number)
}

export const formatPercentage = (value, total) => {
  if (!total || total === 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

// Risk score utilities
export const getRiskLevel = (score) => {
  if (score >= 8) return 'Critical'
  if (score >= 6) return 'High'
  if (score >= 4) return 'Medium'
  if (score >= 2) return 'Low'
  return 'Minimal'
}

export const getRiskColor = (score) => {
  if (score >= 8) return 'danger'
  if (score >= 6) return 'warning'
  if (score >= 4) return 'yellow'
  if (score >= 2) return 'gray'
  return 'success'
}

// Severity utilities
export const getSeverityColor = (severity) => {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 'danger'
    case 'high':
      return 'warning'
    case 'medium':
      return 'yellow'
    case 'low':
      return 'gray'
    default:
      return 'gray'
  }
}

export const getSeverityIcon = (severity) => {
  switch (severity.toLowerCase()) {
    case 'critical':
      return '🚨'
    case 'high':
      return '⚠️'
    case 'medium':
      return '⚡'
    case 'low':
      return 'ℹ️'
    default:
      return 'ℹ️'
  }
}

// Status utilities
export const getStatusColor = (status) => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'success':
    case 'active':
      return 'success'
    case 'running':
    case 'scanning':
    case 'pending':
      return 'primary'
    case 'failed':
    case 'error':
    case 'cancelled':
      return 'danger'
    case 'inactive':
      return 'gray'
    default:
      return 'gray'
  }
}

// URL utilities
export const isValidUrl = (string) => {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

export const isValidDomain = (domain) => {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/
  return domainRegex.test(domain) && domain.includes('.')
}

export const extractDomain = (url) => {
  try {
    return new URL(url).hostname
  } catch (_) {
    return url
  }
}

// Array utilities
export const groupBy = (array, key) => {
  return array.reduce((groups, item) => {
    const group = item[key]
    groups[group] = groups[group] || []
    groups[group].push(item)
    return groups
  }, {})
}

export const sortBy = (array, key, direction = 'asc') => {
  return array.sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}

// Local storage utilities
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.error(`Error reading from localStorage: ${error}`)
      return defaultValue
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Error writing to localStorage: ${error}`)
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`Error removing from localStorage: ${error}`)
    }
  }
}

// Debounce utility
export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Copy to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return { success: true }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return { success: false, error: error.message }
  }
}

// File download utility
export const downloadFile = (data, filename, type = 'application/json') => {
  const blob = new Blob([data], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Plan utilities
export const getPlanLimits = (plan) => {
  const limits = {
    free: {
      domains: 1,
      scansPerMonth: 4,
      aiAnalysis: false,
      monitoring: false
    },
    basic: {
      domains: 5,
      scansPerMonth: 20,
      aiAnalysis: true,
      monitoring: false
    },
    premium: {
      domains: 20,
      scansPerMonth: 100,
      aiAnalysis: true,
      monitoring: true
    },
    enterprise: {
      domains: -1, // unlimited
      scansPerMonth: -1, // unlimited
      aiAnalysis: true,
      monitoring: true
    }
  }
  
  return limits[plan] || limits.free
}

export const canUpgrade = (currentPlan) => {
  const plans = ['free', 'basic', 'premium', 'enterprise']
  const currentIndex = plans.indexOf(currentPlan)
  return currentIndex < plans.length - 1
}
