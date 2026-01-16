import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationAPI } from '../utils/api';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    // Poll for new notifications every 60 seconds
    useEffect(() => {
        if (!user) return;

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [user]);

    const fetchNotifications = async () => {
        try {
            setLoading(prev => notifications.length === 0 ? true : prev); // Only load show spinner on first load
            const response = await notificationAPI.getAll({ limit: 10 });

            // Check for new high-priority notifications to toast
            const newUrgentItems = response.data.notifications.filter(n =>
                n.status === 'unread' &&
                (n.type === 'danger' || n.type === 'warning') &&
                !notifications.find(existing => existing._id === n._id)
            );

            newUrgentItems.forEach(n => {
                toast[n.type === 'danger' ? 'error' : 'warning'](n.title);
            });

            setNotifications(response.data.notifications);
            setUnreadCount(response.data.unreadCount);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await notificationAPI.markAsRead(id);
            setNotifications(prev => prev.map(n =>
                n._id === id ? { ...n, status: 'read' } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await notificationAPI.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all read:', error);
        }
    };

    const deleteNotification = async (id) => {
        try {
            await notificationAPI.delete(id);
            setNotifications(prev => prev.filter(n => n._id !== id));
            // Re-fetch or decrement count intelligently if needed, but simple filter is usually enough
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            fetchNotifications,
            markAsRead,
            markAllAsRead,
            deleteNotification
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
