import React, { useState, useEffect } from 'react';
import { adminAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import { FiUsers, FiShield, FiMail, FiDollarSign, FiTrash2, FiUserCheck, FiUserX, FiSearch } from 'react-icons/fi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [page, searchTerm]);

    const fetchDashboardData = async () => {
        try {
            const response = await adminAPI.getStats();
            setStats(response.data);
        } catch (err) {
            console.error('Error fetching admin stats:', err);
            setError('Failed to load dashboard statistics');
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await adminAPI.getUsers({ page, limit: 10, search: searchTerm });
            setUsers(response.data.users);
            setTotalPages(response.data.pagination.pages);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    const handleRoleUpdate = async (userId, newRole) => {
        if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

        try {
            await adminAPI.updateUserRole(userId, newRole);
            fetchUsers(); // Refresh list
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update role');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure? This action cannot be undone.')) return;

        try {
            await adminAPI.deleteUser(userId);
            fetchUsers();
            fetchDashboardData(); // Update stats
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete user');
        }
    };

    if (loading && !stats) return <LoadingSpinner />;

    return (
        <div className="min-h-screen bg-theme-bg-primary">
            <Navbar />
            <div className="admin-dashboard container">
                <header className="admin-header">
                    <h1>System Overview</h1>
                    <p>Monitor system health, user growth, and security metrics.</p>
                </header>

                {error && <div className="alert alert-error">{error}</div>}

                {/* Overview Stats */}
                {stats && (
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon"><FiUsers /></div>
                            <div className="stat-info">
                                <h3>Total Users</h3>
                                <p className="stat-value">{stats.overview.totalUsers}</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon"><FiMail /></div>
                            <div className="stat-info">
                                <h3>Emails Scanned</h3>
                                <p className="stat-value">{stats.overview.totalEmailsScanned.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon"><FiShield /></div>
                            <div className="stat-info">
                                <h3>Active Subs</h3>
                                <p className="stat-value">{stats.overview.totalSubscriptions}</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon"><FiDollarSign /></div>
                            <div className="stat-info">
                                <h3>Est. Revenue</h3>
                                <p className="stat-value">${stats.overview.monthlyRevenue}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Charts Section */}
                {stats && stats.chartData && (
                    <div className="charts-section">
                        <div className="chart-card">
                            <h3>User Growth & Breach Detection</h3>
                            <ResponsiveContainer width="100%" height="85%">
                                <AreaChart data={stats.chartData}>
                                    <defs>
                                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorBreaches" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis dataKey="name" stroke="var(--theme-text-secondary)" />
                                    <YAxis stroke="var(--theme-text-secondary)" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border-light)' }}
                                    />
                                    <Area type="monotone" dataKey="users" stroke="#8884d8" fillOpacity={1} fill="url(#colorUsers)" />
                                    <Area type="monotone" dataKey="breaches" stroke="#82ca9d" fillOpacity={1} fill="url(#colorBreaches)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="chart-card">
                            <h3>Monthly Activity</h3>
                            <ResponsiveContainer width="100%" height="85%">
                                <BarChart data={stats.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis dataKey="name" stroke="var(--theme-text-secondary)" />
                                    <YAxis stroke="var(--theme-text-secondary)" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border-light)' }}
                                    />
                                    <Bar dataKey="breaches" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* User Management */}
                <div className="users-section">
                    <div className="section-header">
                        <h2>User Management</h2>
                        <div className="search-box">
                            <FiSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="form-control"
                            />
                        </div>
                    </div>

                    <div className="table-container">
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Joined</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user._id}>
                                        <td>
                                            <div className="user-cell">
                                                <div className="user-avatar">
                                                    {user.picture ? <img src={user.picture} alt="" className="user-avatar" /> : user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold">{user.name}</div>
                                                    <div className="text-sm text-theme-muted">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`role-badge ${user.role}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <div className="action-buttons">
                                                {user.role === 'user' ? (
                                                    <button
                                                        className="btn-icon promote"
                                                        title="Promote to Admin"
                                                        onClick={() => handleRoleUpdate(user._id, 'admin')}
                                                    >
                                                        <FiUserCheck />
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="btn-icon demote"
                                                        title="Demote to User"
                                                        onClick={() => handleRoleUpdate(user._id, 'user')}
                                                    >
                                                        <FiUserX />
                                                    </button>
                                                )}
                                                <button
                                                    className="btn-icon delete"
                                                    title="Delete User"
                                                    onClick={() => handleDeleteUser(user._id)}
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="p-4 flex justify-between items-center border-t border-theme-border-light">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="btn btn-secondary btn-sm"
                        >
                            Previous
                        </button>
                        <span className="text-theme-text-secondary">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="btn btn-secondary btn-sm"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
