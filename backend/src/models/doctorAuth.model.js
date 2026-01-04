import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const doctorAuthSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    doctorProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    lastLogin: {
      type: Date,
    },

    // Session tracking
    currentSessionStartedAt: {
      type: Date,
    },
    currentSessionAccruedAt: {
      type: Date,
    },
    todayKey: {
      type: String,
    },
    todayTotalSeconds: {
      type: Number,
      default: 0,
    },
    lastLogoutAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
doctorAuthSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
doctorAuthSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const DoctorAuth = mongoose.model("DoctorAuth", doctorAuthSchema);

export default DoctorAuth;
