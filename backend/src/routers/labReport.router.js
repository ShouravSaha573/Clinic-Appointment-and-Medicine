import express from "express";
import {
  getUserLabReports,
  getLabReportById,
  downloadLabReport,
  getAllLabReports,
  createLabReport,
  createFlexibleLabReport,
  updateLabReport,
  verifyLabReport,
  deleteLabReport,
  getLabReportStats,
  upload,
} from "../controllers/labReport.controller.js";
import { protectRoute } from "../middlewares/protectRoute.js";
import { adminRequired } from "../middlewares/adminRequired.js";

const router = express.Router();

// User routes (protected)
router.get("/my-reports", protectRoute, getUserLabReports);
router.get("/:id", protectRoute, getLabReportById);
router.get("/:id/download", protectRoute, downloadLabReport);

// Admin routes (protected)
router.get("/admin/all", protectRoute, adminRequired, getAllLabReports);
router.post("/admin/create", protectRoute, adminRequired, upload.single("reportFile"), createLabReport);
router.post("/admin/create-flexible", protectRoute, adminRequired, createFlexibleLabReport);
router.put("/admin/:id", protectRoute, adminRequired, upload.single("reportFile"), updateLabReport);
router.put("/admin/:id/verify", protectRoute, adminRequired, verifyLabReport);
router.delete("/admin/:id", protectRoute, adminRequired, deleteLabReport);
router.get("/admin/stats", protectRoute, adminRequired, getLabReportStats);

export default router;
