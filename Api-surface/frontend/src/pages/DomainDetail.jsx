import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { 
  ArrowLeftIcon,
  GlobeAltIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PlayIcon
} from '@heroicons/react/24/outline'
import Button from '../components/UI/Button'
import Card from '../components/UI/Card'
import Badge from '../components/UI/Badge'
import LoadingSpinner from '../components/UI/LoadingSpinner'
import { api } from '../utils/api'

const DomainDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  // Fetch domain details
  const { data: domain, isLoading, error } = useQuery({
    queryKey: ['domain', id],
    queryFn: () => api.get(`/domains/${id}`).then(res => {
      console.log('Domain API response:', res.data)
      return res.data.data
    }),
    enabled: !!id
  })

  // Add debugging
  console.log('Domain object:', domain)
  console.log('Domain type:', typeof domain)

  // Fetch domain scans
  const { data: scansData = [] } = useQuery({
    queryKey: ['domain-scans', id],
    queryFn: () => api.get(`/scans?domainId=${id}`).then(res => {
      console.log('Scans API response:', res.data)
      // The API returns { success: true, data: { scans: [], pagination: {} } }
      return res.data.data.scans || []
    }),
    enabled: !!id
  })

  // Ensure scans is always an array
  const scans = Array.isArray(scansData) ? scansData : []

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

  const handleStartScan = async () => {
    try {
      await api.post('/scans/start', { 
        domainId: id,
        scanType: 'full',  // Default to full scan
        enableAI: true     // Enable AI analysis (now available in development plan)
      })
      toast.success('Scan started successfully!')
    } catch (error) {
      console.error('Scan start error:', error.response?.data)
      toast.error(error.response?.data?.message || 'Failed to start scan')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (error || !domain) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Domain Not Found</h3>
        <p className="text-gray-600 mb-6">The requested domain could not be found or there was an error loading it.</p>
        <Button onClick={() => navigate('/domains')}>
          Back to Domains
        </Button>
      </div>
    )
  }

  // Additional type check to ensure domain is an object and not something else
  if (typeof domain !== 'object' || domain === null) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Invalid Domain Data</h3>
        <p className="text-gray-600 mb-6">The domain data is not in the expected format.</p>
        <Button onClick={() => navigate('/domains')}>
          Back to Domains
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline"
            onClick={() => navigate('/domains')}
            icon={<ArrowLeftIcon className="h-4 w-4" />}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {typeof domain?.domain === 'string' ? domain.domain : 
               typeof domain?.displayName === 'string' ? domain.displayName : 
               'Unknown Domain'}
            </h1>
            {domain?.description && typeof domain.description === 'string' && (
              <p className="text-gray-600">{domain.description}</p>
            )}
          </div>
        </div>
        <Button 
          onClick={handleStartScan}
          icon={<PlayIcon className="h-4 w-4" />}
        >
          Start Scan
        </Button>
      </div>

      {/* Domain Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center">
            <GlobeAltIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Status</p>
              <div className="mt-1">{getDomainStatusBadge(domain?.status || 'inactive')}</div>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Risk Level</p>
              <div className="mt-1">
                {domain?.riskLevel ? getRiskLevelBadge(domain.riskLevel) : (
                  <Badge variant="secondary">Not scanned</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Subdomains</p>
              <p className="text-2xl font-bold text-gray-900">{domain?.subdomainCount || domain?.subdomains?.length || 0}</p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Last Scan</p>
              <p className="text-sm text-gray-900">
                {domain?.lastScannedAt ? 
                  new Date(domain.lastScannedAt).toLocaleDateString() : 
                  'Never'
                }
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Domain Configuration */}
      <Card>
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Monitoring</p>
              <p className="text-sm text-gray-900">
                {domain?.monitoringEnabled || domain?.monitoringSettings?.enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Scan Frequency</p>
              <p className="text-sm text-gray-900 capitalize">
                {domain?.scanFrequency || domain?.monitoringSettings?.frequency || 'Weekly'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Added Date</p>
              <p className="text-sm text-gray-900">
                {domain?.createdAt ? new Date(domain.createdAt).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Scans</p>
              <p className="text-sm text-gray-900">{scans?.length || 0}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Scans */}
      <Card>
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Scans</h3>
          {scans.length === 0 ? (
            <div className="text-center py-8">
              <ClockIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-gray-600">No scans performed yet</p>
              <Button 
                onClick={handleStartScan}
                className="mt-4"
                icon={<PlayIcon className="h-4 w-4" />}
              >
                Run First Scan
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vulnerabilities
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {scans.slice(0, 5).map((scan) => (
                    <tr key={scan._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(scan.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={scan.status === 'completed' ? 'success' : 'warning'}>
                          {scan.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {scan.vulnerabilityCount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/scans/${scan._id}`)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default DomainDetail
