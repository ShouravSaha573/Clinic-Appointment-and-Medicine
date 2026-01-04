import express from "express";
import {
  createDoctorReview,
  createServiceReview,
  getDoctorReviews,
  getMyDoctorReview,
  getServiceReviews,
  getPatientReviews,
  getReviewableAppointments,
  markReviewHelpful,
  getAllReviewsForAdmin
} from "../controllers/review.controller.js";
import { protectRoute } from "../middlewares/protectRoute.js";

const router = express.Router();

// Patient routes (protected)
router.post("/doctor", protectRoute, createDoctorReview);
router.post("/service", protectRoute, createServiceReview);
router.get("/my-reviews", protectRoute, getPatientReviews);
router.get("/reviewable-appointments", protectRoute, getReviewableAppointments);
router.put("/:reviewId/helpful", protectRoute, markReviewHelpful);

// Public routes
router.get("/doctor/:doctorId", getDoctorReviews);
// Patient-specific doctor review (protected)
router.get("/doctor/:doctorId/my", protectRoute, getMyDoctorReview);
router.get("/service/:serviceType", getServiceReviews);

// Admin routes (protected)
router.get("/admin/all", protectRoute, getAllReviewsForAdmin);

export default router;
