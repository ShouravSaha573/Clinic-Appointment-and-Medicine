import express from "express";
import {
  createLabBooking,
  getUserLabBookings,
  getLabBookingById,
  cancelLabBooking,
  getAllLabBookings,
  updateBookingStatus,
  acceptLabBooking,
  rejectLabBooking,
  getAvailableTimeSlots,
  getLabBookingStats,
} from "../controllers/labBooking.controller.js";
import { protectRoute } from "../middlewares/protectRoute.js";
import { adminRequired } from "../middlewares/adminRequired.js";

const router = express.Router();

// User routes (protected)
router.post("/", protectRoute, createLabBooking);
router.get("/my-bookings", protectRoute, getUserLabBookings);
router.get("/time-slots", getAvailableTimeSlots);
router.get("/:id", protectRoute, getLabBookingById);
router.put("/:id/cancel", protectRoute, cancelLabBooking);

// Admin routes (protected)
router.get("/admin/all", protectRoute, adminRequired, getAllLabBookings);
router.put("/admin/:id/status", protectRoute, adminRequired, updateBookingStatus);
router.put("/admin/:id/accept", protectRoute, adminRequired, acceptLabBooking);
router.put("/admin/:id/reject", protectRoute, adminRequired, rejectLabBooking);
router.get("/admin/stats", protectRoute, adminRequired, getLabBookingStats);

export default router;
