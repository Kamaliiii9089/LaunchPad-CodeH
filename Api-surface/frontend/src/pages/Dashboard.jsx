import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  GlobeAltIcon, 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline'
import Card, { CardContent } from '../components/UI/Card'
import Badge, { SeverityBadge, StatusBadge } from '../components/UI/Badge'
import LoadingSpinner from '../components/UI/LoadingSpinner'
import api from '../utils/api'
import { formatDate, formatNumber } from '../utils/helpers'

const Dashboard = () => {
  
  const { data: scanStats, isLoading: statsLoading } = useQuery({
    queryKey: ['scanStats'],
    queryFn: async () => {
      const response = await api.getScanStats()
      return response.data.data.stats
    }
  })

  const { data: domains, isLoading: domainsLoading } = useQuery({
    queryKey: ['domains', { limit: 5 }],
    queryFn: async () => {
      const response = await api.getDomains({ limit: 5 })
      return response.data.data.domains
    }
  })

  const { data: recentScans, isLoading: scansLoading } = useQuery({
    queryKey: ['scans', { limit: 5 }],
    queryFn: async () => {
      const response = await api.getScans({ limit: 5 })
      return response.data.data.scans
    }
  })

  const statsCards = [
    {
      title: 'Total Scans',
      value: scanStats?.totalScans || 0,
      icon: ShieldCheckIcon,
      color: 'primary'
    },
    {
      title: 'Vulnerabilities Found',
      value: scanStats?.totalVulnerabilities || 0,
      icon: ExclamationTriangleIcon,
      color: 'warning'
    },
    {
      title: 'Critical Issues',
      value: scanStats?.criticalVulnerabilities || 0,
      icon: ExclamationTriangleIcon,
      color: 'danger'
    },
    {
      title: 'Domains Monitored',
      value: domains?.length || 0,
      icon: GlobeAltIcon,
      color: 'success'
    }
  ]

  if (statsLoading || domainsLoading || scansLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-sm p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome to API Attack Surface Mapper! 👋</h1>
        <p className="mt-2 text-primary-100">
          Monitor your API security posture and discover vulnerabilities across your infrastructure.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatNumber(stat.value)}
                  </p>
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Domains */}
        <Card title="Recent Domains" description="Your monitored domains">
          <CardContent>
            {domains && domains.length > 0 ? (
              <div className="space-y-4">
                {domains.map((domain) => (
                  <div key={domain._id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {domain.displayName || domain.domain}
                        </p>
                        <p className="text-xs text-gray-500">
                          {domain.statistics?.totalEndpoints || 0} endpoints
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusBadge status={domain.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <GlobeAltIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No domains</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding your first domain to scan.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Scans */}
        <Card title="Recent Scans" description="Latest security scans">
          <CardContent>
            {recentScans && recentScans.length > 0 ? (
              <div className="space-y-4">
                {recentScans.map((scan) => (
                  <div key={scan._id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {scan.domainId?.domain || 'Unknown Domain'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(scan.createdAt)} • {scan.scanType}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusBadge status={scan.status} />
                      {scan.results?.vulnerabilitiesFound > 0 && (
                        <span className="text-xs text-gray-500">
                          {scan.results.vulnerabilitiesFound} issues
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No scans yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Run your first security scan to see results here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/domains"
              className="flex items-center p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
            >
              <GlobeAltIcon className="h-6 w-6 text-primary-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">Add Domain</h3>
                <p className="text-xs text-gray-500">Monitor a new domain</p>
              </div>
            </a>
            
            <a
              href="/scans"
              className="flex items-center p-4 bg-success-50 rounded-lg hover:bg-success-100 transition-colors"
            >
              <ShieldCheckIcon className="h-6 w-6 text-success-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">Start Scan</h3>
                <p className="text-xs text-gray-500">Run security scan</p>
              </div>
            </a>
            
            <a
              href="/reports"
              className="flex items-center p-4 bg-warning-50 rounded-lg hover:bg-warning-100 transition-colors"
            >
              <ChartBarIcon className="h-6 w-6 text-warning-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">View Reports</h3>
                <p className="text-xs text-gray-500">Security insights</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard
