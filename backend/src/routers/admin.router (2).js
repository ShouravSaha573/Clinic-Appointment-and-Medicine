import express from "express";
import {
  addDoctor,
  getAllDoctorsAdmin,
  updateDoctor,
  deleteDoctor,
  toggleDoctorStatus,
  getDoctorById,
  getAdminStats
} from "../controllers/admin.controller.js";
import { protectAdminRoute } from "../middlewares/protectAdminRoute.js";

const router = express.Router();

// All routes require admin authentication
router.use(protectAdminRoute);

// Admin statistics
router.get("/stats", getAdminStats);

// Doctor management routes
router.post("/doctors", addDoctor);
router.get("/doctors", getAllDoctorsAdmin);
router.get("/doctors/:id", getDoctorById);
router.put("/doctors/:id", updateDoctor);
router.delete("/doctors/:id", deleteDoctor);
router.patch("/doctors/:id/toggle-status", toggleDoctorStatus);

export default router;
