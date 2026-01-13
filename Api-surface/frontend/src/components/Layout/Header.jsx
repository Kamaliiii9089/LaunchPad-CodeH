import React from 'react'
import { 
  Bars3Icon,
  BellIcon,
} from '@heroicons/react/24/outline'
import { useLocation } from 'react-router-dom'

const Header = ({ setSidebarOpen }) => {
  const location = useLocation()

  const getPageTitle = () => {
    const path = location.pathname
    switch (true) {
      case path === '/dashboard':
        return 'Dashboard'
      case path.startsWith('/domains'):
        return 'Domains'
      case path.startsWith('/scans'):
        return 'Scans'
      case path.startsWith('/reports'):
        return 'Reports'
      case path.startsWith('/settings'):
        return 'Settings'
      default:
        return 'API Attack Surface Mapper'
    }
  }

  return (
    <div className="sticky top-0 z-10 bg-white shadow">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side */}
          <div className="flex items-center">
            <button
              type="button"
              className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            <div className="flex-1 px-4 flex justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {getPageTitle()}
                </h1>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button
              type="button"
              className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <span className="sr-only">View notifications</span>
              <BellIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Header
