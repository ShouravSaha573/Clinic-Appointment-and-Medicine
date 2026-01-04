import express from "express";
import {
  addDoctor,
  getAllDoctorsAdmin,
  updateDoctor,
  deleteDoctor,
  toggleDoctorStatus,
  getDoctorById,
  getAdminStats,
  getAllUsersAdmin,
  toggleUserStatus,
  getDoctorDailySessionTotal,
  getDoctorDailySessionsHistory,
  getDoctorsMonthlyOutcome,
  updateDoctorSalary,
  getMedicineSoldOutcome
} from "../controllers/admin.controller.js";
import { protectAdminRoute } from "../middlewares/protectAdminRoute.js";

const router = express.Router();

// All routes require admin authentication
router.use(protectAdminRoute);

// Admin statistics
router.get("/stats", getAdminStats);

// User management routes (excluding admins)
router.get("/users", getAllUsersAdmin);
router.patch("/users/:id/toggle-status", toggleUserStatus);

// Doctor management routes
router.post("/doctors", addDoctor);
router.get("/doctors", getAllDoctorsAdmin);
router.get("/doctors/monthly-outcome", getDoctorsMonthlyOutcome);

// Medicine sold outcome
router.get("/medicine-sold-outcome", getMedicineSoldOutcome);

router.patch("/doctors/:id/salary", updateDoctorSalary);
router.get("/doctors/:id/daily-session", getDoctorDailySessionTotal);
router.get("/doctors/:id/sessions", getDoctorDailySessionsHistory);
router.get("/doctors/:id", getDoctorById);
router.put("/doctors/:id", updateDoctor);
router.delete("/doctors/:id", deleteDoctor);
router.patch("/doctors/:id/toggle-status", toggleDoctorStatus);

export default router;
