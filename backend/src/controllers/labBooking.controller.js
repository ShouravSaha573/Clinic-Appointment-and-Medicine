import LabBooking from "../models/labBooking.model.js";
import LabTest from "../models/labTest.model.js";
import User from "../models/user.model.js";
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
    } = req.query;

    const query = {};

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

    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const bookings = await LabBooking.find(query)
      .populate("tests.testId", "name code price category")
      .populate("userId", "fullName email phone")
      .sort(sortOptions)
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

    if (booking.status !== "confirmed") {
      return res.status(400).json({ message: "Only confirmed bookings can be accepted" });
    }

    booking.status = "sample_collected";
    booking.sampleCollectedAt = new Date();
    booking.adminNotes = notes || "Booking accepted by admin";

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

    if (booking.status === "completed" || booking.status === "cancelled") {
      return res.status(400).json({ message: "Cannot reject completed or cancelled bookings" });
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

    // Find booked slots for the date
    const bookedSlots = await LabBooking.find({
      appointmentDate: {
        $gte: new Date(date + "T00:00:00.000Z"),
        $lte: new Date(date + "T23:59:59.999Z"),
      },
      status: { $in: ["confirmed", "sample_collected", "processing"] },
    }).distinct("timeSlot");

    // Filter out booked slots
    const availableSlots = allTimeSlots.filter(
      (slot) => !bookedSlots.includes(slot)
    );

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
