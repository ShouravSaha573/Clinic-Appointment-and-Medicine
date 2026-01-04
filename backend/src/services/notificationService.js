import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

class NotificationService {
  // Create a new notification
  static async createNotification({
    type,
    title,
    message,
    recipientType = "admin",
    recipientId = null,
    relatedEntity = null,
    priority = "medium",
    actionRequired = true,
    actionUrl = null
  }) {
    try {
      const notification = new Notification({
        type,
        title,
        message,
        recipientType,
        recipientId,
        relatedEntity,
        priority,
        actionRequired,
        actionUrl
      });

      await notification.save();
      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  // Create lab booking notification for admins
  static async createLabBookingNotification(booking) {
    try {
      const title = "New Lab Test Booking";
      const message = `New lab test booking #${booking.bookingNumber} from ${booking.userId?.fullName || 'Unknown Patient'} for ${booking.tests?.length || 0} test(s). Appointment scheduled for ${new Date(booking.appointmentDate).toLocaleDateString()}.`;
      
      return await this.createNotification({
        type: "lab_booking",
        title,
        message,
        recipientType: "admin",
        relatedEntity: {
          type: "LabBooking",
          id: booking._id
        },
        priority: "high",
        actionRequired: true,
        actionUrl: `/admin/lab-bookings`
      });
    } catch (error) {
      console.error("Error creating lab booking notification:", error);
      throw error;
    }
  }

  // Create appointment notification for admins
  static async createAppointmentNotification(appointment) {
    try {
      const title = "New Appointment Request";
      const message = `New appointment request from ${appointment.patient?.fullName || appointment.guestPatient?.name || 'Unknown Patient'} with Dr. ${appointment.doctor?.name} on ${new Date(appointment.appointmentDate).toLocaleDateString()}.`;
      
      return await this.createNotification({
        type: "appointment_request",
        title,
        message,
        recipientType: "admin",
        relatedEntity: {
          type: "Appointment",
          id: appointment._id
        },
        priority: "medium",
        actionRequired: true,
        actionUrl: `/admin/appointments`
      });
    } catch (error) {
      console.error("Error creating appointment notification:", error);
      throw error;
    }
  }

  // Create order notification for admins
  static async createOrderNotification(order) {
    try {
      const title = "New Medicine Order";
      const message = `New order #${order.orderNumber} placed by ${order.user?.fullName || order.guestCustomer?.name || 'Unknown Customer'} for ৳${order.totalAmount}.`;
      
      return await this.createNotification({
        type: "order_placed",
        title,
        message,
        recipientType: "admin",
        relatedEntity: {
          type: "Order",
          id: order._id
        },
        priority: "medium",
        actionRequired: true,
        actionUrl: `/admin/orders`
      });
    } catch (error) {
      console.error("Error creating order notification:", error);
      throw error;
    }
  }

  // Get notifications for admin
  static async getAdminNotifications({ page = 1, limit = 20, unreadOnly = false }) {
    try {
      const query = { recipientType: "admin" };
      if (unreadOnly) {
        query.isRead = false;
      }

      const skip = (page - 1) * limit;
      
      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Notification.countDocuments(query);
      const unreadCount = await Notification.countDocuments({ 
        recipientType: "admin", 
        isRead: false 
      });

      return {
        notifications,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        },
        unreadCount
      };
    } catch (error) {
      console.error("Error getting admin notifications:", error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId) {
    try {
      const notification = await Notification.findByIdAndUpdate(
        notificationId,
        { 
          isRead: true,
          readAt: new Date()
        },
        { new: true }
      );
      return notification;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  // Mark all admin notifications as read
  static async markAllAdminAsRead() {
    try {
      const result = await Notification.updateMany(
        { recipientType: "admin", isRead: false },
        { 
          isRead: true,
          readAt: new Date()
        }
      );
      return result;
    } catch (error) {
      console.error("Error marking all admin notifications as read:", error);
      throw error;
    }
  }

  // Get unread count for admin
  static async getAdminUnreadCount() {
    try {
      const count = await Notification.countDocuments({
        recipientType: "admin",
        isRead: false
      });
      return count;
    } catch (error) {
      console.error("Error getting admin unread count:", error);
      return 0;
    }
  }

  // Delete old notifications (cleanup)
  static async deleteOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
        isRead: true
      });
      
      return result;
    } catch (error) {
      console.error("Error deleting old notifications:", error);
      throw error;
    }
  }
}

export default NotificationService;
