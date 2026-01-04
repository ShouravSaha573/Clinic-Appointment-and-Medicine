import LabBooking from "../models/labBooking.model.js";
import LabTest from "../models/labTest.model.js";
import User from "../models/user.model.js";
import LabReport from "../models/labReport.model.js";
import NotificationService from "../services/notificationService.js";

// Create a new lab booking
export const createLabBooking = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      tests,
      appointmentDate,
      timeSlot,
      phoneNumber,
      paymentMethod = "cash_on_delivery",
      homeCollection,
      notes,
    } = req.body;

    const parseYmdLocal = (ymd) => {
      const parts = String(ymd || "").split("-").map((x) => parseInt(x, 10));
      if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
      const [y, m, d] = parts;
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    };

    const parseSlotStartMinutes = (slot) => {
      const s = String(slot || "").trim();
      const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)\b/i);
      if (!m) return null;
      let h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const ampm = m[3].toUpperCase();
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return h * 60 + min;
    };

    // Reject past dates/times (server local time)
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const ymd = String(appointmentDate || "").slice(0, 10);
    const requestedDay = parseYmdLocal(ymd);
    if (!requestedDay) {
      return res.status(400).json({ message: "Invalid appointment date" });
    }
    if (requestedDay.getTime() < todayLocal.getTime()) {
      return res.status(400).json({ message: "Appointment date cannot be in the past" });
    }
    if (requestedDay.getTime() === todayLocal.getTime()) {
      const startMinutes = parseSlotStartMinutes(timeSlot);
      if (startMinutes !== null) {
        const start = new Date(
          requestedDay.getFullYear(),
          requestedDay.getMonth(),
          requestedDay.getDate(),
          Math.floor(startMinutes / 60),
          startMinutes % 60,
          0,
          0
        );
        if (start.getTime() <= now.getTime()) {
          return res.status(400).json({ message: "Selected time slot is no longer available" });
        }
      }
    }

    // Validate tests exist and are active
    const testIds = tests.map(t => t.testId);
    const validTests = await LabTest.find({
      _id: { $in: testIds },
      isActive: true
    });

    if (validTests.length !== tests.length) {
      return res.status(400).json({ message: "Some tests are not available" });
    }

    // Calculate total amount
    let totalAmount = 0;
    for (const test of tests) {
      const labTest = validTests.find(t => t._id.toString() === test.testId.toString());
      totalAmount += labTest.price * (test.quantity || 1);
    }

    // Add home collection charge if applicable
    if (homeCollection && homeCollection.required) {
      totalAmount += 500; // 500 BDT home collection charge
    }

    // Generate booking number
    const bookingNumber = "LAB" + Date.now().toString().slice(-8);

    const labBooking = new LabBooking({
      userId,
      bookingNumber,
      tests,
      totalAmount,
      appointmentDate,
      timeSlot,
      phoneNumber,
      paymentMethod,
      homeCollection: homeCollection || { required: false },
      notes: notes || "",
    });

    await labBooking.save();

    // Populate the booking with test details
    await labBooking.populate("tests.testId", "name code price category");
    await labBooking.populate("userId", "fullName email phone");

    // Create admin notification for new lab booking
    try {
      await NotificationService.createLabBookingNotification(labBooking);
    } catch (notificationError) {
      console.error("Failed to create notification for lab booking:", notificationError);
      // Don't fail the booking creation if notification fails
    }

    res.status(201).json({
      message: "Lab booking created successfully",
      booking: labBooking,
    });
  } catch (error) {
    console.log("Error in createLabBooking controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get user's lab bookings
export const getUserLabBookings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, status } = req.query;

    const query = { userId };
    if (status && status !== "all") {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const bookings = await LabBooking.find(query)
      .populate("tests.testId", "name code price category")
      .populate("userId", "fullName email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LabBooking.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      bookings,
      pagination: {
        current: parseInt(page),
        pages: totalPages,
        total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.log("Error in getUserLabBookings controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get single lab booking by ID
export const getLabBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const booking = await LabBooking.findOne({
      _id: id,
      userId: userId,
    })
      .populate("tests.testId", "name code price category description preparation")
      .populate("userId", "fullName email phone");

    if (!booking) {
      return res.status(404).json({ message: "Lab booking not found" });
    }

    res.status(200).json(booking);
  } catch (error) {
    console.log("Error in getLabBookingById controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Cancel lab booking
export const cancelLabBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { reason } = req.body;

    const booking = await LabBooking.findOne({
      _id: id,
      userId: userId,
    });

    if (!booking) {
      return res.status(404).json({ message: "Lab booking not found" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Booking already cancelled" });
    }

    if (booking.status === "completed") {
      return res.status(400).json({ message: "Cannot cancel completed booking" });
    }

    // Check if booking is within cancellation window (24 hours before appointment)
    const appointmentTime = new Date(booking.appointmentDate);
    const now = new Date();
    const timeDiff = appointmentTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);

    if (hoursDiff < 24) {
      return res.status(400).json({
        message: "Cancellation not allowed less than 24 hours before appointment"
      });
    }

    booking.status = "cancelled";
    booking.cancellationReason = reason;
    booking.cancelledAt = new Date();

    await booking.save();

    res.status(200).json({
      message: "Lab booking cancelled successfully",
      booking,
    });
  } catch (error) {
    console.log("Error in cancelLabBooking controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Admin: Get all lab bookings
export const getAllLabBookings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      includeReported,
    } = req.query;

    // Cap limit for performance
    const safeLimit = Math.min(parseInt(limit) || 10, 100);
    const safePage = Math.max(parseInt(page) || 1, 1);

    const query = {};

    // By default, hide bookings that already have a lab report.
    // This matches the admin UX expectation: once a report is created, the booking should no longer appear here.
    const shouldHideReported = String(includeReported || "").toLowerCase() !== "true";
    if (shouldHideReported) {
      const reportedIds = await LabReport.distinct("labBooking", {});
      if (Array.isArray(reportedIds) && reportedIds.length > 0) {
        query._id = { $nin: reportedIds };
      }
    }

    // Filter by status
    if (status && status !== "all") {
      query.status = status;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { bookingNumber: { $regex: search, $options: "i" } },
        { "patientInfo.name": { $regex: search, $options: "i" } },
        { "contactInfo.phone": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (safePage - 1) * safeLimit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Run query and count in parallel for better performance
    const [bookings, total] = await Promise.all([
      LabBooking.find(query)
        .populate("tests.testId", "name code price category")
        .populate("userId", "fullName email phone profilePic")
        .sort(sortOptions)
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      LabBooking.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / safeLimit);

    // Set cache headers
    res.set("Cache-Control", "private, max-age=60");

    res.status(200).json({
      bookings,
      pagination: {
        current: safePage,
        pages: totalPages,
        total,
        hasNext: safePage < totalPages,
        hasPrev: safePage > 1,
      },
    });
  } catch (error) {
    console.log("Error in getAllLabBookings controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Admin: Update booking status
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const booking = await LabBooking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Lab booking not found" });
    }

    booking.status = status;
    if (notes) {
      booking.adminNotes = notes;
    }

    if (status === "sample_collected") {
      booking.sampleCollectedAt = new Date();
    } else if (status === "completed") {
      booking.completedAt = new Date();
    }

    await booking.save();

    res.status(200).json({
      message: "Booking status updated successfully",
      booking,
    });
  } catch (error) {
    console.log("Error in updateBookingStatus controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Admin: Accept lab booking
export const acceptLabBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const booking = await LabBooking.findById(id)
      .populate("tests.testId", "name code price category")
      .populate("userId", "fullName email phone");

    if (!booking) {
      return res.status(404).json({ message: "Lab booking not found" });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ message: "Only pending bookings can be accepted" });
    }

    booking.status = "confirmed";
    booking.adminNotes = notes || "Booking approved by admin";

    await booking.save();

    res.status(200).json({
      message: "Lab booking accepted successfully",
      booking,
    });
  } catch (error) {
    console.log("Error in acceptLabBooking controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Admin: Reject lab booking
export const rejectLabBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await LabBooking.findById(id)
      .populate("tests.testId", "name code price category")
      .populate("userId", "fullName email phone");

    if (!booking) {
      return res.status(404).json({ message: "Lab booking not found" });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ message: "Only pending bookings can be rejected" });
    }

    booking.status = "cancelled";
    booking.cancellationReason = reason || "Rejected by admin";
    booking.cancelledAt = new Date();
    booking.adminNotes = reason || "Booking rejected by admin";

    await booking.save();

    res.status(200).json({
      message: "Lab booking rejected successfully",
      booking,
    });
  } catch (error) {
    console.log("Error in rejectLabBooking controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get available time slots for a date
export const getAvailableTimeSlots = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    // Define available time slots
    const allTimeSlots = [
      "8:00 AM - 9:00 AM",
      "9:00 AM - 10:00 AM",
      "10:00 AM - 11:00 AM",
      "11:00 AM - 12:00 PM",
      "2:00 PM - 3:00 PM",
      "3:00 PM - 4:00 PM",
      "4:00 PM - 5:00 PM",
      "5:00 PM - 6:00 PM",
    ];

    const parseYmdLocal = (ymd) => {
      const parts = String(ymd || "").split("-").map((x) => parseInt(x, 10));
      if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
      const [y, m, d] = parts;
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    };

    const parseSlotStartMinutes = (slot) => {
      const s = String(slot || "").trim();
      const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)\b/i);
      if (!m) return null;
      let h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const ampm = m[3].toUpperCase();
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return h * 60 + min;
    };

    const requestedDay = parseYmdLocal(date);
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const isToday = requestedDay && requestedDay.getTime() === todayLocal.getTime();

    // If the requested date is in the past (server local time), no slots should be available.
    if (requestedDay && requestedDay.getTime() < todayLocal.getTime()) {
      return res.status(200).json({
        date,
        availableSlots: [],
        bookedSlots: [],
      });
    }

    // Find booked slots for the date
    const bookedSlots = await LabBooking.find({
      appointmentDate: {
        $gte: new Date(date + "T00:00:00.000Z"),
        $lte: new Date(date + "T23:59:59.999Z"),
      },
      status: { $in: ["pending", "confirmed", "sample_collected", "processing"] },
    }).distinct("timeSlot");

    // Filter out booked slots
    let availableSlots = allTimeSlots.filter((slot) => !bookedSlots.includes(slot));

    // If the requested date is today (server local time), remove slots that have already started
    if (isToday) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      availableSlots = availableSlots.filter((slot) => {
        const start = parseSlotStartMinutes(slot);
        if (start === null) return true;
        return start > nowMinutes;
      });
    }

    res.status(200).json({
      date,
      availableSlots,
      bookedSlots,
    });
  } catch (error) {
    console.log("Error in getAvailableTimeSlots controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get lab booking statistics (for admin dashboard)
export const getLabBookingStats = async (req, res) => {
  try {
    const totalBookings = await LabBooking.countDocuments();
    const bookingsByStatus = await LabBooking.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const monthlyRevenue = await LabBooking.aggregate([
      {
        $match: {
          status: { $in: ["confirmed", "sample_collected", "processing", "completed"] },
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      },
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }
    ]);

    const todaysBookings = await LabBooking.countDocuments({
      appointmentDate: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lte: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    });

    res.status(200).json({
      totalBookings,
      bookingsByStatus,
      monthlyRevenue: monthlyRevenue[0]?.totalRevenue || 0,
      todaysBookings,
    });
  } catch (error) {
    console.log("Error in getLabBookingStats controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
