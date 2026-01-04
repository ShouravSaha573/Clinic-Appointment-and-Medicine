import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    specialization: {
      type: String,
      required: true,
      enum: [
        "General Medicine",
        "Cardiology",
        "Dermatology",
        "Pediatrics",
        "Orthopedics",
        "Neurology",
        "Psychiatry",
        "Ophthalmology",
        "ENT",
        "Gynecology",
        "Urology",
        "Oncology",
        "Endocrinology",
        "Gastroenterology",
        "Pulmonology",
      ],
    },
    qualification: {
      type: String,
      required: true,
    },
    experience: {
      type: Number,
      required: true,
      min: 0,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    profileImage: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    consultationFee: {
      type: Number,
      required: true,
      min: 0,
    },
    salary: {
      type: Number,
      default: 0,
      min: 0,
    },
    salaryPrevious: {
      type: Number,
      default: 0,
      min: 0,
    },
    salaryLastMessage: {
      type: String,
      default: "",
      trim: true,
    },
    salaryLastUpdatedAt: {
      type: Date,
      default: null,
    },
    availableSlots: [
      {
        day: {
          type: String,
          enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          required: true,
        },
        startTime: {
          type: String,
          required: true,
        },
        endTime: {
          type: String,
          required: true,
        },
      }
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient admin queries
doctorSchema.index({ isActive: 1 });
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ email: 1 });
doctorSchema.index({ name: "text" });

const Doctor = mongoose.model("Doctor", doctorSchema);

export default Doctor;
