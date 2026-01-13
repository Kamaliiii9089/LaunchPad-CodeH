import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { FiMenu } from 'react-icons/fi';
import './DashboardLayout.css';

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="dashboard-layout">
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
        <main className="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
