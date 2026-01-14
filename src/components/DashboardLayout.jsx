import React, { useState } from "react";
import Sidebar from "./Sidebar";
import ErrorBoundary from "./ErrorBoundary";
import { FiMenu } from "react-icons/fi";
import "./DashboardLayout.css";

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="dashboard-layout">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="dashboard-main">
        {/* Mobile Header */}
        <div className="mobile-header">
          <button className="menu-toggle-btn" onClick={toggleSidebar}>
            <FiMenu />
          </button>
          <span className="mobile-title">Gmail Manager</span>
        </div>

        {/* Main Content */}
        <main id="main-content" className="dashboard-content" role="main">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
