import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "lab_booking",
        "appointment_request", 
        "order_placed",
        "payment_received",
        "system_alert",
        "article_submission"
      ]
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    recipientType: {
      type: String,
      required: true,
      enum: ["admin", "doctor", "user"],
      default: "admin"
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    relatedEntity: {
      type: {
        type: String,
        enum: ["LabBooking", "Appointment", "Order", "Article"]
      },
      id: {
        type: mongoose.Schema.Types.ObjectId
      }
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium"
    },
    actionRequired: {
      type: Boolean,
      default: true
    },
    actionUrl: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient queries
notificationSchema.index({ recipientType: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

// Virtual for time ago
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
});

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
