import Appointment from "../models/appointment.model.js";
import Doctor from "../models/doctor.model.js";
import DoctorAuth from "../models/doctorAuth.model.js";

export const getDoctorAppointments = async (req, res) => {
  try {
    const doctorAuth = await DoctorAuth.findById(req.doctorId);
    if (!doctorAuth) {
      return res.status(401).json({ message: "Doctor not found" });
    }

    const { status, page = 1, limit = 10, date } = req.query;
    
    // Build query
    const query = { doctor: doctorAuth.doctorProfile };
    
    if (typeof status === "string" && status.trim() && status.trim().toLowerCase() !== "all") {
      const normalizedStatus = status.trim().toLowerCase();

      // Backward compatible: some older appointment docs may be missing `status`.
      // The UI shows missing status as "Pending", so the Pending filter should include them.
      if (normalizedStatus === "pending") {
        query.$or = [
          { status: "pending" },
          { status: { $exists: false } },
          { status: null },
          { status: "" },
        ];
      } else {
        query.status = normalizedStatus;
      }
    }
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.appointmentDate = {
        $gte: startDate,
        $lt: endDate
      };
    }

    const skip = (page - 1) * limit;
    
    const appointments = await Appointment.find(query)
      .populate('patient', 'fullName email phone')
      .populate('doctor', 'name specialization')
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(query);

    res.status(200).json({
      appointments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.log("Error in getDoctorAppointments controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const respondToAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, responseMessage } = req.body;

    if (!['confirmed', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Use 'confirmed' or 'rejected'" });
    }

    const doctorAuth = await DoctorAuth.findById(req.doctorId);
    if (!doctorAuth) {
      return res.status(401).json({ message: "Doctor not found" });
    }

    const appointment = await Appointment.findOne({
      _id: id,
      doctor: doctorAuth.doctorProfile
    }).populate('patient', 'fullName email phone');

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment.status !== 'pending') {
      return res.status(400).json({ message: "Appointment has already been responded to" });
    }

    // Update appointment
    appointment.status = status;
    appointment.doctorResponse = {
      respondedAt: new Date(),
      responseMessage: responseMessage || ''
    };

    // Set confirmation sent flag if confirmed
    if (status === 'confirmed') {
      appointment.confirmationSent = true;
      // Schedule reminder for 24 hours before appointment
      const appointmentDateTime = new Date(`${appointment.appointmentDate.toDateString()} ${appointment.appointmentTime}`);
      const reminderTime = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);
      appointment.reminderScheduled = reminderTime;
    }

    await appointment.save();

    res.status(200).json({
      message: `Appointment ${status} successfully`,
      appointment
    });
  } catch (error) {
    console.log("Error in respondToAppointment controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateAppointmentNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, prescription } = req.body;

    const doctorAuth = await DoctorAuth.findById(req.doctorId);
    if (!doctorAuth) {
      return res.status(401).json({ message: "Doctor not found" });
    }

    const appointment = await Appointment.findOne({
      _id: id,
      doctor: doctorAuth.doctorProfile
    }).populate('patient', 'fullName email phone');

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Update notes and prescription
    if (notes !== undefined) appointment.notes = notes;
    if (prescription !== undefined) appointment.prescription = prescription;

    await appointment.save();

    res.status(200).json({
      message: "Appointment updated successfully",
      appointment
    });
  } catch (error) {
    console.log("Error in updateAppointmentNotes controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const completeAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { notes, prescription } = body;

    const doctorAuth = await DoctorAuth.findById(req.doctorId);
    if (!doctorAuth) {
      return res.status(401).json({ message: "Doctor not found" });
    }

    const appointment = await Appointment.findOne({
      _id: id,
      doctor: doctorAuth.doctorProfile
    }).populate('patient', 'fullName email phone');

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const normalizedStatus = typeof appointment.status === "string" ? appointment.status.toLowerCase() : "";
    // Backward compatible: some older flows used "accepted" for what is now "confirmed".
    if (normalizedStatus !== "confirmed" && normalizedStatus !== "accepted") {
      return res.status(400).json({
        message: `Only confirmed appointments can be completed (current: ${appointment.status || "pending"})`,
      });
    }

    // Update appointment
    appointment.status = 'completed';
    if (notes) appointment.notes = notes;
    if (prescription) appointment.prescription = prescription;

    await appointment.save();

    res.status(200).json({
      message: "Appointment completed successfully",
      appointment
    });
  } catch (error) {
    console.log("Error in completeAppointment controller", error);
    const message =
      error?.name === "ValidationError" || error?.name === "CastError"
        ? error.message
        : "Internal server error";
    res.status(500).json({ message });
  }
};

export const getDoctorStats = async (req, res) => {
  try {
    const doctorAuth = await DoctorAuth.findById(req.doctorId);
    if (!doctorAuth) {
      return res.status(401).json({ message: "Doctor not found" });
    }

    const doctorId = doctorAuth.doctorProfile;

    // Total appointments for this doctor (all time, all statuses)
    const totalAppointments = await Appointment.countDocuments({
      doctor: doctorId,
    });

    // Get today's appointments
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const todayAppointments = await Appointment.countDocuments({
      doctor: doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay }
    });

    // Get pending appointments
    const pendingAppointments = await Appointment.countDocuments({
      doctor: doctorId,
      $or: [
        { status: "pending" },
        { status: { $exists: false } },
        { status: null },
        { status: "" },
      ],
    });

    // Get this month's appointments
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyAppointments = await Appointment.countDocuments({
      doctor: doctorId,
      appointmentDate: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // Get completed appointments count
    const completedAppointments = await Appointment.countDocuments({
      doctor: doctorId,
      status: 'completed'
    });

    res.status(200).json({
      total: totalAppointments,
      today: todayAppointments,
      pending: pendingAppointments,
      monthly: monthlyAppointments,
      completed: completedAppointments
    });
  } catch (error) {
    console.log("Error in getDoctorStats controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
