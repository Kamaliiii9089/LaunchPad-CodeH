import React, { useState, useEffect } from 'react';
import { subscriptionAPI } from '../utils/api';
import {
  FiSearch,
  FiFilter,
  FiMoreVertical,
  FiCheckCircle,
  FiXCircle,
  FiTrash2,
  FiExternalLink,
  FiAlertCircle,
  FiRefreshCw
} from 'react-icons/fi';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import DashboardLayout from '../components/DashboardLayout';
import './SubscriptionsPage.css';

const SubscriptionsPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    status: 'all',
    sortBy: 'lastEmailReceived',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0
  });
  const [selectedSubscriptions, setSelectedSubscriptions] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(null);

  useEffect(() => {
    loadSubscriptions();
  }, [filters]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await subscriptionAPI.getSubscriptions({
        ...filters,
        page: pagination.currentPage,
        limit: 20
      });

      setSubscriptions(response.data.subscriptions || []);
      setPagination(response.data.pagination || pagination);
    } catch (error) {
      console.error('Load subscriptions error:', error);
      setError('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleSubscriptionAction = async (id, action) => {
    try {
      setActionLoading(prev => ({ ...prev, [id]: true }));
      setError(null);

      let response;
      switch (action) {
        case 'revoke':
          response = await subscriptionAPI.revokeSubscription(id);
          break;
        case 'grant':
          response = await subscriptionAPI.grantSubscription(id);
          break;
        case 'delete':
          response = await subscriptionAPI.deleteSubscription(id);
          break;
        default:
          throw new Error('Invalid action');
      }

      // Update the subscription in the list
      if (action === 'delete') {
        setSubscriptions(prev => prev.filter(sub => sub._id !== id));
      } else {
        setSubscriptions(prev =>
          prev.map(sub =>
            sub._id === id
              ? { ...sub, status: action === 'revoke' ? 'revoked' : 'active' }
              : sub
          )
        );
      }

      setDropdownOpen(null);
    } catch (error) {
      console.error(`${action} subscription error:`, error);
      setError(error.response?.data?.message || `Failed to ${action} subscription`);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedSubscriptions.length === 0) return;

    try {
      setError(null);
      
      await subscriptionAPI.bulkOperation({
        action,
        subscriptionIds: selectedSubscriptions
      });

      setSelectedSubscriptions([]);
      await loadSubscriptions();
    } catch (error) {
      console.error('Bulk action error:', error);
      setError(error.response?.data?.message || `Failed to ${action} subscriptions`);
    }
  };

  const toggleSubscriptionSelection = (id) => {
    setSelectedSubscriptions(prev =>
      prev.includes(id)
        ? prev.filter(subId => subId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSubscriptions.length === subscriptions.length) {
      setSelectedSubscriptions([]);
    } else {
      setSelectedSubscriptions(subscriptions.map(sub => sub._id));
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      subscription: '#4285f4',
      newsletter: '#34a853',
      verification: '#fbbc04',
      login: '#ea4335',
      billing: '#9c27b0',
      other: '#6c757d'
    };
    return colors[category] || colors.other;
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return 'badge badge-success';
      case 'revoked':
        return 'badge badge-danger';
      default:
        return 'badge badge-secondary';
    }
  };

  if (loading && subscriptions.length === 0) {
    return (
      <DashboardLayout>
        <div className="subscriptions-page">
          <div className="container">
            <LoadingSpinner text="Loading your subscriptions..." />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="subscriptions-page">
        <div className="page-header">
          <div className="header-content">
            <h1>Your Subscriptions</h1>
            <p>Manage all your digital subscriptions and account access</p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-secondary"
              onClick={loadSubscriptions}
              disabled={loading}
            >
              {loading ? <FiRefreshCw className="spin" /> : <FiRefreshCw />}
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <FiAlertCircle />
            {error}
            <button className="btn btn-sm btn-secondary" onClick={loadSubscriptions}>
              Retry
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="filters-section card">
          <div className="card-body">
            <div className="filters-row">
              <div className="search-filter">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search subscriptions..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <select
                  className="form-select"
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <option value="all">All Categories</option>
                  <option value="subscription">Subscription</option>
                  <option value="newsletter">Newsletter</option>
                  <option value="verification">Verification</option>
                  <option value="login">Login</option>
                  <option value="billing">Billing</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="filter-group">
                <select
                  className="form-select"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="revoked">Revoked</option>
                </select>
              </div>

              <div className="filter-group">
                <select
                  className="form-select"
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-');
                    handleFilterChange('sortBy', sortBy);
                    handleFilterChange('sortOrder', sortOrder);
                  }}
                >
                  <option value="lastEmailReceived-desc">Latest Email</option>
                  <option value="firstDetected-desc">Recently Added</option>
                  <option value="serviceName-asc">Name A-Z</option>
                  <option value="serviceName-desc">Name Z-A</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedSubscriptions.length > 0 && (
          <div className="bulk-actions card">
            <div className="card-body">
              <div className="bulk-info">
                <span>{selectedSubscriptions.length} selected</span>
              </div>
              <div className="bulk-buttons">
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => handleBulkAction('grant')}
                >
                  Grant Access
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleBulkAction('revoke')}
                >
                  Revoke Access
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleBulkAction('delete')}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subscriptions List */}
        <div className="subscriptions-section">
          {subscriptions.length > 0 ? (
            <div className="subscriptions-table card">
              <div className="table-header">
                <div className="table-cell checkbox-cell">
                  <input
                    type="checkbox"
                    checked={selectedSubscriptions.length === subscriptions.length}
                    onChange={toggleSelectAll}
                  />
                </div>
                <div className="table-cell">Service</div>
                <div className="table-cell">Category</div>
                <div className="table-cell">Status</div>
                <div className="table-cell">Last Email</div>
                <div className="table-cell">Actions</div>
              </div>

              <div className="table-body">
                {subscriptions.map((subscription) => (
                  <div key={subscription._id} className="table-row">
                    <div className="table-cell checkbox-cell">
                      <input
                        type="checkbox"
                        checked={selectedSubscriptions.includes(subscription._id)}
                        onChange={() => toggleSubscriptionSelection(subscription._id)}
                      />
                    </div>

                    <div className="table-cell service-cell">
                      <div className="service-info">
                        <div className="service-icon">
                          <span>{subscription.serviceName.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="service-details">
                          <h4>{subscription.serviceName}</h4>
                          <p>{subscription.domain}</p>
                          <small>{subscription.serviceEmail}</small>
                        </div>
                      </div>
                    </div>

                    <div className="table-cell">
                      <span
                        className="category-badge"
                        style={{ backgroundColor: getCategoryColor(subscription.category) }}
                      >
                        {subscription.category}
                      </span>
                    </div>

                    <div className="table-cell">
                      <span className={getStatusBadgeClass(subscription.status)}>
                        {subscription.status}
                      </span>
                    </div>

                    <div className="table-cell">
                      <span className="date-text">
                        {formatDate(subscription.lastEmailReceived)}
                      </span>
                    </div>

                    <div className="table-cell actions-cell">
                      <div className="dropdown">
                        <button
                          className="dropdown-toggle"
                          onClick={() => setDropdownOpen(
                            dropdownOpen === subscription._id ? null : subscription._id
                          )}
                          disabled={actionLoading[subscription._id]}
                        >
                          {actionLoading[subscription._id] ? (
                            <FiRefreshCw className="spin" />
                          ) : (
                            <FiMoreVertical />
                          )}
                        </button>

                        {dropdownOpen === subscription._id && (
                          <div className="dropdown-menu">
                            {subscription.status === 'active' ? (
                              <button
                                className="dropdown-item danger"
                                onClick={() => handleSubscriptionAction(subscription._id, 'revoke')}
                              >
                                <FiXCircle />
                                Revoke Access
                              </button>
                            ) : (
                              <button
                                className="dropdown-item success"
                                onClick={() => handleSubscriptionAction(subscription._id, 'grant')}
                              >
                                <FiCheckCircle />
                                Grant Access
                              </button>
                            )}
                            
                            {subscription.unsubscribeUrl && (
                              <a
                                href={subscription.unsubscribeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="dropdown-item"
                              >
                                <FiExternalLink />
                                Unsubscribe
                              </a>
                            )}
                            
                            <button
                              className="dropdown-item danger"
                              onClick={() => handleSubscriptionAction(subscription._id, 'delete')}
                            >
                              <FiTrash2 />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state card">
              <div className="card-body">
                <FiSearch className="empty-icon" />
                <h3>No subscriptions found</h3>
                <p>
                  {filters.search || filters.category !== 'all' || filters.status !== 'all'
                    ? 'Try adjusting your filters to see more results.'
                    : 'Start by scanning your emails to discover subscriptions.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pagination-section">
            <div className="pagination-info">
              Showing {((pagination.currentPage - 1) * 20) + 1} to{' '}
              {Math.min(pagination.currentPage * 20, pagination.totalCount)} of{' '}
              {pagination.totalCount} subscriptions
            </div>
            <div className="pagination-controls">
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                disabled={pagination.currentPage === 1}
              >
                Previous
              </button>
              <span className="page-info">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                disabled={pagination.currentPage === pagination.totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SubscriptionsPage;
