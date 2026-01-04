import express from "express";
import {
  getMedicines,
  getMedicineById,
  getCategories,
  searchMedicines,
  getFeaturedMedicines,
  getAllMedicinesForAdmin,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  updateStock,
  getLowStockMedicines,
  getExpiredMedicines,
} from "../controllers/medicine.controller.js";
import { protectRoute } from "../middlewares/protectRoute.js";
import { adminRequired } from "../middlewares/adminRequired.js";

const router = express.Router();

// Public routes
router.get("/", getMedicines);
router.get("/categories", getCategories);
router.get("/search", searchMedicines);
router.get("/featured", getFeaturedMedicines);

// Admin routes
router.get("/admin/all", protectRoute, adminRequired, getAllMedicinesForAdmin);
router.post("/", protectRoute, adminRequired, createMedicine);
router.put("/:id", protectRoute, adminRequired, updateMedicine);
router.delete("/:id", protectRoute, adminRequired, deleteMedicine);
router.patch("/:id/stock", protectRoute, adminRequired, updateStock);
router.get("/admin/low-stock", protectRoute, adminRequired, getLowStockMedicines);
router.get("/admin/expired", protectRoute, adminRequired, getExpiredMedicines);

// Keep parameterized routes at the end so they don't swallow more specific paths.
router.get("/:id", getMedicineById);

export default router;
