import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function() {
        return !this.guestPatient;
      },
    },
    guestPatient: {
      name: {
        type: String,
        required: function() {
          return !this.patient;
        },
      },
      email: {
        type: String,
        required: function() {
          return !this.patient;
        },
      },
      phone: {
        type: String,
        required: function() {
          return !this.patient;
        },
      },
      age: {
        type: Number,
        required: function() {
          return !this.patient;
        },
      },
      gender: {
        type: String,
        enum: ["male", "female", "other"],
        required: function() {
          return !this.patient;
        },
      },
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    appointmentDate: {
      type: Date,
      required: true,
    },
    appointmentTime: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      default: 30, // 30 minutes default
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected", "completed", "cancelled", "no-show"],
      default: "pending",
    },
    doctorResponse: {
      respondedAt: {
        type: Date,
      },
      responseMessage: {
        type: String,
        maxlength: 500,
      },
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    prescription: {
      type: String,
      maxlength: 2000,
    },
    fees: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending",
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    confirmationSent: {
      type: Boolean,
      default: false,
    },
    reminderScheduled: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
appointmentSchema.index({ doctor: 1, appointmentDate: 1, appointmentTime: 1 });
appointmentSchema.index({ patient: 1, appointmentDate: 1 });

const Appointment = mongoose.model("Appointment", appointmentSchema);

export default Appointment;
