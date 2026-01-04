import mongoose from "mongoose";

const labBookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      unique: true,
      // Will be auto-generated
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tests: [
      {
        testId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "LabTest",
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
        },
      }
    ],
    appointmentDate: {
      type: Date,
      required: true,
    },
    timeSlot: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery", "online"],
      default: "cash_on_delivery",
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "sample_collected",
        "processing",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },
    homeCollection: {
      required: {
        type: Boolean,
        default: false,
      },
      address: {
        type: String,
        default: "",
      },
    },
    notes: {
      type: String,
      default: "",
    },
    adminNotes: {
      type: String,
      default: "",
    },
    sampleCollectedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Generate booking number before saving
labBookingSchema.pre("save", function (next) {
  if (!this.bookingNumber) {
    const date = new Date();
    const dateString = date.getFullYear().toString() + 
                      (date.getMonth() + 1).toString().padStart(2, '0') + 
                      date.getDate().toString().padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.bookingNumber = `LAB${dateString}${randomNum}`;
  }
  next();
});

// Index for better query performance
labBookingSchema.index({ userId: 1, appointmentDate: -1 });
//labBookingSchema.index({ bookingNumber: 1 });
labBookingSchema.index({ status: 1 });
labBookingSchema.index({ createdAt: -1 });
labBookingSchema.index({ appointmentDate: 1 });

const LabBooking = mongoose.model("LabBooking", labBookingSchema);

export default LabBooking;
