import express from "express";
import {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
  getOrderAnalytics,
} from "../controllers/order.controller.js";
import { protectRoute } from "../middlewares/protectRoute.js";
import { adminRequired } from "../middlewares/adminRequired.js";

const router = express.Router();

// User routes (require authentication)
router.post("/", protectRoute, createOrder);
router.get("/my-orders", protectRoute, getUserOrders);

// Admin routes (IMPORTANT: must be before `/:id` route)
router.get("/admin/all", protectRoute, adminRequired, getAllOrders);
router.get("/admin/analytics", protectRoute, adminRequired, getOrderAnalytics);
router.patch("/admin/:id/status", protectRoute, adminRequired, updateOrderStatus);
router.patch("/admin/:id/payment", protectRoute, adminRequired, updatePaymentStatus);

// Generic user order routes (keep last to avoid catching `/admin/*`)
router.get("/:id", protectRoute, getOrderById);
router.patch("/:id/cancel", protectRoute, cancelOrder);

export default router;
