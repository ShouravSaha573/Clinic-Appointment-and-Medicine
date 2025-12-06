import express from "express";
import {
  getDoctors,
  getDoctorById,
  getSpecializations,
  getDoctorAvailableSlots,
  createDoctor,
} from "../controllers/doctor.controller.js";

const router = express.Router();

router.get("/", getDoctors);
router.get("/specializations", getSpecializations);
router.get("/:id", getDoctorById);
router.get("/:id/available-slots", getDoctorAvailableSlots);

// Admin routes (you might want to add admin middleware)
router.post("/", createDoctor);

export default router;
