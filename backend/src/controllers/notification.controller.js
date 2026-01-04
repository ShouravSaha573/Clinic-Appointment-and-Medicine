import NotificationService from "../services/notificationService.js";

// Get all admin notifications
export const getAdminNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const result = await NotificationService.getAdminNotifications({
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    });
    
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getAdminNotifications controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get admin unread notification count
export const getAdminUnreadCount = async (req, res) => {
  try {
    const count = await NotificationService.getAdminUnreadCount();
    res.status(200).json({ unreadCount: count });
  } catch (error) {
    console.error("Error in getAdminUnreadCount controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await NotificationService.markAsRead(id);
    
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    
    res.status(200).json({
      message: "Notification marked as read",
      notification
    });
  } catch (error) {
    console.error("Error in markNotificationAsRead controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark all admin notifications as read
export const markAllAdminNotificationsAsRead = async (req, res) => {
  try {
    const result = await NotificationService.markAllAdminAsRead();
    
    res.status(200).json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("Error in markAllAdminNotificationsAsRead controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete old notifications (cleanup)
export const cleanupOldNotifications = async (req, res) => {
  try {
    const { daysOld = 30 } = req.query;
    
    const result = await NotificationService.deleteOldNotifications(parseInt(daysOld));
    
    res.status(200).json({
      message: "Old notifications cleaned up",
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("Error in cleanupOldNotifications controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
