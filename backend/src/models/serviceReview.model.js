import mongoose from "mongoose";

const serviceReviewSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    serviceType: {
      type: String,
      enum: ["lab_test", "medicine_order", "appointment_booking", "overall_service"],
      required: true
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: function() {
        return this.serviceType !== "overall_service";
      }
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
      serviceQuality: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      },
      timeliness: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      },
      staff: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      },
      facilities: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      }
    },
    suggestions: {
      type: String,
      trim: true,
      maxlength: 500
    },
    isAnonymous: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    adminResponse: {
      text: String,
      respondedAt: Date,
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    },
    helpfulCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
serviceReviewSchema.index({ serviceType: 1, createdAt: -1 });
serviceReviewSchema.index({ patientId: 1 });
serviceReviewSchema.index({ rating: 1 });
serviceReviewSchema.index({ status: 1 });

const ServiceReview = mongoose.model("ServiceReview", serviceReviewSchema);
export default ServiceReview;
