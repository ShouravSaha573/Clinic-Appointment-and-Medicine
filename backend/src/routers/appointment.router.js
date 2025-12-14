import express from "express";
import {
  createAppointment,
  getUserAppointments,
  getAppointmentById,
  cancelAppointment,
  rescheduleAppointment,
  getBookedSlots,
} from "../controllers/appointment.controller.js";
import { protectRoute } from "../middlewares/protectRoute.js";

const router = express.Router();

// Public routes (no authentication required)
router.get("/booked-slots", getBookedSlots);

// Routes that support both authenticated and guest users
router.post("/", (req, res, next) => {
  // If guestPatient is provided, skip authentication
  if (req.body.guestPatient) {
    return next();
  }
  // Otherwise, require authentication
  return protectRoute(req, res, next);
}, createAppointment);

// Protected routes (authentication required)
router.use(protectRoute);
router.get("/", getUserAppointments);
router.get("/:id", getAppointmentById);
router.patch("/:id/cancel", cancelAppointment);
router.patch("/:id/reschedule", rescheduleAppointment);

export default router;
