import express from "express";
import { protectRoute } from "../middlewares/protectRoute.js";
import { adminRequired } from "../middlewares/adminRequired.js";
import {
  getAdminNotifications,
  getAdminUnreadCount,
  markNotificationAsRead,
  markAllAdminNotificationsAsRead,
  cleanupOldNotifications
} from "../controllers/notification.controller.js";

const router = express.Router();

// Admin notification routes
router.get("/admin", protectRoute, adminRequired, getAdminNotifications);
router.get("/admin/unread-count", protectRoute, adminRequired, getAdminUnreadCount);
router.put("/admin/mark-all-read", protectRoute, adminRequired, markAllAdminNotificationsAsRead);
router.put("/:id/read", protectRoute, adminRequired, markNotificationAsRead);
router.delete("/cleanup", protectRoute, adminRequired, cleanupOldNotifications);

export default router;
