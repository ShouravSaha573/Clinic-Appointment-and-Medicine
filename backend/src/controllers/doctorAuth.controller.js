import bcrypt from "bcryptjs";
import DoctorAuth from "../models/doctorAuth.model.js";
import Doctor from "../models/doctor.model.js";
import { genToken } from "../lib/genToken.js";
import cloudinary from "../lib/cloudinary.js";
import jwt from "jsonwebtoken";
import DoctorDailySession from "../models/doctorDailySession.model.js";

const getLocalTodayKey = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildSessionPayload = (doctorAuthDoc) => {
  if (!doctorAuthDoc) return null;
  return {
    lastLogin: doctorAuthDoc.lastLogin || null,
    currentSessionStartedAt: doctorAuthDoc.currentSessionStartedAt || null,
    currentSessionAccruedAt: doctorAuthDoc.currentSessionAccruedAt || null,
    todayKey: doctorAuthDoc.todayKey || null,
    todayTotalSeconds: Number(doctorAuthDoc.todayTotalSeconds || 0),
    lastLogoutAt: doctorAuthDoc.lastLogoutAt || null,
  };
};

const addDailySeconds = async ({ doctorAuth, dateKey, seconds, now }) => {
  if (!doctorAuth?._id || !doctorAuth?.doctorProfile || !dateKey) return;
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  if (safeSeconds <= 0) return;

  await DoctorDailySession.updateOne(
    { doctorAuth: doctorAuth._id, dateKey },
    {
      $setOnInsert: { doctorProfile: doctorAuth.doctorProfile },
      $inc: { totalSeconds: safeSeconds },
      $set: { lastUpdatedAt: now || new Date() },
    },
    { upsert: true }
  );
};

export const signup = async (req, res) => {
  const { email, password, doctorId } = req.body;

  try {
    // Avoid dual-session confusion: doctor auth should clear any user cookie.
    res.cookie("jwt", "", { maxAge: 0 });

    if (!email || !password || !doctorId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 4 || password.length > 8) {
      return res.status(400).json({ message: "Password must be 4-8 characters" });
    }

    // Check if doctor profile exists
    const doctorProfile = await Doctor.findById(doctorId);
    if (!doctorProfile) {
      return res.status(404).json({ message: "Doctor profile not found" });
    }

    // Check if doctor auth already exists
    const existingDoctorAuth = await DoctorAuth.findOne({ email });
    if (existingDoctorAuth) {
      return res.status(400).json({ message: "Doctor with this email already exists" });
    }

    // Check if doctor profile is already linked
    const existingProfileLink = await DoctorAuth.findOne({ doctorProfile: doctorId });
    if (existingProfileLink) {
      return res.status(400).json({ message: "This doctor profile is already registered" });
    }

    // Create new doctor auth
    const now = new Date();
    const todayKey = getLocalTodayKey(now);
    const doctorAuth = new DoctorAuth({
      email,
      password,
      doctorProfile: doctorId,
      lastLogin: now,
      currentSessionStartedAt: now,
      currentSessionAccruedAt: now,
      todayKey,
      todayTotalSeconds: 0,
    });

    if (doctorAuth) {
      // Generate JWT token
      genToken(doctorAuth._id, res, { cookieName: "doctor_jwt" });

      await doctorAuth.save();

      // Create today's record (0 seconds) so admin can see the day exists.
      await DoctorDailySession.updateOne(
        { doctorAuth: doctorAuth._id, dateKey: todayKey },
        {
          $setOnInsert: { doctorProfile: doctorAuth.doctorProfile, totalSeconds: 0 },
          $set: { lastUpdatedAt: now },
        },
        { upsert: true }
      );

      res.status(201).json({
        _id: doctorAuth._id,
        email: doctorAuth.email,
        doctor: doctorProfile,
        isVerified: doctorAuth.isVerified,
        lastLogin: doctorAuth.lastLogin,
        session: buildSessionPayload(doctorAuth),
      });
    } else {
      res.status(400).json({ message: "Invalid doctor data" });
    }
  } catch (error) {
    console.log("Error in doctor signup controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Avoid dual-session confusion: doctor auth should clear any user cookie.
    res.cookie("jwt", "", { maxAge: 0 });

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const doctorAuth = await DoctorAuth.findOne({ email }).populate('doctorProfile');
    if (!doctorAuth || !(await doctorAuth.comparePassword(password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const now = new Date();
    const todayKey = getLocalTodayKey(now);

    // Reset today's accumulator if day changed
    if (doctorAuth.todayKey !== todayKey) {
      doctorAuth.todayKey = todayKey;
      doctorAuth.todayTotalSeconds = 0;
    }

    // Update last login + start session
    doctorAuth.lastLogin = now;
    doctorAuth.currentSessionStartedAt = now;
    doctorAuth.currentSessionAccruedAt = now;
    await doctorAuth.save();

    // Ensure a record exists for today.
    await DoctorDailySession.updateOne(
      { doctorAuth: doctorAuth._id, dateKey: todayKey },
      {
        $setOnInsert: { doctorProfile: doctorAuth.doctorProfile?._id || doctorAuth.doctorProfile, totalSeconds: 0 },
        $set: { lastUpdatedAt: now },
      },
      { upsert: true }
    );

    genToken(doctorAuth._id, res, { cookieName: "doctor_jwt" });

    res.status(200).json({
      _id: doctorAuth._id,
      email: doctorAuth.email,
      doctor: doctorAuth.doctorProfile,
      isVerified: doctorAuth.isVerified,
      lastLogin: doctorAuth.lastLogin,
      session: buildSessionPayload(doctorAuth),
    });
  } catch (error) {
    console.log("Error in doctor login controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = (req, res) => {
  try {
    const token = req.cookies?.doctor_jwt;
    const jwtSecret = process.env.SECRET || process.env.secret;

    // If possible, attribute this logout to a doctor session and update totals.
    if (token && jwtSecret) {
      try {
        const decoded = jwt.verify(token, jwtSecret);
        const doctorId = decoded?.userId;
        if (doctorId) {
          DoctorAuth.findById(doctorId)
            .then(async (doctorAuth) => {
              if (!doctorAuth) return;

              const now = new Date();
              const todayKey = getLocalTodayKey(now);
              if (doctorAuth.todayKey !== todayKey) {
                doctorAuth.todayKey = todayKey;
                doctorAuth.todayTotalSeconds = 0;
              }

              if (doctorAuth.currentSessionStartedAt) {
                const from = doctorAuth.currentSessionAccruedAt || doctorAuth.currentSessionStartedAt;
                const seconds = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 1000));

                doctorAuth.todayTotalSeconds = Number(doctorAuth.todayTotalSeconds || 0) + seconds;
                await addDailySeconds({ doctorAuth, dateKey: todayKey, seconds, now });
              }

              doctorAuth.lastLogoutAt = now;
              doctorAuth.currentSessionStartedAt = null;
              doctorAuth.currentSessionAccruedAt = null;
              await doctorAuth.save();
            })
            .catch(() => {});
        }
      } catch {
        // ignore
      }
    }

    res.cookie("doctor_jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in doctor logout controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = async (req, res) => {
  try {
    const token = req.cookies?.doctor_jwt;

    // Not logged in as doctor -> not an error for "check".
    if (!token) {
      return res.status(200).json(null);
    }

    const jwtSecret = process.env.SECRET || process.env.secret;
    if (!jwtSecret) {
      return res.status(500).json({ message: "JWT secret not configured" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (e) {
      // Invalid/expired cookie -> clear and treat as logged out.
      res.cookie("doctor_jwt", "", { maxAge: 0 });
      return res.status(200).json(null);
    }

    const doctorAuth = await DoctorAuth.findById(decoded.userId)
      .populate("doctorProfile")
      .select("-password");

    if (!doctorAuth) {
      res.cookie("doctor_jwt", "", { maxAge: 0 });
      return res.status(200).json(null);
    }

    return res.status(200).json({
      _id: doctorAuth._id,
      email: doctorAuth.email,
      doctor: doctorAuth.doctorProfile,
      isVerified: doctorAuth.isVerified,
      lastLogin: doctorAuth.lastLogin,
      session: buildSessionPayload(doctorAuth),
    });
  } catch (error) {
    console.log("Error in doctor checkAuth controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const currentPassword = typeof req.body.currentPassword === "string" ? req.body.currentPassword : "";
    const newPassword = typeof req.body.newPassword === "string" ? req.body.newPassword.trim() : "";
    const wantsPasswordChange = !!(currentPassword || newPassword);

    const fullNameRaw =
      (typeof req.body.fullName === "string" && req.body.fullName.trim())
        ? req.body.fullName.trim()
        : (typeof req.body.name === "string" && req.body.name.trim())
          ? req.body.name.trim()
          : "";

    const emailRaw = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";

    // Accept either key for convenience/compatibility
    const profileImageRaw =
      (typeof req.body.profileImage === "string" && req.body.profileImage.trim())
        ? req.body.profileImage.trim()
        : (typeof req.body.profilePic === "string" && req.body.profilePic.trim())
          ? req.body.profilePic.trim()
          : "";

    const consultationFeeRaw = req.body.consultationFee;
    const hasConsultationFee = consultationFeeRaw !== undefined && consultationFeeRaw !== null && consultationFeeRaw !== "";

    if (!profileImageRaw && !wantsPasswordChange && !fullNameRaw && !emailRaw && !hasConsultationFee) {
      return res.status(400).json({ message: "No profile fields provided" });
    }

    const doctorAuth = await DoctorAuth.findById(req.doctorId);
    if (!doctorAuth) {
      return res.status(401).json({ message: "Doctor not found" });
    }

    // Update email (keeps DoctorAuth + Doctor profile in sync)
    if (emailRaw) {
      const existingAuth = await DoctorAuth.findOne({ email: emailRaw, _id: { $ne: req.doctorId } });
      if (existingAuth) {
        return res.status(400).json({ message: "Email is already in use" });
      }
    }

    if (wantsPasswordChange) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required" });
      }
      if (!newPassword) {
        return res.status(400).json({ message: "New password is required" });
      }
      if (newPassword.length < 4 || newPassword.length > 8) {
        return res.status(400).json({ message: "Password must be 4-8 characters" });
      }

      const ok = await doctorAuth.comparePassword(currentPassword);
      if (!ok) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      doctorAuth.password = newPassword;
    }

    const hasCloudinaryConfig =
      !!process.env.CLOUDINARY_CLOUD_NAME &&
      !!process.env.CLOUDINARY_API_KEY &&
      !!process.env.CLOUDINARY_API_SECRET;

    const doctorFields = {};

    if (fullNameRaw) {
      doctorFields.name = fullNameRaw;
    }

    if (emailRaw) {
      // Doctor model also has a unique email field
      const existingDoctor = await Doctor.findOne({ email: emailRaw, _id: { $ne: doctorAuth.doctorProfile } });
      if (existingDoctor) {
        return res.status(400).json({ message: "Email is already in use" });
      }
      doctorFields.email = emailRaw;
      doctorAuth.email = emailRaw;
    }

    if (hasConsultationFee) {
      const feeNumber = Number(consultationFeeRaw);
      if (!Number.isFinite(feeNumber) || feeNumber < 0) {
        return res.status(400).json({ message: "Consultation fee must be a non-negative number" });
      }
      doctorFields.consultationFee = feeNumber;
    }

    if (profileImageRaw) {
      let profileImageToSave = profileImageRaw;

      if (hasCloudinaryConfig) {
        try {
          const uploadResult = await cloudinary.uploader.upload(profileImageRaw, {
            folder: "clinic-app/doctor-profile-images",
          });
          profileImageToSave = uploadResult.secure_url;
        } catch (uploadError) {
          console.error("Cloudinary upload failed (doctor profile image):", uploadError);
          return res.status(502).json({
            message: "Failed to upload profile picture. Please try again.",
          });
        }
      } else {
        // Guard against very large data URLs (MongoDB doc limit ~16MB)
        if (profileImageRaw.length > 8_000_000) {
          return res.status(413).json({
            message: "Profile picture is too large. Please upload a smaller image.",
          });
        }
      }

      doctorFields.profileImage = profileImageToSave;
    }

    let updatedDoctor = null;
    if (Object.keys(doctorFields).length > 0) {
      updatedDoctor = await Doctor.findByIdAndUpdate(
        doctorAuth.doctorProfile,
        doctorFields,
        { new: true }
      );
    }

    if (wantsPasswordChange || emailRaw) {
      await doctorAuth.save();
    }

    const hydrated = await DoctorAuth.findById(req.doctorId)
      .populate("doctorProfile")
      .select("-password");

    return res.status(200).json({
      _id: hydrated._id,
      email: hydrated.email,
      doctor: hydrated.doctorProfile || updatedDoctor,
      isVerified: hydrated.isVerified,
      lastLogin: hydrated.lastLogin,
      session: buildSessionPayload(hydrated),
    });
  } catch (error) {
    console.log("Error in doctor updateProfile controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
