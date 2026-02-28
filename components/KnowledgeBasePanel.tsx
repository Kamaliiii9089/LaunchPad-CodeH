'use client';

import { useState, useEffect } from 'react';

interface KBArticle {
  _id: string;
  title: string;
  slug: string;
  category: string;
  content: string;
  summary: string;
  tags: string[];
  threatTypes: string[];
  steps?: Array<{
    order: number;
    title: string;
    description: string;
    code?: string;
    warning?: string;
  }>;
  views: number;
  helpful: number;
  notHelpful: number;
  createdAt: Date;
}

interface KnowledgeBasePanelProps {
  threatType?: string;
  onClose: () => void;
  toast: any;
}

export default function KnowledgeBasePanel({ threatType, onClose, toast }: KnowledgeBasePanelProps) {
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loadingArticle, setLoadingArticle] = useState(false);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'procedures', label: 'Procedures' },
    { value: 'troubleshooting', label: 'Troubleshooting' },
    { value: 'best-practices', label: 'Best Practices' },
    { value: 'incident-response', label: 'Incident Response' },
    { value: 'threat-intelligence', label: 'Threat Intelligence' },
    { value: 'tools', label: 'Tools' },
  ];

  useEffect(() => {
    loadArticles();
  }, [threatType, selectedCategory, searchQuery]);

  const loadArticles = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = '/api/collaboration/knowledge-base?';
      
      if (threatType && !searchQuery) {
        url += `threatType=${encodeURIComponent(threatType)}&`;
      }
      if (selectedCategory !== 'all') {
        url += `category=${selectedCategory}&`;
      }
      if (searchQuery) {
        url += `search=${encodeURIComponent(searchQuery)}&`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setArticles(data.articles);
      }
    } catch (error: any) {
      toast.error('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const loadArticleDetails = async (slug: string) => {
    try {
      setLoadingArticle(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/collaboration/knowledge-base?slug=${slug}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setSelectedArticle(data.article);
      }
    } catch (error: any) {
      toast.error('Failed to load article');
    } finally {
      setLoadingArticle(false);
    }
  };

  const handleFeedback = async (helpful: boolean) => {
    if (!selectedArticle) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/collaboration/knowledge-base', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          articleId: selectedArticle._id,
          helpful,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Thank you for your feedback!');
      }
    } catch (error: any) {
      toast.error('Failed to submit feedback');
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'procedures': return 'bg-blue-100 text-blue-700';
      case 'troubleshooting': return 'bg-yellow-100 text-yellow-700';
      case 'best-practices': return 'bg-green-100 text-green-700';
      case 'incident-response': return 'bg-red-100 text-red-700';
      case 'threat-intelligence': return 'bg-purple-100 text-purple-700';
      case 'tools': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Knowledge Base</h2>
            <p className="text-sm text-gray-600 mt-1">
              {threatType ? `Articles related to ${threatType}` : 'Browse security documentation and procedures'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Articles List */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto p-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg">📚 No articles found</p>
                <p className="text-sm mt-2">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {articles.map((article) => (
                  <div
                    key={article._id}
                    onClick={() => loadArticleDetails(article.slug)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedArticle?._id === article._id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">{article.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(article.category)}`}>
                        {article.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{article.summary}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>👁️ {article.views} views</span>
                      <span>👍 {article.helpful}</span>
                    </div>
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {article.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Article Details */}
          <div className="flex-1 overflow-y-auto p-6">
            {loadingArticle ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading article...</p>
              </div>
            ) : selectedArticle ? (
              <div className="space-y-6">
                {/* Article Header */}
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-2xl font-bold text-gray-900">{selectedArticle.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(selectedArticle.category)}`}>
                      {selectedArticle.category}
                    </span>
                  </div>
                  {selectedArticle.summary && (
                    <p className="text-gray-600 text-lg mb-4">{selectedArticle.summary}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>👁️ {selectedArticle.views} views</span>
                    <span>👍 {selectedArticle.helpful}</span>
                    <span>👎 {selectedArticle.notHelpful}</span>
                  </div>
                </div>

                {/* Tags and Threat Types */}
                {(selectedArticle.tags?.length > 0 || selectedArticle.threatTypes?.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {selectedArticle.tags?.map((tag, idx) => (
                      <span
                        key={`tag-${idx}`}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        🏷️ {tag}
                      </span>
                    ))}
                    {selectedArticle.threatTypes?.map((type, idx) => (
                      <span
                        key={`threat-${idx}`}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
                      >
                        ⚠️ {type}
                      </span>
                    ))}
                  </div>
                )}

                {/* Article Content */}
                <div className="prose prose-sm max-w-none">
                  {selectedArticle.steps && selectedArticle.steps.length > 0 ? (
                    <div className="space-y-4">
                      {selectedArticle.steps.map((step, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                              {step.order}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-2">{step.title}</h4>
                              <p className="text-gray-700 text-sm mb-2">{step.description}</p>
                              {step.code && (
                                <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto mb-2">
                                  <code>{step.code}</code>
                                </pre>
                              )}
                              {step.warning && (
                                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                  ⚠️ {step.warning}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-700 whitespace-pre-wrap">
                      {selectedArticle.content}
                    </div>
                  )}
                </div>

                {/* Feedback Section */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-900 mb-3">Was this article helpful?</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleFeedback(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      👍 Yes, helpful
                    </button>
                    <button
                      onClick={() => handleFeedback(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                    >
                      👎 Not helpful
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">📖 Select an article to read</p>
                <p className="text-sm mt-2">Choose from the list on the left</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
