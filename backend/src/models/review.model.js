import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: false
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    reviewText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    categories: {
      consultation: {
        type: Number,
        min: 1,
        max: 5,
        required: false
      },
      punctuality: {
        type: Number,
        min: 1,
        max: 5,
        required: false
      },
      communication: {
        type: Number,
        min: 1,
        max: 5,
        required: false
      },
      treatment: {
        type: Number,
        min: 1,
        max: 5,
        required: false
      }
    },
    isAnonymous: {
      type: Boolean,
      default: false
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    adminResponse: {
      text: String,
      respondedAt: Date,
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    helpfulCount: {
      type: Number,
      default: 0
    },
    reportCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
reviewSchema.index({ doctorId: 1, createdAt: -1 });
reviewSchema.index({ patientId: 1 });
// One review per patient per doctor
reviewSchema.index({ patientId: 1, doctorId: 1 }, { unique: true });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ status: 1 });

// Virtual for overall rating calculation
reviewSchema.virtual('overallRating').get(function() {
  const { consultation, punctuality, communication, treatment } = this.categories || {};
  
  // If we have category ratings, calculate average
  if (consultation && punctuality && communication && treatment) {
    return (consultation + punctuality + communication + treatment) / 4;
  }
  
  // Otherwise, use the main rating
  return this.rating;
});

const Review = mongoose.model("Review", reviewSchema);
export default Review;
