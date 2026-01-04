import Doctor from "../models/doctor.model.js";
import User from "../models/user.model.js";
import DoctorAuth from "../models/doctorAuth.model.js";
import DoctorDailySession from "../models/doctorDailySession.model.js";
import Appointment from "../models/appointment.model.js";
import Order from "../models/order.model.js";
import mongoose from "mongoose";
import cloudinary from "../lib/cloudinary.js";

const getLocalTodayKey = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getDoctorDailySessionTotal = async (req, res) => {
  try {
    const { id } = req.params; // Doctor profile id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid doctor id" });
    }

    const dateKeyRaw = typeof req.query.date === "string" ? req.query.date.trim() : "";
    const dateKey = dateKeyRaw || getLocalTodayKey(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
    }

    const doctorAuth = await DoctorAuth.findOne({ doctorProfile: id }).select(
      "doctorProfile todayKey todayTotalSeconds currentSessionStartedAt currentSessionAccruedAt lastLogin lastLogoutAt"
    );

    // Prevent browser/proxy caching; this endpoint is time-sensitive.
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    // Some deployments create doctor profiles before an auth account exists.
    // For admin analytics, treat missing auth as "no session yet" instead of an error.
    if (!doctorAuth) {
      return res.status(200).json({
        doctorId: id,
        dateKey,
        totalSeconds: 0,
        totalMinutes: 0,
        breakdown: {
          storedSeconds: 0,
          liveUnaccruedSeconds: 0,
        },
        lastLogin: null,
        lastLogoutAt: null,
        isCurrentlyLoggedIn: false,
        lastUpdatedAt: null,
      });
    }

    const record = await DoctorDailySession.findOne({ doctorAuth: doctorAuth._id, dateKey }).select(
      "totalSeconds lastUpdatedAt"
    );

    const storedSeconds = Number(record?.totalSeconds || 0);
    const now = new Date();

    const todayKeyNow = getLocalTodayKey(now);

    let liveUnaccruedSeconds = 0;
    if (doctorAuth.currentSessionStartedAt) {
      const fromRaw = doctorAuth.currentSessionAccruedAt || doctorAuth.currentSessionStartedAt;

      // For "today" requests, always compute live seconds even if todayKey is out of sync.
      if (dateKey === todayKeyNow) {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const from = new Date(Math.max(fromRaw.getTime(), startOfToday.getTime()));
        liveUnaccruedSeconds = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 1000));
      } else if (doctorAuth.todayKey === dateKey) {
        // For non-today dates, only include live seconds when the stored key matches.
        liveUnaccruedSeconds = Math.max(0, Math.floor((now.getTime() - fromRaw.getTime()) / 1000));
      }
    }

    const totalSeconds = storedSeconds + liveUnaccruedSeconds;

    return res.status(200).json({
      doctorId: id,
      dateKey,
      totalSeconds,
      totalMinutes: Math.floor(totalSeconds / 60),
      breakdown: {
        storedSeconds,
        liveUnaccruedSeconds,
      },
      lastLogin: doctorAuth.lastLogin || null,
      lastLogoutAt: doctorAuth.lastLogoutAt || null,
      isCurrentlyLoggedIn: !!doctorAuth.currentSessionStartedAt,
      lastUpdatedAt: record?.lastUpdatedAt || null,
    });
  } catch (error) {
    console.log("Error in getDoctorDailySessionTotal controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getDoctorDailySessionsHistory = async (req, res) => {
  try {
    const { id } = req.params; // Doctor profile id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid doctor id" });
    }

    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(1000, Math.floor(limitRaw)) : 365;

    const sessions = await DoctorDailySession.find({ doctorProfile: id })
      .sort({ dateKey: -1 })
      .limit(limit)
      .select("dateKey totalSeconds lastUpdatedAt");

    return res.status(200).json({
      doctorId: id,
      limit,
      sessions,
    });
  } catch (error) {
    console.log("Error in getDoctorDailySessionsHistory controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

const parseMonthKey = (monthKey, fallbackDate = new Date()) => {
  const raw = typeof monthKey === "string" ? monthKey.trim() : "";
  if (!raw) {
    return { year: fallbackDate.getFullYear(), monthIndex: fallbackDate.getMonth() };
  }

  const match = raw.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, monthIndex: month - 1 };
};

export const getDoctorsMonthlyOutcome = async (req, res) => {
  try {
    const monthKey = typeof req.query.month === "string" ? req.query.month.trim() : "";
    const parsed = parseMonthKey(monthKey, new Date());
    if (!parsed) {
      return res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });
    }

    const { year, monthIndex } = parsed;
    const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
    const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

    const [doctors, completionCounts] = await Promise.all([
      Doctor.find({}).select("name email consultationFee isActive salary").lean(),
      Appointment.aggregate([
        {
          $match: {
            status: "completed",
            appointmentDate: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: "$doctor",
            completedCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const countByDoctorId = new Map(
      (completionCounts || []).map((row) => [String(row._id), Number(row.completedCount || 0)])
    );

    const rows = (doctors || []).map((doctor) => {
      const completedCount = countByDoctorId.get(String(doctor._id)) || 0;
      const fee = Number(doctor.consultationFee || 0);
      const totalOutcome = completedCount * fee;
      const commission = totalOutcome * 0.15;
      const salary = Number(doctor.salary || 0);
      const totalSalaryForDoctor = salary + commission;

      return {
        doctorId: doctor._id,
        doctorName: doctor.name,
        doctorEmail: doctor.email,
        isActive: doctor.isActive !== false,
        completedCount,
        fee,
        totalOutcome,
        commission,
        salary,
        totalSalaryForDoctor,
      };
    });

    const totals = rows.reduce(
      (acc, row) => {
        acc.totalOutcome += Number(row?.totalOutcome || 0);
        acc.totalCommission += Number(row?.commission || 0);
        acc.totalSalary += Number(row?.salary || 0);
        return acc;
      },
      { totalOutcome: 0, totalCommission: 0, totalSalary: 0 }
    );

    // Per requirements:
    // - Outcome = totalOutcome - totalCommission
    // - Expense = total of all doctors' salary
    const summary = {
      totalOutcome: totals.totalOutcome,
      totalCommission: totals.totalCommission,
      outcome: totals.totalOutcome - totals.totalCommission,
      expense: totals.totalSalary,
    };

    rows.sort((a, b) => {
      if (b.totalOutcome !== a.totalOutcome) return b.totalOutcome - a.totalOutcome;
      if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;
      return String(a.doctorName || "").localeCompare(String(b.doctorName || ""));
    });

    const resolvedMonthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

    return res.status(200).json({
      month: resolvedMonthKey,
      range: {
        start,
        end,
      },
      commissionRate: 0.15,
      summary,
      doctors: rows,
    });
  } catch (error) {
    console.log("Error in getDoctorsMonthlyOutcome controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMedicineSoldOutcome = async (req, res) => {
  try {
    const profitRate = 0.03;

    const monthKey = typeof req.query.month === "string" ? req.query.month.trim() : "";
    const parsed = parseMonthKey(monthKey, new Date());
    if (!parsed) {
      return res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });
    }

    const { year, monthIndex } = parsed;
    const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
    const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    const resolvedMonthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(5000, Math.floor(limitRaw)) : 5000;

    // "Sold" is treated as delivered orders.
    const orders = await Order.find({ orderStatus: "delivered", createdAt: { $gte: start, $lte: end } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select(
        "orderNumber items subtotal deliveryFee discount totalAmount paymentMethod paymentStatus orderStatus createdAt actualDelivery user"
      )
      .populate("user", "fullName email phone");

    const rows = [];
    let totalSoldAmount = 0;
    let totalSoldQuantity = 0;

    for (const order of orders || []) {
      const orderItems = Array.isArray(order.items) ? order.items : [];
      for (const item of orderItems) {
        const qty = Number(item?.quantity || 0);
        const lineTotal = Number(item?.total || 0);
        totalSoldQuantity += qty;
        totalSoldAmount += lineTotal;

        rows.push({
          orderId: order._id,
          orderNumber: order.orderNumber || "",
          orderDate: order.createdAt || null,
          deliveredAt: order.actualDelivery || null,
          paymentMethod: order.paymentMethod || "",
          paymentStatus: order.paymentStatus || "",
          orderStatus: order.orderStatus || "",
          customer: {
            fullName: order.user?.fullName || "",
            email: order.user?.email || "",
            phone: order.user?.phone || "",
          },
          medicineId: item?.medicine || null,
          medicineName: item?.name || "",
          price: Number(item?.price || 0),
          quantity: qty,
          lineTotal,
        });
      }
    }

    const profit = totalSoldAmount * profitRate;

    return res.status(200).json({
      profitRate,
      month: resolvedMonthKey,
      range: { start, end },
      totals: {
        totalOrders: Array.isArray(orders) ? orders.length : 0,
        totalSoldAmount,
        totalSoldQuantity,
        profit,
      },
      items: rows,
      limit,
    });
  } catch (error) {
    console.log("Error in getMedicineSoldOutcome controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateDoctorSalary = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid doctor id" });
    }

    const salaryRaw = req.body?.salary;
    const salary = Number(salaryRaw);
    if (!Number.isFinite(salary) || salary < 0) {
      return res.status(400).json({ message: "Salary must be a non-negative number" });
    }

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const oldSalary = Number.isFinite(Number(doctor.salary)) ? Number(doctor.salary) : 0;
    const now = new Date();

    let message = "";
    if (salary > oldSalary) {
      message = `Your salary is increased (from ${oldSalary} to ${salary}).`;
    } else if (salary < oldSalary) {
      message = `Your salary is decreased (from ${oldSalary} to ${salary}).`;
    } else {
      message = `Your salary remains unchanged (${salary}).`;
    }

    doctor.salaryPrevious = oldSalary;
    doctor.salary = salary;
    doctor.salaryLastMessage = message;
    doctor.salaryLastUpdatedAt = now;

    await doctor.save();

    return res.status(200).json({
      message: "Salary updated successfully",
      doctor,
    });
  } catch (error) {
    console.log("Error in updateDoctorSalary controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const addDoctor = async (req, res) => {
  try {
    const {
      name,
      specialization,
      qualification,
      experience,
      phone,
      email,
      bio,
      consultationFee,
      availableSlots,
      profileImage
    } = req.body;

    const hasCloudinaryConfig =
      !!process.env.CLOUDINARY_CLOUD_NAME &&
      !!process.env.CLOUDINARY_API_KEY &&
      !!process.env.CLOUDINARY_API_SECRET;

    const profileImageRaw = typeof profileImage === "string" ? profileImage.trim() : "";
    let profileImageToSave = profileImageRaw;

    if (profileImageRaw) {
      if (hasCloudinaryConfig) {
        try {
          const uploadResult = await cloudinary.uploader.upload(profileImageRaw, {
            folder: "clinic-app/doctor-profile-images",
          });
          profileImageToSave = uploadResult.secure_url;
        } catch (uploadError) {
          console.error("Cloudinary upload failed (admin doctor profile image):", uploadError);
          return res.status(502).json({ message: "Failed to upload profile picture. Please try again." });
        }
      } else {
        if (profileImageRaw.length > 8_000_000) {
          return res.status(413).json({ message: "Profile picture is too large. Please upload a smaller image." });
        }
      }
    }

    // Validate required fields
    if (!name || !specialization || !qualification || !experience || !phone || !email || !consultationFee) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // Check if doctor with this email already exists
    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      return res.status(400).json({ message: "Doctor with this email already exists" });
    }

    // Validate specialization
    const validSpecializations = [
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
    ];

    if (!validSpecializations.includes(specialization)) {
      return res.status(400).json({ message: "Invalid specialization" });
    }

    // Create new doctor
    const newDoctor = new Doctor({
      name,
      specialization,
      qualification,
      experience: Number(experience),
      phone,
      email,
      bio: bio || "",
      consultationFee: Number(consultationFee),
      availableSlots: availableSlots || [],
      profileImage: profileImageToSave || "",
      isActive: true,
    });

    await newDoctor.save();

    res.status(201).json({
      message: "Doctor added successfully",
      doctor: newDoctor,
    });
  } catch (error) {
    console.log("Error in addDoctor controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllDoctorsAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 1000, specialization, search, isActive } = req.query;

    const pageNum = Number(page);
    const limitNumRaw = Number(limit);
    const pageSafe = Number.isFinite(pageNum) && pageNum > 0 ? Math.floor(pageNum) : 1;
    const limitSafe = Number.isFinite(limitNumRaw) && limitNumRaw > 0
      ? Math.min(500, Math.floor(limitNumRaw)) // Reduced max limit
      : 200; // Reduced default limit
    
    const query = {};
    
    if (specialization) {
      query.specialization = specialization;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { qualification: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Run query and count in parallel
    const [doctors, total] = await Promise.all([
      Doctor.find(query)
        .select("-availableSlots -bio") // Exclude more fields
        .sort({ createdAt: -1 })
        .limit(limitSafe)
        .skip((pageSafe - 1) * limitSafe)
        .lean(),
      Doctor.countDocuments(query)
    ]);

    // Admin doctor list must be fresh (salary/status changes should reflect immediately).
    res.set("Cache-Control", "no-store");

    res.status(200).json({
      doctors,
      totalPages: Math.ceil(total / limitSafe),
      currentPage: pageSafe,
      total,
    });
  } catch (error) {
    console.log("Error in getAllDoctorsAdmin controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const hasCloudinaryConfig =
      !!process.env.CLOUDINARY_CLOUD_NAME &&
      !!process.env.CLOUDINARY_API_KEY &&
      !!process.env.CLOUDINARY_API_SECRET;

    // Support updating profile picture via URL or data URL.
    if (Object.prototype.hasOwnProperty.call(updateData, "profileImage")) {
      const raw = typeof updateData.profileImage === "string" ? updateData.profileImage.trim() : "";

      if (!raw) {
        // Allow clearing the profile image by sending an empty string.
        updateData.profileImage = "";
      } else if (hasCloudinaryConfig) {
        try {
          const uploadResult = await cloudinary.uploader.upload(raw, {
            folder: "clinic-app/doctor-profile-images",
          });
          updateData.profileImage = uploadResult.secure_url;
        } catch (uploadError) {
          console.error("Cloudinary upload failed (admin doctor profile image):", uploadError);
          return res.status(502).json({ message: "Failed to upload profile picture. Please try again." });
        }
      } else {
        if (raw.length > 8_000_000) {
          return res.status(413).json({ message: "Profile picture is too large. Please upload a smaller image." });
        }
        updateData.profileImage = raw;
      }
    }

    // Validate specialization if provided
    if (updateData.specialization) {
      const validSpecializations = [
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
      ];

      if (!validSpecializations.includes(updateData.specialization)) {
        return res.status(400).json({ message: "Invalid specialization" });
      }
    }

    // Check if email is being updated and if it already exists
    if (updateData.email) {
      const existingDoctor = await Doctor.findOne({ 
        email: updateData.email, 
        _id: { $ne: id } 
      });
      if (existingDoctor) {
        return res.status(400).json({ message: "Doctor with this email already exists" });
      }
    }

    const updatedDoctor = await Doctor.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedDoctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.status(200).json({
      message: "Doctor updated successfully",
      doctor: updatedDoctor,
    });
  } catch (error) {
    console.log("Error in updateDoctor controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Soft delete - just deactivate the doctor
    await Doctor.findByIdAndUpdate(id, { isActive: false });

    res.status(200).json({ message: "Doctor deactivated successfully" });
  } catch (error) {
    console.log("Error in deleteDoctor controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const toggleDoctorStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    doctor.isActive = !doctor.isActive;
    await doctor.save();

    res.status(200).json({
      message: `Doctor ${doctor.isActive ? 'activated' : 'deactivated'} successfully`,
      doctor,
    });
  } catch (error) {
    console.log("Error in toggleDoctorStatus controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.status(200).json(doctor);
  } catch (error) {
    console.log("Error in getDoctorById controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAdminStats = async (req, res) => {
  try {
    // Run all count queries in parallel for better performance
    const [
      totalDoctors,
      activeDoctors,
      inactiveDoctors,
      totalUsers,
      adminUsers,
      regularUsers,
      doctorsBySpecialization
    ] = await Promise.all([
      Doctor.countDocuments(),
      Doctor.countDocuments({ isActive: true }),
      Doctor.countDocuments({ isActive: false }),
      User.countDocuments(),
      User.countDocuments({ isAdmin: true }),
      User.countDocuments({ isAdmin: false }),
      Doctor.aggregate([
        { $group: { _id: "$specialization", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    // Set cache headers for stats (cache for 5 minutes - stats don't change frequently)
    res.set("Cache-Control", "private, max-age=300");

    res.status(200).json({
      doctors: {
        total: totalDoctors,
        active: activeDoctors,
        inactive: inactiveDoctors,
      },
      users: {
        total: totalUsers,
        admins: adminUsers,
        regular: regularUsers,
      },
      doctorsBySpecialization,
    });
  } catch (error) {
    console.log("Error in getAdminStats controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllUsersAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, isActive } = req.query;

    // Cap limit to prevent excessive data
    const safeLimit = Math.min(parseInt(limit) || 50, 200);
    const safePage = Math.max(parseInt(page) || 1, 1);

    const andConditions = [
      { isAdmin: false },
      // Filter out stray test user that should not appear in admin user management.
      { fullName: { $ne: "Pw Test" } },
    ];

    if (search) {
      andConditions.push({
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      });
    }

    if (isActive !== undefined) {
      if (isActive === "true") {
        // Treat missing isActive as active for older documents.
        andConditions.push({ $or: [{ isActive: true }, { isActive: { $exists: false } }] });
      } else if (isActive === "false") {
        andConditions.push({ isActive: false });
      }
    }

    const query = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    // Run query and count in parallel
    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password -address -allergies")
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .skip((safePage - 1) * safeLimit)
        .lean(),
      User.countDocuments(query)
    ]);

    // Set cache headers for smooth experience
    res.set("Cache-Control", "private, max-age=300");

    res.status(200).json({
      users,
      totalPages: Math.ceil(total / safeLimit),
      currentPage: safePage,
      total,
    });
  } catch (error) {
    console.log("Error in getAllUsersAdmin controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isAdmin) {
      return res.status(400).json({ message: "Cannot change admin status" });
    }

    const currentlyActive = user.isActive !== false;
    user.isActive = !currentlyActive;
    await user.save();

    const safeUser = await User.findById(user._id).select("-password");

    return res.status(200).json({
      message: `User ${safeUser.isActive ? "activated" : "deactivated"} successfully`,
      user: safeUser,
    });
  } catch (error) {
    console.log("Error in toggleUserStatus controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
