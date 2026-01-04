import Review from "../models/review.model.js";
import ServiceReview from "../models/serviceReview.model.js";
import Doctor from "../models/doctor.model.js";
import Appointment from "../models/appointment.model.js";
import mongoose from "mongoose";

// Create doctor review
export const createDoctorReview = async (req, res) => {
  try {
    const { doctorId, rating, reviewText, categories, isAnonymous } = req.body;
    const patientId = req.user._id;

    if (!doctorId) {
      return res.status(400).json({ message: "Doctor ID is required" });
    }
    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }
    if (!reviewText || !String(reviewText).trim()) {
      return res.status(400).json({ message: "Review text is required" });
    }

    // Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Check if user has already reviewed this doctor
    const existingReview = await Review.findOne({
      patientId,
      doctorId
    });

    if (existingReview) {
      existingReview.rating = rating;
      existingReview.reviewText = reviewText;
      if (categories && Object.keys(categories).length > 0) {
        existingReview.categories = categories;
      }
      existingReview.isAnonymous = Boolean(isAnonymous);
      existingReview.isVerified = true;
      existingReview.status = "approved";

      await existingReview.save();
      await updateDoctorRating(doctorId);

      const populatedReview = await Review.findById(existingReview._id)
        .populate('patientId', 'fullName profilePic')
        .populate('doctorId', 'name specialization');

      return res.status(200).json({
        message: "Review updated successfully",
        review: populatedReview,
      });
    }

    const review = new Review({
      patientId,
      doctorId,
      rating,
      reviewText,
      ...(categories && Object.keys(categories).length > 0 && { categories }),
      isAnonymous: Boolean(isAnonymous),
      isVerified: true, // Since users can review any doctor
      status: "approved" // Auto-approve reviews
    });

    await review.save();

    // Update doctor's average rating
    await updateDoctorRating(doctorId);

    const populatedReview = await Review.findById(review._id)
      .populate('patientId', 'fullName profilePic')
      .populate('doctorId', 'name specialization');

    res.status(201).json({
      message: "Review submitted successfully",
      review: populatedReview
    });
  } catch (error) {
    // In case of a race condition, the unique index may throw a duplicate key error.
    // Treat it as an update.
    if (error && error.code === 11000) {
      try {
        const { doctorId, rating, reviewText, categories, isAnonymous } = req.body;
        const patientId = req.user._id;

        const updated = await Review.findOneAndUpdate(
          { patientId, doctorId },
          {
            $set: {
              rating,
              reviewText,
              ...(categories && Object.keys(categories).length > 0 ? { categories } : {}),
              isAnonymous: Boolean(isAnonymous),
              isVerified: true,
              status: "approved",
            },
          },
          { new: true }
        )
          .populate('patientId', 'fullName profilePic')
          .populate('doctorId', 'name specialization');

        await updateDoctorRating(doctorId);

        return res.status(200).json({
          message: "Review updated successfully",
          review: updated,
        });
      } catch (innerError) {
        console.error("Error handling duplicate review upsert:", innerError);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
    console.error("Error creating doctor review:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get current patient's review for a doctor (protected)
export const getMyDoctorReview = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const patientId = req.user._id;

    const review = await Review.findOne({ patientId, doctorId })
      .populate('patientId', 'fullName profilePic')
      .populate('doctorId', 'name specialization');

    return res.json({ hasReviewed: Boolean(review), review });
  } catch (error) {
    console.error("Error fetching my doctor review:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create service review
export const createServiceReview = async (req, res) => {
  try {
    const { serviceType, serviceId, rating, reviewText, categories, suggestions, isAnonymous } = req.body;
    const patientId = req.user._id;

    // Make service reviews idempotent per user + service target.
    const existingServiceReview = await ServiceReview.findOne({
      patientId,
      serviceType,
      ...(serviceType === "overall_service" ? { serviceId: { $exists: false } } : { serviceId }),
    });

    if (existingServiceReview) {
      existingServiceReview.rating = rating;
      existingServiceReview.reviewText = reviewText;
      if (categories && Object.keys(categories).length > 0) {
        existingServiceReview.categories = categories;
      }
      if (typeof suggestions === "string") {
        existingServiceReview.suggestions = suggestions;
      }
      existingServiceReview.isAnonymous = Boolean(isAnonymous);
      existingServiceReview.status = "approved";

      await existingServiceReview.save();

      const populatedReview = await ServiceReview.findById(existingServiceReview._id)
        .populate('patientId', 'fullName profilePic');

      return res.status(200).json({
        message: "Service review updated successfully",
        review: populatedReview,
      });
    }

    const serviceReview = new ServiceReview({
      patientId,
      serviceType,
      serviceId,
      rating,
      reviewText,
      categories,
      suggestions,
      isAnonymous: isAnonymous || false,
      status: "approved" // Auto-approve service reviews
    });

    await serviceReview.save();

    const populatedReview = await ServiceReview.findById(serviceReview._id)
      .populate('patientId', 'fullName profilePic');

    res.status(201).json({
      message: "Service review submitted successfully",
      review: populatedReview
    });
  } catch (error) {
    console.error("Error creating service review:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get doctor reviews
export const getDoctorReviews = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = req.query;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    const reviews = await Review.find({
      doctorId,
      status: "approved"
    })
      .populate('patientId', 'fullName profilePic')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({
      doctorId,
      status: "approved"
    });

    // Calculate rating statistics
    const ratingStats = await Review.aggregate([
      { $match: { doctorId: new mongoose.Types.ObjectId(doctorId), status: "approved" } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          ratings: {
            $push: {
              overall: "$rating",
              consultation: "$categories.consultation",
              punctuality: "$categories.punctuality",
              communication: "$categories.communication",
              treatment: "$categories.treatment"
            }
          }
        }
      }
    ]);

    const stats = ratingStats[0] || {
      averageRating: 0,
      totalReviews: 0,
      ratings: []
    };

    res.json({
      reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalReviews: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      stats
    });
  } catch (error) {
    console.error("Error fetching doctor reviews:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get service reviews
export const getServiceReviews = async (req, res) => {
  try {
    const { serviceType } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const reviews = await ServiceReview.find({
      serviceType,
      status: "approved"
    })
      .populate('patientId', 'fullName profilePic')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ServiceReview.countDocuments({
      serviceType,
      status: "approved"
    });

    res.json({
      reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalReviews: total
      }
    });
  } catch (error) {
    console.error("Error fetching service reviews:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get patient's reviews
export const getPatientReviews = async (req, res) => {
  try {
    const patientId = req.user._id;
    const { type = "all" } = req.query;

    let reviews = [];

    if (type === "all" || type === "doctor") {
      const doctorReviews = await Review.find({ patientId })
        .populate('doctorId', 'name specialization profileImage')
        .populate('appointmentId', 'appointmentDate timeSlot')
        .sort({ createdAt: -1 });
      
      reviews.push(...doctorReviews.map(review => ({
        ...review.toObject(),
        type: "doctor"
      })));
    }

    if (type === "all" || type === "service") {
      const serviceReviews = await ServiceReview.find({ patientId })
        .sort({ createdAt: -1 });
      
      reviews.push(...serviceReviews.map(review => ({
        ...review.toObject(),
        type: "service"
      })));
    }

    // Sort by creation date if getting all types
    if (type === "all") {
      reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.json({ reviews });
  } catch (error) {
    console.error("Error fetching patient reviews:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get reviewable appointments (completed appointments without reviews)
export const getReviewableAppointments = async (req, res) => {
  try {
    const patientId = req.user._id;

    // Get completed appointments
    const completedAppointments = await Appointment.find({
      patientId,
      status: "completed"
    })
      .populate('doctorId', 'name specialization profileImage')
      .sort({ appointmentDate: -1 });

    // Get appointments that already have reviews
    const reviewedAppointmentIds = await Review.find({
      patientId,
      appointmentId: { $in: completedAppointments.map(apt => apt._id) }
    }).distinct('appointmentId');

    // Filter out reviewed appointments
    const reviewableAppointments = completedAppointments.filter(
      appointment => !reviewedAppointmentIds.some(id => id.toString() === appointment._id.toString())
    );

    res.json({ appointments: reviewableAppointments });
  } catch (error) {
    console.error("Error fetching reviewable appointments:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function to update doctor's average rating
const updateDoctorRating = async (doctorId) => {
  try {
    const ratingStats = await Review.aggregate([
      { $match: { doctorId: new mongoose.Types.ObjectId(doctorId), status: "approved" } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    const stats = ratingStats[0] || { averageRating: 0, totalReviews: 0 };

    await Doctor.findByIdAndUpdate(doctorId, {
      rating: Math.round(stats.averageRating * 10) / 10, // Round to 1 decimal
      totalReviews: stats.totalReviews
    });
  } catch (error) {
    console.error("Error updating doctor rating:", error);
  }
};

// Mark review as helpful
export const markReviewHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { type = "doctor" } = req.body;

    const Model = type === "doctor" ? Review : ServiceReview;
    
    const review = await Model.findByIdAndUpdate(
      reviewId,
      { $inc: { helpfulCount: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json({ message: "Review marked as helpful", helpfulCount: review.helpfulCount });
  } catch (error) {
    console.error("Error marking review as helpful:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Admin: Get all reviews for moderation
export const getAllReviewsForAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "all", type = "all" } = req.query;
    const skip = (page - 1) * limit;

    let reviews = [];

    if (type === "all" || type === "doctor") {
      const doctorReviewsQuery = status === "all" ? {} : { status };
      const doctorReviews = await Review.find(doctorReviewsQuery)
        .populate('patientId', 'fullName email')
        .populate('doctorId', 'name specialization')
        .populate('appointmentId', 'appointmentDate')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      reviews.push(...doctorReviews.map(review => ({
        ...review.toObject(),
        reviewType: "doctor"
      })));
    }

    if (type === "all" || type === "service") {
      const serviceReviewsQuery = status === "all" ? {} : { status };
      const serviceReviews = await ServiceReview.find(serviceReviewsQuery)
        .populate('patientId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      reviews.push(...serviceReviews.map(review => ({
        ...review.toObject(),
        reviewType: "service"
      })));
    }

    res.json({ reviews });
  } catch (error) {
    console.error("Error fetching reviews for admin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
