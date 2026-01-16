import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHome, FiMail, FiSettings, FiLogOut, FiMenu, FiX, FiUser, FiShield, FiGlobe, FiMonitor } from 'react-icons/fi';
import ThemeSwitcher from '../ThemeSwitcher/ThemeSwitcher';
import NotificationCenter from './NotificationCenter/NotificationCenter';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, cycleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-brand">
          <FiMail className="navbar-logo" />
          Gmail Manager
        </Link>

        {/* Desktop Navigation */}
        <div className="navbar-nav">
          <Link
            to="/dashboard"
            className={`nav-link ${isActive('/dashboard')}`}
          >
            <FiHome className="nav-icon" />
            Dashboard
          </Link>
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className={`nav-link ${isActive('/admin')}`}
            >
              <FiMonitor className="nav-icon" />
              Admin
            </Link>
          )}
          <Link
            to="/subscriptions"
            className={`nav-link ${isActive('/subscriptions')}`}
          >
            <FiMail className="nav-icon" />
            Subscriptions
          </Link>
          <Link
            to="/breach-check"
            className={`nav-link ${isActive('/breach-check')}`}
          >
            <FiShield className="nav-icon" />
            Security Check
          </Link>
          <Link
            to="/surface"
            className={`nav-link ${isActive('/surface')}`}
          >
            <FiGlobe className="nav-icon" />
            Surface Scanner
          </Link>
          <Link
            to="/settings"
            className={`nav-link ${isActive('/settings')}`}
          >
            <FiSettings className="nav-icon" />
            Settings
          </Link>
        </div>

        {/* Theme Switcher */}
        <ThemeSwitcher variant="compact" />

        {/* Notification Center */}
        <NotificationCenter />

        {/* User Menu */}
        <div className="navbar-user">
          <div className="user-menu-container">
            <button
              className="user-menu-trigger"
              onClick={toggleUserMenu}
            >
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="user-avatar"
                />
              ) : (
                <FiUser className="user-icon" />
              )}
              <span className="user-name">{user?.name}</span>
            </button>

            {isUserMenuOpen && (
              <div className="user-menu-dropdown">
                <div className="user-menu-header">
                  <p className="user-email">{user?.email}</p>
                </div>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="user-menu-item"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <FiMonitor />
                    Admin Portal
                  </Link>
                )}
                <Link
                  to="/activity"
                  className="user-menu-item"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <FiActivity />
                  Activity Log
                </Link>
                <Link
                  to="/settings"
                  className="user-menu-item"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <FiSettings />
                  Settings
                </Link>
                <button
                  className="user-menu-item logout-btn"
                  onClick={handleLogout}
                >
                  <FiLogOut />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="mobile-menu-toggle"
          onClick={toggleMobileMenu}
        >
          {isMobileMenuOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="mobile-nav">
          <Link
            to="/dashboard"
            className={`mobile-nav-link ${isActive('/dashboard')}`}
            onClick={closeMobileMenu}
          >
            <FiHome className="nav-icon" />
            Dashboard
          </Link>
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className={`mobile-nav-link ${isActive('/admin')}`}
              onClick={closeMobileMenu}
            >
              <FiMonitor className="nav-icon" />
              Admin Portal
            </Link>
          )}
          <Link
            to="/subscriptions"
            className={`mobile-nav-link ${isActive('/subscriptions')}`}
            onClick={closeMobileMenu}
          >
            <FiMail className="nav-icon" />
            Subscriptions
          </Link>
          <Link
            to="/breach-check"
            className={`mobile-nav-link ${isActive('/breach-check')}`}
            onClick={closeMobileMenu}
          >
            <FiShield className="nav-icon" />
            Security Check
          </Link>
          <Link
            to="/surface"
            className={`mobile-nav-link ${isActive('/surface')}`}
            onClick={closeMobileMenu}
          >
            <FiGlobe className="nav-icon" />
            Surface Scanner
          </Link>
          <Link
            to="/settings"
            className={`mobile-nav-link ${isActive('/settings')}`}
            onClick={closeMobileMenu}
          >
            <FiSettings className="nav-icon" />
            Settings
          </Link>
          <button
            className="mobile-nav-link logout-btn"
            onClick={handleLogout}
          >
            <FiLogOut className="nav-icon" />
            Logout
          </button>
        </div>
      )}

      {/* Overlay for mobile menu */}
      {
        isMobileMenuOpen && (
          <div
            className="mobile-menu-overlay"
            onClick={closeMobileMenu}
          />
        )
      }

      {/* Overlay for user menu */}
      {
        isUserMenuOpen && (
          <div
            className="user-menu-overlay"
            onClick={() => setIsUserMenuOpen(false)}
          />
        )
      }
    </nav >
  );
};

export default Navbar;
