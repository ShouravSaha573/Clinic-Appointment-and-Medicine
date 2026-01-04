import { create } from 'zustand';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isUpdating: false,

  // Fetch admin notifications
  fetchNotifications: async (page = 1, limit = 20, unreadOnly = false) => {
    set({ isLoading: true });
    try {
      const response = await axiosInstance.get('/notifications/admin', {
        params: { page, limit, unreadOnly }
      });
      
      set({ 
        notifications: response.data.notifications,
        pagination: response.data.pagination,
        unreadCount: response.data.unreadCount
      });
      
      return response.data;
    } catch (error) {
      toast.error('Failed to fetch notifications');
      console.error('Notification fetch error:', error);
      return { notifications: [], unreadCount: 0 };
    } finally {
      set({ isLoading: false });
    }
  },

  // Get unread count
  fetchUnreadCount: async () => {
    try {
      const response = await axiosInstance.get('/notifications/admin/unread-count');
      set({ unreadCount: response.data.unreadCount });
      return response.data.unreadCount;
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      return 0;
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    set({ isUpdating: true });
    try {
      await axiosInstance.put(`/notifications/${notificationId}/read`);
      
      // Update local state
      const { notifications, unreadCount } = get();
      const updatedNotifications = notifications.map(notification =>
        notification._id === notificationId 
          ? { ...notification, isRead: true, readAt: new Date() }
          : notification
      );
      
      set({ 
        notifications: updatedNotifications,
        unreadCount: Math.max(0, unreadCount - 1)
      });
      
      return { success: true };
    } catch (error) {
      toast.error('Failed to mark notification as read');
      return { success: false, error: error.response?.data?.message };
    } finally {
      set({ isUpdating: false });
    }
  },

  // Mark all as read
  markAllAsRead: async () => {
    set({ isUpdating: true });
    try {
      await axiosInstance.put('/notifications/admin/mark-all-read');
      
      // Update local state
      const { notifications } = get();
      const updatedNotifications = notifications.map(notification => ({
        ...notification,
        isRead: true,
        readAt: new Date()
      }));
      
      set({ 
        notifications: updatedNotifications,
        unreadCount: 0
      });
      
      toast.success('All notifications marked as read');
      return { success: true };
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
      return { success: false, error: error.response?.data?.message };
    } finally {
      set({ isUpdating: false });
    }
  },

  // Get notification type icon
  getNotificationIcon: (type) => {
    const icons = {
      lab_booking: '🧪',
      appointment_request: '👨‍⚕️',
      order_placed: '💊',
      payment_received: '💰',
      system_alert: '⚠️',
      article_submission: '📄'
    };
    return icons[type] || '📬';
  },

  // Get notification priority color
  getPriorityColor: (priority) => {
    const colors = {
      low: 'badge-ghost',
      medium: 'badge-info',
      high: 'badge-warning',
      urgent: 'badge-error'
    };
    return colors[priority] || 'badge-ghost';
  },

  // Format time ago
  formatTimeAgo: (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  },

  // Real-time updates (call this periodically)
  refreshNotifications: async () => {
    const { fetchUnreadCount } = get();
    await fetchUnreadCount();
  },

  // Clear notifications
  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  }
}));

export default useNotificationStore;
