import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import useNotificationStore from '../store/useNotificationStore';
import { useAuthStore } from '../store/useAuthStore';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const { authUser } = useAuthStore();
  
  const {
    notifications,
    unreadCount,
    isLoading,
    isUpdating,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    getNotificationIcon,
    getPriorityColor,
    formatTimeAgo
  } = useNotificationStore();

  // Only show for admin users
  if (!authUser?.isAdmin) return null;

  useEffect(() => {
    // Initial fetch
    fetchUnreadCount();
    
    // Set up polling for real-time updates (every 30 seconds)
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications(1, 20, showUnreadOnly);
    }
  }, [isOpen, showUnreadOnly, fetchNotifications]);

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
    
    // Navigate to related page if actionUrl exists
    if (notification.actionUrl) {
      // You can implement navigation logic here
      console.log('Navigate to:', notification.actionUrl);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const filteredNotifications = showUnreadOnly 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  return (
    <div className="dropdown dropdown-end">
      {/* Notification Bell Button */}
      <div 
        tabIndex={0} 
        role="button" 
        className="btn btn-ghost btn-circle relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="badge badge-error badge-xs absolute -top-1 -right-1 min-h-[1.25rem] min-w-[1.25rem] text-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="dropdown-content z-50 mt-2 w-80 bg-base-100 rounded-lg shadow-xl border">
          {/* Header */}
          <div className="p-4 border-b border-base-300">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={showUnreadOnly}
                  onChange={(e) => setShowUnreadOnly(e.target.checked)}
                />
                <span className="text-sm">Unread only</span>
              </div>
              
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="btn btn-ghost btn-xs gap-1"
                  disabled={isUpdating}
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center">
                <span className="loading loading-spinner loading-sm"></span>
                <p className="text-sm text-base-content/60 mt-2">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="h-8 w-8 mx-auto text-base-content/40 mb-2" />
                <p className="text-sm text-base-content/60">
                  {showUnreadOnly ? 'No unread notifications' : 'No notifications yet'}
                </p>
              </div>
            ) : (
              <div className="py-2">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 hover:bg-base-200 cursor-pointer border-l-4 transition-colors ${
                      notification.isRead 
                        ? 'border-l-transparent bg-opacity-50' 
                        : 'border-l-primary bg-primary/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="text-lg flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm font-medium leading-tight ${
                            notification.isRead ? 'text-base-content/70' : 'text-base-content'
                          }`}>
                            {notification.title}
                          </h4>
                          
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className={`badge badge-xs ${getPriorityColor(notification.priority)}`}>
                              {notification.priority}
                            </span>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                            )}
                          </div>
                        </div>
                        
                        <p className={`text-xs mt-1 leading-relaxed ${
                          notification.isRead ? 'text-base-content/50' : 'text-base-content/70'
                        }`}>
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-base-content/40">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          
                          {notification.actionRequired && (
                            <span className="text-xs text-warning">Action required</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="p-3 border-t border-base-300 text-center">
              <button className="btn btn-ghost btn-sm text-xs">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
