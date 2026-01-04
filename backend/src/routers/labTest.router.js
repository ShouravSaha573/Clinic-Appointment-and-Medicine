import express from "express";
import {
  getLabTests,
  getLabTestById,
  getLabTestsByCategory,
  getPopularLabTests,
  createLabTest,
  updateLabTest,
  deleteLabTest,
  getLabTestStats,
} from "../controllers/labTest.controller.js";
import { protectRoute } from "../middlewares/protectRoute.js";

const router = express.Router();

// Public routes
router.get("/", getLabTests);
router.get("/popular", getPopularLabTests);
router.get("/category/:category", getLabTestsByCategory);
router.get("/:id", getLabTestById);

// Admin routes
router.post("/", protectRoute, createLabTest);
router.put("/:id", protectRoute, updateLabTest);
router.delete("/:id", protectRoute, deleteLabTest);
router.get("/admin/stats", protectRoute, getLabTestStats);

export default router;
