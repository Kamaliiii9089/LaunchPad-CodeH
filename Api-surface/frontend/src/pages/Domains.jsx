import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { 
  PlusIcon, 
  GlobeAltIcon, 
  TrashIcon, 
  PencilIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import Button from '../components/UI/Button'
import Card from '../components/UI/Card'
import Badge from '../components/UI/Badge'
import LoadingSpinner from '../components/UI/LoadingSpinner'
import { api } from '../utils/api'

const Domains = () => {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Fetch domains
  const { data: domainsData = {}, isLoading, error } = useQuery({
    queryKey: ['domains'],
    queryFn: () => api.get('/domains').then(res => res.data.data)
  })

  const domains = domainsData.domains || []

  // Add domain mutation
  const addDomainMutation = useMutation({
    mutationFn: (domainData) => api.post('/domains', domainData),
    onSuccess: () => {
      queryClient.invalidateQueries(['domains'])
      setShowAddModal(false)
      toast.success('Domain added successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add domain')
    }
  })

  // Delete domain mutation
  const deleteDomainMutation = useMutation({
    mutationFn: (domainId) => api.delete(`/domains/${domainId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['domains'])
      toast.success('Domain deleted successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete domain')
    }
  })

  // Update domain mutation
  const updateDomainMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/domains/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['domains'])
      setShowEditModal(false)
      setSelectedDomain(null)
      toast.success('Domain updated successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update domain')
    }
  })

  const handleAddDomain = (domainData) => {
    addDomainMutation.mutate(domainData)
  }

  const handleEditDomain = (domain) => {
    setSelectedDomain(domain)
    setShowEditModal(true)
  }

  const handleUpdateDomain = (domainData) => {
    updateDomainMutation.mutate({
      id: selectedDomain._id,
      data: domainData
    })
  }

  const handleDeleteDomain = (domainId) => {
    if (window.confirm('Are you sure you want to delete this domain?')) {
      deleteDomainMutation.mutate(domainId)
    }
  }

  const getDomainStatusBadge = (status) => {
    const variants = {
      active: 'success',
      inactive: 'secondary',
      error: 'error',
      scanning: 'warning'
    }
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>
  }

  const getRiskLevelBadge = (riskLevel) => {
    const variants = {
      low: 'success',
      medium: 'warning', 
      high: 'error',
      critical: 'error'
    }
    return <Badge variant={variants[riskLevel] || 'secondary'}>{riskLevel}</Badge>
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Domains</h3>
        <p className="text-gray-600">{error.response?.data?.message || 'Failed to load domains'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Domains</h1>
          <p className="text-gray-600">Manage your monitored domains and their security status</p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          icon={<PlusIcon className="h-4 w-4" />}
        >
          Add Domain
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center">
            <GlobeAltIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Domains</p>
              <p className="text-2xl font-bold text-gray-900">{domains.length}</p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {domains.filter(d => d?.status === 'active').length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monitoring</p>
              <p className="text-2xl font-bold text-gray-900">
                {domains.filter(d => d?.monitoringEnabled || d?.monitoringSettings?.enabled).length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">High Risk</p>
              <p className="text-2xl font-bold text-gray-900">
                {domains.filter(d => d?.riskLevel === 'high' || d?.riskLevel === 'critical').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Domains List */}
      {domains.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <GlobeAltIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Domains Added</h3>
            <p className="text-gray-600 mb-6">Get started by adding your first domain to monitor</p>
            <Button 
              onClick={() => setShowAddModal(true)}
              icon={<PlusIcon className="h-4 w-4" />}
            >
              Add Your First Domain
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="px-4 py-5 sm:p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Domain
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Scan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subdomains
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {domains.map((domain) => (
                    <tr key={domain._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {domain?.domain || domain?.displayName || 'Unknown Domain'}
                            </div>
                            {domain?.description && (
                              <div className="text-sm text-gray-500">{domain.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getDomainStatusBadge(domain?.status || 'inactive')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {domain?.riskLevel ? getRiskLevelBadge(domain.riskLevel) : (
                          <Badge variant="secondary">Not scanned</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {domain?.lastScannedAt ? 
                          new Date(domain.lastScannedAt).toLocaleDateString() : 
                          'Never'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {domain?.subdomainCount || domain?.subdomains?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => navigate(`/domains/${domain._id}`)}
                            className="text-blue-600 hover:text-blue-800"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditDomain(domain)}
                            className="text-yellow-600 hover:text-yellow-800"
                            title="Edit Domain"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDomain(domain._id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete Domain"
                            disabled={deleteDomainMutation.isLoading}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Add Domain Modal */}
      {showAddModal && (
        <AddDomainModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddDomain}
          isLoading={addDomainMutation.isLoading}
        />
      )}

      {/* Edit Domain Modal */}
      {showEditModal && selectedDomain && (
        <EditDomainModal
          domain={selectedDomain}
          onClose={() => {
            setShowEditModal(false)
            setSelectedDomain(null)
          }}
          onSubmit={handleUpdateDomain}
          isLoading={updateDomainMutation.isLoading}
        />
      )}
    </div>
  )
}

// Add Domain Modal Component
const AddDomainModal = ({ onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    domain: '',
    description: '',
    monitoringEnabled: true,
    scanFrequency: 'weekly'
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Add New Domain</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Domain *
              </label>
              <input
                type="text"
                name="domain"
                value={formData.domain}
                onChange={handleChange}
                placeholder="example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Optional description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scan Frequency
              </label>
              <select
                name="scanFrequency"
                value={formData.scanFrequency}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                name="monitoringEnabled"
                checked={formData.monitoringEnabled}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Enable monitoring
              </label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Domain'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Domain Modal Component
const EditDomainModal = ({ domain, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    domain: domain.domain || '',
    description: domain.description || '',
    monitoringEnabled: domain.monitoringEnabled ?? true,
    scanFrequency: domain.scanFrequency || 'weekly'
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Edit Domain</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Domain *
              </label>
              <input
                type="text"
                name="domain"
                value={formData.domain}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scan Frequency
              </label>
              <select
                name="scanFrequency"
                value={formData.scanFrequency}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                name="monitoringEnabled"
                checked={formData.monitoringEnabled}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Enable monitoring
              </label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Domain'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Domains
