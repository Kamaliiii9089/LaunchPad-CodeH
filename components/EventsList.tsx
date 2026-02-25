import React from 'react';

interface SecurityEvent {
  id: number;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  timestamp: string;
  status: 'active' | 'resolved' | 'investigating';
}

interface EventsListProps {
  events: SecurityEvent[];
  isLoading?: boolean;
  showActions?: boolean;
  onInvestigate?: (event: SecurityEvent) => void;
  onResolve?: (event: SecurityEvent) => void;
}

export default function EventsList({
  events,
  isLoading = false,
  showActions = false,
  onInvestigate,
  onResolve,
}: EventsListProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'high':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'low':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-red-500';
      case 'investigating':
        return 'bg-yellow-500';
      case 'resolved':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg animate-pulse"
          >
            <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 mt-1.5"></div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
                <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
              </div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No events found</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md">
          There are no security events to display at the moment. This is a good sign!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${getStatusColor(event.status)}`}></div>
          <div className="flex-1 min-w-0">
            <div className={`flex items-center ${showActions ? 'justify-between' : 'gap-2'} mb-1 flex-wrap`}>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">{event.type}</h3>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded border whitespace-nowrap ${getSeverityColor(
                    event.severity
                  )}`}
                >
                  {event.severity.toUpperCase()}
                </span>
              </div>
              {showActions && (
                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{event.status}</span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{event.description}</p>
            <div className={`flex items-center ${showActions ? 'justify-between' : 'gap-2'} flex-wrap gap-2`}>
              <p className="text-xs text-gray-500 dark:text-gray-400">{event.timestamp}</p>
              {showActions && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onInvestigate?.(event)}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Investigate
                  </button>
                  <button
                    onClick={() => onResolve?.(event)}
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors shadow-sm"
                  >
                    Resolve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
