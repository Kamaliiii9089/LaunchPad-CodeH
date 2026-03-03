'use client';

import { useState, useEffect } from 'react';

interface Framework {
  _id: string;
  name: string;
  code: string;
  category: string;
  overallComplianceScore: number;
  requirementsMet: number;
  requirementsPending: number;
  requirementsFailed: number;
  requirements: { total: number };
  status: string;
  lastAssessmentDate?: string;
}

interface DashboardStats {
  frameworks: {
    total: number;
    compliant: number;
    partial: number;
    critical: number;
    averageScore: number;
  };
  requirements: {
    total: number;
    compliant: number;
    pending: number;
    failed: number;
  };
  controls: {
    total: number;
    implemented: number;
    effective: number;
    needsAttention: number;
  };
  recentActivity: {
    assessments: number;
    controlTests: number;
    gapsIdentified: number;
    reportsGenerated: number;
  };
}

export default function ComplianceDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');

      // Fetch statistics
      const statsRes = await fetch('/api/compliance/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
      }

      // Fetch frameworks
      const frameworksRes = await fetch('/api/compliance/frameworks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const frameworksData = await frameworksRes.json();
      if (frameworksData.success) {
        setFrameworks(frameworksData.frameworks);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplianceBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-50 border-green-200';
    if (score >= 75) return 'bg-blue-50 border-blue-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getFrameworkIcon = (code: string) => {
    const icons: any = {
      GDPR: '🇪🇺',
      HIPAA: '🏥',
      PCI_DSS: '💳',
      SOC2: '📊',
      ISO27001: '🔒',
      CCPA: '🇺🇸',
      NIST: '🛡️',
    };
    return icons[code] || '📋';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Average Compliance</p>
                <h3 className={`text-3xl font-bold ${getComplianceColor(stats.frameworks.averageScore)}`}>
                  {Math.round(stats.frameworks.averageScore)}%
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.frameworks.total} frameworks
                </p>
              </div>
              <div className="text-4xl">📈</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Requirements</p>
                <h3 className="text-3xl font-bold text-gray-900">
                  {stats.requirements.compliant}/{stats.requirements.total}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.requirements.pending} pending
                </p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Controls</p>
                <h3 className="text-3xl font-bold text-gray-900">
                  {stats.controls.effective}/{stats.controls.total}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.controls.needsAttention} need attention
                </p>
              </div>
              <div className="text-4xl">🛡️</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Recent Activity</p>
                <h3 className="text-3xl font-bold text-gray-900">
                  {stats.recentActivity.assessments + stats.recentActivity.controlTests}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Last 30 days
                </p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </div>
        </div>
      )}

      {/* Frameworks Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Compliance Frameworks</h2>
          <p className="text-sm text-gray-600 mt-1">Monitor and track regulatory compliance status</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {frameworks.map((framework) => (
              <div
                key={framework._id}
                onClick={() => setSelectedFramework(framework)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${getComplianceBgColor(framework.overallComplianceScore)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{getFrameworkIcon(framework.code)}</span>
                    <div>
                      <h3 className="font-bold text-gray-900">{framework.code}</h3>
                      <p className="text-xs text-gray-600">{framework.name}</p>
                    </div>
                  </div>
                  <span className={`text-2xl font-bold ${getComplianceColor(framework.overallComplianceScore)}`}>
                    {framework.overallComplianceScore}%
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Requirements</span>
                    <span className="font-medium">{framework.requirements?.total || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600">✓ Met</span>
                    <span className="font-medium">{framework.requirementsMet}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-yellow-600">⏳ Pending</span>
                    <span className="font-medium">{framework.requirementsPending}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-red-600">✗ Failed</span>
                    <span className="font-medium">{framework.requirementsFailed}</span>
                  </div>
                </div>

                {framework.lastAssessmentDate && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Last assessed: {new Date(framework.lastAssessmentDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {frameworks.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No compliance frameworks configured yet.</p>
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Add Framework
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Framework Details Modal */}
      {selectedFramework && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{getFrameworkIcon(selectedFramework.code)}</span>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedFramework.code}</h2>
                    <p className="text-sm text-gray-600">{selectedFramework.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFramework(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-center">
                <div className="relative">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke={selectedFramework.overallComplianceScore >= 90 ? '#10b981' : selectedFramework.overallComplianceScore >= 75 ? '#3b82f6' : selectedFramework.overallComplianceScore >= 60 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${(selectedFramework.overallComplianceScore / 100) * 352} 352`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-bold ${getComplianceColor(selectedFramework.overallComplianceScore)}`}>
                      {selectedFramework.overallComplianceScore}%
                    </span>
                    <span className="text-xs text-gray-500">Compliant</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{selectedFramework.requirementsMet}</p>
                  <p className="text-xs text-gray-600">Met</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{selectedFramework.requirementsPending}</p>
                  <p className="text-xs text-gray-600">Pending</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{selectedFramework.requirementsFailed}</p>
                  <p className="text-xs text-gray-600">Failed</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Category</span>
                  <span className="font-medium capitalize">{selectedFramework.category}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Status</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    selectedFramework.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedFramework.status}
                  </span>
                </div>
                {selectedFramework.lastAssessmentDate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Last Assessment</span>
                    <span className="font-medium">
                      {new Date(selectedFramework.lastAssessmentDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200 flex gap-2">
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  View Details
                </button>
                <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
