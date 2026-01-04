import LabReport from "../models/labReport.model.js";
import LabBooking from "../models/labBooking.model.js";
import LabTest from "../models/labTest.model.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(process.cwd(), "uploads", "lab-reports");
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Allow pdf, jpg, jpeg, png files
  const allowedTypes = /pdf|jpg|jpeg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only PDF, JPG, JPEG, and PNG files are allowed"));
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Get user's lab reports
export const getUserLabReports = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, status } = req.query;

    const query = { patient: userId }; // Changed from userId to patient
    if (status && status !== "all") {
      query.overallStatus = status; // Changed from status to overallStatus
    }

    const skip = (page - 1) * limit;

    const reports = await LabReport.find(query)
      .populate("labBooking", "bookingNumber appointmentDate")
      .populate("patient", "fullName email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LabReport.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      reports,
      pagination: {
        current: parseInt(page),
        pages: totalPages,
        total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.log("Error in getUserLabReports controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get single lab report by ID
export const getLabReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const report = await LabReport.findOne({
      _id: id,
      patient: userId, // Changed from userId to patient
    })
      .populate("labBooking", "bookingNumber appointmentDate patientInfo")
      .populate("patient", "fullName email phone");

    if (!report) {
      return res.status(404).json({ message: "Lab report not found" });
    }

    res.status(200).json(report);
  } catch (error) {
    console.log("Error in getLabReportById controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Download lab report file
export const downloadLabReport = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const report = await LabReport.findOne({
      _id: id,
      patient: userId, // Changed from userId to patient
    });

    if (!report) {
      return res.status(404).json({ message: "Lab report not found" });
    }

    if (!report.reportFiles || report.reportFiles.length === 0) {
      return res.status(404).json({ message: "Report file not found" });
    }

    // Get the first report file
    const reportFile = report.reportFiles[0];
    const filePath = path.join(process.cwd(), "uploads", "lab-reports", reportFile.fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Report file not found on server" });
    }

    const fileName = `Lab_Report_${report.reportNumber}${path.extname(reportFile.fileName)}`;
    res.download(filePath, fileName);
  } catch (error) {
    console.log("Error in downloadLabReport controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Admin: Get all lab reports
export const getAllLabReports = async (req, res) => {
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
      query.overallStatus = status; // Changed from status to overallStatus
    }

    // Search functionality
    if (search) {
      const bookingIds = await LabBooking.find({
        $or: [
          { bookingNumber: { $regex: search, $options: "i" } },
          { "patientInfo.name": { $regex: search, $options: "i" } },
        ],
      }).distinct("_id");

      query.$or = [
        { reportNumber: { $regex: search, $options: "i" } },
        { labBooking: { $in: bookingIds } }, // Changed from bookingId to labBooking
      ];
    }

    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Run query and count in parallel for better performance
    const [reports, total] = await Promise.all([
      LabReport.find(query)
        .populate("labBooking", "bookingNumber appointmentDate patientInfo")
        .populate("patient", "fullName email phone profilePic")
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      LabReport.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      reports,
      pagination: {
        current: parseInt(page),
        pages: totalPages,
        total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.log("Error in getAllLabReports controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Admin: Create lab report
export const createLabReport = async (req, res) => {
  try {
    const {
      bookingId,
      testId,
      userId,
      results,
      remarks,
      deliveryMethod,
    } = req.body;

    // Verify booking exists and is completed
    const booking = await LabBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "completed" && booking.status !== "processing") {
      return res.status(400).json({ message: "Booking must be completed or processing" });
    }

    // Check if report already exists for this booking and test
    const existingReport = await LabReport.findOne({ bookingId, testId });
    if (existingReport) {
      return res.status(400).json({ message: "Report already exists for this test" });
    }

    // Generate report number
    const reportNumber = "RPT" + Date.now().toString().slice(-8);

    const reportData = {
      reportNumber,
      bookingId,
      testId,
      userId,
      results: JSON.parse(results),
      remarks,
      deliveryMethod,
      status: "pending",
    };

    // Handle file upload if present
    if (req.file) {
      reportData.reportFile = req.file.filename;
    }

    const labReport = new LabReport(reportData);
    await labReport.save();

    // Populate the report
    await labReport.populate("bookingId", "bookingNumber appointmentDate patientInfo");
    await labReport.populate("testId", "name code category");
    await labReport.populate("userId", "fullName email phone");

    res.status(201).json({
      message: "Lab report created successfully",
      report: labReport,
    });
  } catch (error) {
    console.log("Error in createLabReport controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Admin: Create lab report with flexible booking selection
export const createFlexibleLabReport = async (req, res) => {
  try {
    const {
      labBooking,
      patient,
      testResults,
      overallStatus,
      testedBy,
      verifiedBy,
      additionalNotes,
      deliveryMethod,
      isReportReady
    } = req.body;

    // Verify booking exists
    const booking = await LabBooking.findById(labBooking)
      .populate("userId", "fullName email phone")
      .populate("tests.testId", "name code category");

    if (!booking) {
      return res.status(404).json({ message: "Lab booking not found" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Cannot create a lab report for a cancelled booking" });
    }

    const normalizedStatus = String(booking.status || "").toLowerCase();
    if (normalizedStatus !== "completed") {
      return res.status(400).json({ message: "Lab booking must be marked done before creating a lab report" });
    }

    const parseSlotMinutes = (timeStr) => {
      const s = String(timeStr || "").trim();
      const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!m) return null;
      let h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const ampm = m[3].toUpperCase();
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return h * 60 + min;
    };

    const getSlotEndMinutes = (slot) => {
      const parts = String(slot || "").split("-").map((p) => p.trim());
      if (parts.length < 2) return null;
      return parseSlotMinutes(parts[1]);
    };

    const bookingStatus = String(booking.status || "").toLowerCase();
    if ((bookingStatus === "pending" || bookingStatus === "confirmed") && booking.appointmentDate && booking.timeSlot) {
      const endMinutes = getSlotEndMinutes(booking.timeSlot);
      if (endMinutes !== null) {
        const d = new Date(booking.appointmentDate);
        const endTime = new Date(
          d.getFullYear(),
          d.getMonth(),
          d.getDate(),
          Math.floor(endMinutes / 60),
          endMinutes % 60,
          0,
          0
        );
        if (Date.now() > endTime.getTime()) {
          return res.status(400).json({ message: "Cannot create a lab report for an overdue booking" });
        }
      }
    }

    // Check if report already exists for this booking
    const existingReport = await LabReport.findOne({ labBooking });
    if (existingReport) {
      return res.status(400).json({ message: "Report already exists for this booking" });
    }

    // Create the report
    const reportData = {
      labBooking,
      patient: patient || booking.userId._id,
      testResults: testResults || [],
      overallStatus: overallStatus || "normal",
      testedBy: testedBy || {
        name: "Lab Technician",
        designation: "Lab Technician"
      },
      verifiedBy: verifiedBy || {
        name: "Dr. Pathologist",
        designation: "Pathologist",
        verifiedAt: new Date()
      },
      additionalNotes: additionalNotes || "",
      deliveryMethod: deliveryMethod || "online",
      isReportReady: isReportReady !== undefined ? isReportReady : true
    };

    const labReport = new LabReport(reportData);
    await labReport.save();

    // Populate the report
    await labReport.populate("labBooking", "bookingNumber appointmentDate tests");
    await labReport.populate("patient", "fullName email phone");

    res.status(201).json({
      message: "Lab report created successfully",
      report: labReport,
    });
  } catch (error) {
    console.log("Error in createFlexibleLabReport controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Admin: Update lab report
export const updateLabReport = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body || {};

    // Parse payloads when sent as strings
    if (typeof updateData.testResults === "string") {
      try {
        updateData.testResults = JSON.parse(updateData.testResults);
      } catch {
        return res.status(400).json({ message: "Invalid testResults JSON" });
      }
    }
    if (typeof updateData.testedBy === "string") {
      try {
        updateData.testedBy = JSON.parse(updateData.testedBy);
      } catch {
        return res.status(400).json({ message: "Invalid testedBy JSON" });
      }
    }
    if (typeof updateData.verifiedBy === "string") {
      try {
        updateData.verifiedBy = JSON.parse(updateData.verifiedBy);
      } catch {
        return res.status(400).json({ message: "Invalid verifiedBy JSON" });
      }
    }

    const existingReport = await LabReport.findById(id);
    if (!existingReport) {
      return res.status(404).json({ message: "Lab report not found" });
    }

    // Apply allowed updates (schema-aligned)
    const allowed = [
      "overallStatus",
      "reportDate",
      "additionalNotes",
      "isReportReady",
      "deliveryMethod",
      "criticalValues",
      "doctorNotified",
      "patientNotified",
      "deliveredAt",
    ];

    for (const key of allowed) {
      if (updateData[key] !== undefined) {
        existingReport[key] = updateData[key];
      }
    }

    if (updateData.testResults !== undefined) {
      if (!Array.isArray(updateData.testResults)) {
        return res.status(400).json({ message: "testResults must be an array" });
      }
      existingReport.testResults = updateData.testResults;
    }

    if (updateData.testedBy !== undefined) {
      existingReport.testedBy = updateData.testedBy;
    }

    if (updateData.verifiedBy !== undefined) {
      existingReport.verifiedBy = updateData.verifiedBy;
    }

    // Optional file upload: add as a reportFiles entry.
    if (req.file) {
      const fileName = req.file.filename;
      const ext = path.extname(fileName).toLowerCase();
      const fileType = ext === ".pdf" ? "pdf" : "image";
      existingReport.reportFiles = existingReport.reportFiles || [];
      existingReport.reportFiles.push({
        fileName,
        fileUrl: `/uploads/lab-reports/${fileName}`,
        fileType,
      });
    }

    const labReport = await existingReport.save();

    await labReport.populate("labBooking", "bookingNumber appointmentDate patientInfo tests");
    await labReport.populate("patient", "fullName email phone");

    res.status(200).json({
      message: "Lab report updated successfully",
      report: labReport,
    });
  } catch (error) {
    console.log("Error in updateLabReport controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Admin: Verify lab report
export const verifyLabReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationNotes } = req.body;
    const verifierId = req.user._id; // Admin who is verifying

    const labReport = await LabReport.findById(id);
    if (!labReport) {
      return res.status(404).json({ message: "Lab report not found" });
    }

    if (labReport.status === "verified") {
      return res.status(400).json({ message: "Report already verified" });
    }

    labReport.status = "verified";
    labReport.verifiedBy = verifierId;
    labReport.verifiedAt = new Date();
    labReport.verificationNotes = verificationNotes;

    await labReport.save();

    await labReport.populate("bookingId", "bookingNumber appointmentDate patientInfo");
    await labReport.populate("testId", "name code category");
    await labReport.populate("verifiedBy", "fullName");

    res.status(200).json({
      message: "Lab report verified successfully",
      report: labReport,
    });
  } catch (error) {
    console.log("Error in verifyLabReport controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Admin: Delete lab report
export const deleteLabReport = async (req, res) => {
  try {
    const { id } = req.params;

    const labReport = await LabReport.findById(id);
    if (!labReport) {
      return res.status(404).json({ message: "Lab report not found" });
    }

    // Delete associated file if exists
    if (labReport.reportFile) {
      const filePath = path.join(process.cwd(), "uploads", "lab-reports", labReport.reportFile);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await LabReport.findByIdAndDelete(id);

    res.status(200).json({
      message: "Lab report deleted successfully",
    });
  } catch (error) {
    console.log("Error in deleteLabReport controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get lab report statistics (for admin dashboard)
export const getLabReportStats = async (req, res) => {
  try {
    const totalReports = await LabReport.countDocuments();
    const reportsByStatus = await LabReport.aggregate([
      { $group: { _id: "$overallStatus", count: { $sum: 1 } } }, // Changed from status to overallStatus
      { $sort: { count: -1 } }
    ]);

    const todaysReports = await LabReport.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lte: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    });

    const pendingReview = await LabReport.countDocuments({
      overallStatus: "pending_review" // Changed from status: "pending" to overallStatus: "pending_review"
    });

    res.status(200).json({
      totalReports,
      reportsByStatus,
      todaysReports,
      pendingReview,
    });
  } catch (error) {
    console.log("Error in getLabReportStats controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
