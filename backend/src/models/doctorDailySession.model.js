import mongoose from "mongoose";

const doctorDailySessionSchema = new mongoose.Schema(
  {
    doctorAuth: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DoctorAuth",
      required: true,
      index: true,
    },
    doctorProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    totalSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUpdatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "doctordailysessions",
  }
);

doctorDailySessionSchema.index({ doctorAuth: 1, dateKey: 1 }, { unique: true });

const DoctorDailySession = mongoose.model("DoctorDailySession", doctorDailySessionSchema);

export default DoctorDailySession;
