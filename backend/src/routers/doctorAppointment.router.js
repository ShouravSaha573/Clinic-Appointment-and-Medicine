import express from "express";
import {
  getDoctorAppointments,
  respondToAppointment,
  updateAppointmentNotes,
  completeAppointment,
  getDoctorStats
} from "../controllers/doctorAppointment.controller.js";
import { protectDoctorRoute } from "../middlewares/protectDoctorRoute.js";

const router = express.Router();

// All routes require doctor authentication
router.use(protectDoctorRoute);

router.get("/", getDoctorAppointments);
router.get("/stats", getDoctorStats);
router.patch("/:id/respond", respondToAppointment);
router.patch("/:id/notes", updateAppointmentNotes);
router.patch("/:id/complete", completeAppointment);

export default router;
