import jwt from "jsonwebtoken";
import DoctorAuth from "../models/doctorAuth.model.js";
import DoctorDailySession from "../models/doctorDailySession.model.js";

const getLocalTodayKey = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDailySeconds = async ({ doctorAuth, dateKey, seconds, now }) => {
  if (!doctorAuth?._id || !doctorAuth?.doctorProfile || !dateKey) return;
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  if (safeSeconds <= 0) return;

  await DoctorDailySession.updateOne(
    { doctorAuth: doctorAuth._id, dateKey },
    {
      $setOnInsert: { doctorProfile: doctorAuth.doctorProfile, totalSeconds: 0 },
      $inc: { totalSeconds: safeSeconds },
      $set: { lastUpdatedAt: now || new Date() },
    },
    { upsert: true }
  );
};

export const protectDoctorRoute = async (req, res, next) => {
  try {
    const token = req.cookies.doctor_jwt;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    const jwtSecret = process.env.SECRET || process.env.secret;
    if (!jwtSecret) {
      return res.status(500).json({ message: "JWT secret not configured" });
    }

    const decoded = jwt.verify(token, jwtSecret);

    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }

    const doctor = await DoctorAuth.findById(decoded.userId).select("-password");

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // --- Session accrual for daily totals (non-blocking) ---
    // Never fail doctor endpoints due to session tracking issues.
    try {
      const now = new Date();
      const todayKeyNow = getLocalTodayKey(now);
      const existingKey = doctor.todayKey || todayKeyNow;

      if (!doctor.todayKey) {
        doctor.todayKey = todayKeyNow;
        doctor.todayTotalSeconds = Number(doctor.todayTotalSeconds || 0);
      }

      // Only accrue if they have an active session.
      if (doctor.currentSessionStartedAt) {
        const from = doctor.currentSessionAccruedAt || doctor.currentSessionStartedAt;
        const deltaSeconds = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 1000));

        // Throttle DB writes a bit (still accurate enough for "daily total")
        if (deltaSeconds >= 10) {
          if (existingKey !== todayKeyNow) {
            doctor.todayKey = todayKeyNow;
            doctor.todayTotalSeconds = 0;
          }

          doctor.todayTotalSeconds = Number(doctor.todayTotalSeconds || 0) + deltaSeconds;
          doctor.currentSessionAccruedAt = now;

          await addDailySeconds({ doctorAuth: doctor, dateKey: doctor.todayKey, seconds: deltaSeconds, now });
          await doctor.save();
        }
      }
    } catch (e) {
      console.log("Doctor session accrual skipped:", e?.message || e);
    }

    req.doctorId = doctor._id;
    next();
  } catch (error) {
    console.log("Error in protectDoctorRoute middleware: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
