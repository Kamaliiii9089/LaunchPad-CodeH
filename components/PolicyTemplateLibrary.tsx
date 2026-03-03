'use client';

import { useState, useEffect } from 'react';

interface PolicyTemplate {
  _id: string;
  name: string;
  description: string;
  category: string;
  standard?: string;
  enforcementLevel: 'mandatory' | 'recommended' | 'optional';
  targetAudience: string;
  estimatedReadTime: number;
  usageCount: number;
  popularityScore: number;
  tags: string[];
}

export default function PolicyTemplateLibrary() {
  const [templates, setTemplates] = useState<PolicyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<PolicyTemplate | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [categoryFilter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      params.append('active', 'true');

      const response = await fetch(`/api/policies/templates?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch templates');

      const data = await response.json();
      setTemplates(data.templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security': return '🔒';
      case 'privacy': return '🛡️';
      case 'compliance': return '✅';
      case 'operational': return '⚙️';
      case 'hr': return '👥';
      case 'legal': return '⚖️';
      case 'data_protection': return '🗄️';
      case 'access_control': return '🔑';
      default: return '📄';
    }
  };

  const getEnforcementBadge = (level: string) => {
    switch (level) {
      case 'mandatory':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Mandatory</span>;
      case 'recommended':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Recommended</span>;
      case 'optional':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Optional</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Policy Templates</h2>
            <p className="text-sm text-gray-600 mt-1">Browse pre-configured policy templates for common standards</p>
          </div>
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="security">Security</option>
              <option value="privacy">Privacy</option>
              <option value="compliance">Compliance</option>
              <option value="operational">Operational</option>
              <option value="hr">HR</option>
              <option value="legal">Legal</option>
              <option value="data_protection">Data Protection</option>
              <option value="access_control">Access Control</option>
            </select>
          </div>
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template._id}
            className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-all cursor-pointer"
            onClick={() => {
              setSelectedTemplate(template);
              setShowDetails(true);
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-3xl">{getCategoryIcon(template.category)}</div>
              {getEnforcementBadge(template.enforcementLevel)}
            </div>
            
            <h3 className="font-bold text-gray-900 mb-2">{template.name}</h3>
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>
            
            {template.standard && (
              <div className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded mb-3">
                {template.standard}
              </div>
            )}
            
            <div className="flex items-center justify-between text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-1">
                <span>⏱️</span>
                <span>{template.estimatedReadTime} min read</span>
              </div>
              <div className="flex items-center gap-1">
                <span>👥</span>
                <span>{template.usageCount} uses</span>
              </div>
            </div>

            {template.tags && template.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {template.tags.slice(0, 3).map((tag, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-gray-400 text-5xl mb-3">📚</div>
          <p className="text-gray-600 text-lg">No templates found</p>
          <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
        </div>
      )}

      {/* Template Details Modal */}
      {showDetails && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{getCategoryIcon(selectedTemplate.category)}</div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedTemplate.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{selectedTemplate.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Category</div>
                  <div className="text-lg font-medium text-gray-900 capitalize">
                    {selectedTemplate.category.replace('_', ' ')}
                  </div>
                </div>
                {selectedTemplate.standard && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Standard</div>
                    <div className="text-lg font-medium text-gray-900">{selectedTemplate.standard}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-600 mb-1">Enforcement Level</div>
                  <div className="mt-1">{getEnforcementBadge(selectedTemplate.enforcementLevel)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Target Audience</div>
                  <div className="text-lg font-medium text-gray-900 capitalize">
                    {selectedTemplate.targetAudience.replace('_', ' ')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Reading Time</div>
                  <div className="text-lg font-medium text-gray-900">{selectedTemplate.estimatedReadTime} minutes</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Usage</div>
                  <div className="text-lg font-medium text-gray-900">{selectedTemplate.usageCount} times</div>
                </div>
              </div>

              {selectedTemplate.tags && selectedTemplate.tags.length > 0 && (
                <div className="mb-6">
                  <div className="text-sm text-gray-600 mb-2">Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.tags.map((tag, idx) => (
                      <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  Use This Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
