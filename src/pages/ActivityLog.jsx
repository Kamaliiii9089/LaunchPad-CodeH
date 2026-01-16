import React, { useState, useEffect } from 'react';
import { activityAPI } from '../utils/api';
import './ActivityLog.css';
import {
    FiActivity,
    FiLogIn,
    FiLogOut,
    FiShield,
    FiSearch,
    FiTrash2,
    FiCheckCircle,
    FiAlertTriangle,
    FiInfo,
    FiClock,
    FiMonitor
} from 'react-icons/fi';
import { format } from 'date-fns';

const ActivityLog = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        fetchLogs(1, true);
    }, []);

    const fetchLogs = async (pageNum, isInitial = false) => {
        try {
            if (isInitial) setLoading(true);
            else setLoadingMore(true);

            const response = await activityAPI.getLogs({ page: pageNum, limit: 15 });
            const { logs: newLogs, pagination } = response.data;

            if (isInitial) {
                setLogs(newLogs);
            } else {
                setLogs(prev => [...prev, ...newLogs]);
            }

            setHasMore(pagination.page < pagination.pages);
            setPage(pageNum);
        } catch (error) {
            console.error('Failed to fetch activity logs:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (hasMore && !loadingMore) {
            fetchLogs(page + 1);
        }
    };

    const getIcon = (action, severity) => {
        // Default based on action
        if (action.includes('LOGIN')) return <FiLogIn />;
        if (action.includes('LOGOUT')) return <FiLogOut />;
        if (action.includes('SCAN')) return <FiSearch />;
        if (action.includes('REVOKE')) return <FiShield />;
        if (action.includes('DELETE')) return <FiTrash2 />;
        if (action.includes('GRANT')) return <FiCheckCircle />;

        // Fallback based on severity
        switch (severity) {
            case 'danger': return <FiAlertTriangle />;
            case 'warning': return <FiAlertTriangle />;
            case 'success': return <FiCheckCircle />;
            default: return <FiInfo />;
        }
    };

    const formatAction = (action) => {
        return action.replace(/_/g, ' ');
    };

    return (
        <div className="activity-page fade-in">
            <div className="header-container">
                <div className="activity-header">
                    <h1><FiActivity style={{ marginRight: '10px', verticalAlign: 'middle' }} />Activity History</h1>
                    <p>Monitor your account security and audit your recent actions.</p>
                </div>
            </div>

            <div className="container">
                <div className="timeline-container">
                    {loading ? (
                        <div className="loading-spinner"><FiActivity className="spin" /></div>
                    ) : logs.length === 0 ? (
                        <div className="empty-logs">
                            <FiInfo style={{ fontSize: '3rem', marginBottom: '1rem' }} />
                            <h3>No activity recorded yet</h3>
                            <p>Your actions will appear here as you use the application.</p>
                        </div>
                    ) : (
                        <div className="timeline">
                            {logs.map((log) => (
                                <div key={log._id} className="timeline-item">
                                    <div className={`timeline-marker ${log.severity}`}>
                                        {getIcon(log.action, log.severity)}
                                    </div>
                                    <div className="timeline-content">
                                        <div className="timeline-header">
                                            <div className="timeline-action">{formatAction(log.action)}</div>
                                            <div className="timeline-time">
                                                <FiClock style={{ marginRight: '4px' }} />
                                                {format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}
                                            </div>
                                        </div>

                                        <div className="timeline-details">
                                            {log.details}
                                        </div>

                                        <div className="timeline-meta">
                                            {log.ipAddress && log.ipAddress !== '0.0.0.0' && (
                                                <span className="meta-tag">IP: {log.ipAddress}</span>
                                            )}

                                            {/* Render other interesting metadata */}
                                            {log.metadata && Object.entries(log.metadata).map(([key, value]) => {
                                                if (key === 'user' || key === 'headers' || Object.keys(value || {}).length > 0) return null; // Skip complex objects
                                                return (
                                                    <span key={key} className="meta-tag">
                                                        {key}: {value.toString()}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {hasMore && (
                                <div className="load-more">
                                    <button
                                        className="btn-load-more"
                                        onClick={handleLoadMore}
                                        disabled={loadingMore}
                                    >
                                        {loadingMore ? 'Loading...' : 'Load Older Activity'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityLog;
