import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FiHome,
  FiMail,
  FiShield,
  FiGlobe,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
} from "react-icons/fi";
import "./Sidebar.css";

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Keyboard navigation: close sidebar with Escape key
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        toggleSidebar();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, toggleSidebar]);

  const menuItems = [
    {
      title: "Dashboard",
      icon: <FiHome />,
      path: "/dashboard",
    },
    {
      title: "Subscriptions",
      icon: <FiMail />,
      path: "/subscriptions",
    },
    {
      title: "Security Check",
      icon: <FiShield />,
      path: "/breach-check",
    },
    {
      title: "Surface Scanner",
      icon: <FiGlobe />,
      path: "/surface",
    },
    {
      title: "Settings",
      icon: <FiSettings />,
      path: "/settings",
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={toggleSidebar}
          aria-hidden="true"
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar ${isOpen ? "sidebar-open" : ""}`}
        role="navigation"
        aria-label="Sidebar"
      >
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <FiMail className="logo-icon" />
            <span className="logo-text">Gmail Manager</span>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={toggleSidebar}
            aria-label="Close sidebar"
          >
            <FiX />
          </button>
        </div>

        {/* User Info */}
        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="user-info">
            <h4 className="user-name">{user?.name || "User"}</h4>
            <p className="user-email">{user?.email || ""}</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav" aria-label="Sidebar navigation">
          <ul className="nav-list">
            {menuItems.map((item, index) => (
              <li key={index} className="nav-item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? "nav-link-active" : ""}`
                  }
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      toggleSidebar();
                    }
                  }}
                  aria-label={item.title}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-text">{item.title}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <button
            className="logout-btn"
            onClick={handleLogout}
            aria-label="Logout"
          >
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
