import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { 
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  PlayIcon,
  StopIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  BugAntIcon,
  CpuChipIcon,
  EyeIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import Button from '../components/UI/Button'
import Card from '../components/UI/Card'
import Badge from '../components/UI/Badge'
import LoadingSpinner from '../components/UI/LoadingSpinner'
import { api } from '../utils/api'

const ScanDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [expandedSections, setExpandedSections] = useState({})
  const [currentTime, setCurrentTime] = useState(new Date())

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Fetch scan details
  const { data: scan, isLoading, error, refetch } = useQuery({
    queryKey: ['scan', id],
    queryFn: () => api.get(`/scans/${id}`).then(res => {
      console.log('Scan API response:', res.data)
      return res.data.data.scan
    }),
    enabled: !!id,
    refetchInterval: (data) => {
      // Refetch every 5 seconds if scan is still running
      return data?.status === 'running' || data?.status === 'pending' ? 5000 : false
    }
  })

  const getScanStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      running: 'info',
      completed: 'success',
      failed: 'error',
      cancelled: 'secondary'
    }
    const labels = {
      pending: 'Pending',
      running: 'Running',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled'
    }
    return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>
  }

  const getRiskLevelBadge = (level) => {
    const variants = {
      low: 'success',
      medium: 'warning',
      high: 'error',
      critical: 'error'
    }
    return <Badge variant={variants[level] || 'secondary'}>{level?.toUpperCase()}</Badge>
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleCancelScan = async () => {
    try {
      await api.post(`/scans/${id}/cancel`)
      toast.success('Scan cancelled successfully')
      refetch()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel scan')
    }
  }

  const formatDuration = (startTime, endTime) => {
    const start = new Date(startTime)
    // Only use current time for running/pending scans, otherwise use endTime
    const end = endTime ? new Date(endTime) : 
                (scan?.status === 'running' || scan?.status === 'pending') ? currentTime : new Date(startTime)
    const duration = Math.floor((end - start) / 1000) // seconds
    
    if (duration < 0) return '0s' // Handle edge case
    if (duration < 60) return `${duration}s`
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m ${Math.floor(duration % 60)}s`
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
        <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Scan</h3>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <Button onClick={() => navigate('/scans')}>Back to Scans</Button>
      </div>
    )
  }

  if (!scan) {
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Scan Not Found</h3>
        <p className="text-gray-600 mb-4">The requested scan could not be found.</p>
        <Button onClick={() => navigate('/scans')}>Back to Scans</Button>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: DocumentTextIcon },
    { id: 'subdomains', label: 'Subdomains', icon: GlobeAltIcon, count: scan.discoveredData?.subdomains?.length || 0 },
    { id: 'vulnerabilities', label: 'Vulnerabilities', icon: BugAntIcon, count: scan.vulnerabilities?.length || 0 },
    { id: 'analysis', label: 'AI Analysis', icon: CpuChipIcon },
    { id: 'tools', label: 'Tools & Logs', icon: EyeIcon }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/scans')}
            className="flex items-center"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Scans
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Scan Details
            </h1>
            <p className="text-gray-600">
              {scan.domainId?.domain || scan.domainId} • {scan.scanType} scan
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {getScanStatusBadge(scan.status)}
          {(scan.status === 'running' || scan.status === 'pending') && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelScan}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <StopIcon className="h-4 w-4 mr-2" />
              Cancel Scan
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Duration</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatDuration(scan.createdAt, scan.completedAt)}
              </p>
              {(scan.status === 'running' || scan.status === 'pending') && (
                <p className="text-xs text-blue-600 animate-pulse">● Live</p>
              )}
              {scan.status === 'completed' && (
                <p className="text-xs text-green-600">✓ Final</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <GlobeAltIcon className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Subdomains</p>
              <p className="text-lg font-semibold text-gray-900">
                {scan.discoveredData?.subdomains?.length || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BugAntIcon className="h-8 w-8 text-red-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Vulnerabilities</p>
              <p className="text-lg font-semibold text-gray-900">
                {scan.vulnerabilities?.length || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Risk Level</p>
              <div className="mt-1">
                {scan.aiAnalysis?.riskLevel ? 
                  getRiskLevelBadge(scan.aiAnalysis.riskLevel) :
                  <span className="text-sm text-gray-400">Not analyzed</span>
                }
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress Bar for Running Scans */}
      {(scan.status === 'running' || scan.status === 'pending') && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700">Scan Progress</span>
              <div className="ml-2 flex items-center">
                <div className="animate-pulse h-2 w-2 bg-blue-500 rounded-full mr-1"></div>
                <span className="text-xs text-blue-600">Live</span>
              </div>
            </div>
            <span className="text-sm text-gray-500">
              {scan.progress?.phase || 'Initializing...'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 animate-pulse"
              style={{ width: `${scan.progress?.percentage || 10}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">
              {scan.progress?.currentStep || 'Preparing scan environment...'}
            </p>
            <p className="text-xs text-gray-400">
              Running for {formatDuration(scan.createdAt, null)}
            </p>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* What This Scan Does */}
            <Card className="p-6 bg-blue-50 border-blue-200">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <CpuChipIcon className="h-6 w-6 text-blue-600 mt-1" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">
                    What This Scan Does
                  </h3>
                  <div className="text-sm text-blue-800 space-y-2">
                    <p>
                      <strong>🔍 Discovery Phase:</strong> Finds all subdomains (like api.{scan.domainId?.domain || 'domain.com'}, admin.{scan.domainId?.domain || 'domain.com'}) 
                      and discovers API endpoints and services running on each.
                    </p>
                    <p>
                      <strong>🛡️ Security Testing:</strong> Runs automated vulnerability scans using OWASP ZAP to detect 
                      common security issues like SQL injection, XSS, authentication bypasses, and API vulnerabilities.
                    </p>
                    <p>
                      <strong>🤖 AI Analysis:</strong> Uses Hugging Face LLaMA-2 AI to analyze findings, assess risk levels, 
                      and provide intelligent security recommendations tailored to your specific attack surface.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Scan Phases Timeline */}
            {(scan.status === 'running' || scan.status === 'completed') && (
              <Card className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Scan Phases</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      scan.status === 'completed' || (scan.progress?.phase && scan.progress.phase !== 'Discovery') 
                        ? 'bg-green-100 text-green-600' 
                        : scan.progress?.phase === 'Discovery' 
                        ? 'bg-blue-100 text-blue-600 animate-pulse' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      <GlobeAltIcon className="w-4 h-4" />
                    </div>
                    <div className="ml-4 flex-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        Phase 1: API Discovery
                        {scan.progress?.phase === 'Discovery' && <span className="ml-2 text-blue-600 animate-pulse">● Active</span>}
                      </h4>
                      <p className="text-xs text-gray-500">
                        Finding subdomains, endpoints, and services
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      scan.status === 'completed' || (scan.progress?.phase && scan.progress.phase === 'Vulnerability Analysis') 
                        ? 'bg-green-100 text-green-600' 
                        : scan.progress?.phase === 'Vulnerability Analysis' 
                        ? 'bg-blue-100 text-blue-600 animate-pulse' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      <BugAntIcon className="w-4 h-4" />
                    </div>
                    <div className="ml-4 flex-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        Phase 2: Vulnerability Scanning
                        {scan.progress?.phase === 'Vulnerability Analysis' && <span className="ml-2 text-blue-600 animate-pulse">● Active</span>}
                      </h4>
                      <p className="text-xs text-gray-500">
                        Testing for security vulnerabilities using OWASP ZAP
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      scan.status === 'completed' || (scan.progress?.phase && scan.progress.phase === 'AI Analysis') 
                        ? 'bg-green-100 text-green-600' 
                        : scan.progress?.phase === 'AI Analysis' 
                        ? 'bg-blue-100 text-blue-600 animate-pulse' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      <CpuChipIcon className="w-4 h-4" />
                    </div>
                    <div className="ml-4 flex-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        Phase 3: AI Risk Analysis
                        {scan.progress?.phase === 'AI Analysis' && <span className="ml-2 text-blue-600 animate-pulse">● Active</span>}
                      </h4>
                      <p className="text-xs text-gray-500">
                        Intelligent analysis and recommendations using LLaMA-2
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Basic Information */}
            <Card className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Scan Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Domain</dt>
                      <dd className="text-sm text-gray-900">{scan.domainId?.domain || scan.domainId}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Scan Type</dt>
                      <dd className="text-sm text-gray-900 capitalize">{scan.scanType}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Started At</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(scan.createdAt).toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd>{getScanStatusBadge(scan.status)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">AI Analysis</dt>
                      <dd className="text-sm text-gray-900">
                        {scan.enableAI ? 'Enabled' : 'Disabled'}
                      </dd>
                    </div>
                    {scan.completedAt && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Completed At</dt>
                        <dd className="text-sm text-gray-900">
                          {new Date(scan.completedAt).toLocaleString()}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </Card>

            {/* Error Information */}
            {scan.error && (
              <Card className="p-6 border-red-200 bg-red-50">
                <h3 className="text-lg font-medium text-red-900 mb-2">Scan Error</h3>
                <p className="text-sm text-red-700">{scan.error}</p>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'subdomains' && (
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Discovered Subdomains ({scan.discoveredData?.subdomains?.length || 0})
            </h3>
            {scan.discoveredData?.subdomains?.length > 0 ? (
              <div className="space-y-4">
                {scan.discoveredData.subdomains.map((subdomain, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{subdomain.domain}</h4>
                      <Badge variant={subdomain.isActive ? 'success' : 'secondary'}>
                        {subdomain.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {subdomain.endpoints && subdomain.endpoints.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">
                          Endpoints ({subdomain.endpoints.length}):
                        </p>
                        <div className="space-y-1">
                          {subdomain.endpoints.slice(0, 5).map((endpoint, idx) => (
                            <div key={idx} className="text-xs text-gray-600 font-mono bg-gray-100 p-1 rounded">
                              {endpoint.method} {endpoint.path}
                            </div>
                          ))}
                          {subdomain.endpoints.length > 5 && (
                            <p className="text-xs text-gray-500">
                              +{subdomain.endpoints.length - 5} more endpoints
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No subdomains discovered</p>
            )}
          </Card>
        )}

        {activeTab === 'vulnerabilities' && (
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Vulnerabilities ({scan.vulnerabilities?.length || 0})
            </h3>
            {scan.vulnerabilities?.length > 0 ? (
              <div className="space-y-4">
                {scan.vulnerabilities.map((vuln, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{vuln.name}</h4>
                      {getRiskLevelBadge(vuln.severity)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{vuln.description}</p>
                    {vuln.url && (
                      <p className="text-xs text-gray-500 font-mono bg-gray-100 p-2 rounded">
                        {vuln.url}
                      </p>
                    )}
                    {vuln.recommendation && (
                      <div className="mt-3 p-3 bg-blue-50 rounded">
                        <p className="text-sm font-medium text-blue-900">Recommendation:</p>
                        <p className="text-sm text-blue-700">{vuln.recommendation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No vulnerabilities found</p>
            )}
          </Card>
        )}

        {activeTab === 'analysis' && (
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">AI Analysis</h3>
            {scan.aiAnalysis ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Risk Level</p>
                    <div className="mt-2">
                      {getRiskLevelBadge(scan.aiAnalysis.riskLevel)}
                    </div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Risk Score</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {scan.aiAnalysis.riskScore || 'N/A'}
                    </p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Analysis Date</p>
                    <p className="text-sm text-gray-900 mt-2">
                      {scan.aiAnalysis.analyzedAt ? 
                        new Date(scan.aiAnalysis.analyzedAt).toLocaleString() : 
                        'N/A'
                      }
                    </p>
                  </div>
                </div>

                {scan.aiAnalysis.summary && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                      {scan.aiAnalysis.summary}
                    </p>
                  </div>
                )}

                {scan.aiAnalysis.recommendations && scan.aiAnalysis.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                    <ul className="space-y-2">
                      {scan.aiAnalysis.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span className="text-gray-700">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                {scan.enableAI ? 'AI analysis in progress...' : 'AI analysis was not enabled for this scan'}
              </p>
            )}
          </Card>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-6">
            {/* Tools Used */}
            <Card className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Tools Used</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scan.tools && Object.entries(scan.tools).map(([toolName, toolData]) => (
                  <div key={toolName} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 capitalize">{toolName}</h4>
                      <Badge variant={toolData.status === 'success' ? 'success' : 'error'}>
                        {toolData.status}
                      </Badge>
                    </div>
                    {toolData.version && (
                      <p className="text-xs text-gray-500">Version: {toolData.version}</p>
                    )}
                    {toolData.executionTime && (
                      <p className="text-xs text-gray-500">
                        Execution time: {toolData.executionTime}ms
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Raw Data */}
            {scan.rawData && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Raw Scan Data</h3>
                  <button
                    onClick={() => toggleSection('rawData')}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    {expandedSections.rawData ? (
                      <>
                        <ChevronDownIcon className="h-4 w-4 mr-1" />
                        Hide
                      </>
                    ) : (
                      <>
                        <ChevronRightIcon className="h-4 w-4 mr-1" />
                        Show
                      </>
                    )}
                  </button>
                </div>
                {expandedSections.rawData && (
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(scan.rawData, null, 2)}
                  </pre>
                )}
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ScanDetail
