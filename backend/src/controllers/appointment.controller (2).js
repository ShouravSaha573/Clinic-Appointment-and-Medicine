import Appointment from "../models/appointment.model.js";
import Doctor from "../models/doctor.model.js";
import User from "../models/user.model.js";
export const createAppointment = async (req, res) => {
  try {
    const {
      doctorId,
      appointmentDate,
      appointmentTime,
      reason,
      duration = 30,
      guestPatient,
    } = req.body;

    // For authenticated users, get userId from middleware
    // For guest users, guestPatient will be provided
    const userId = req.user?._id;
    const isGuestAppointment = !userId && guestPatient;

    // Validate doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Validate input
    if (!isGuestAppointment && !userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (isGuestAppointment) {
      const { name, email, phone, age, gender } = guestPatient;
      if (!name || !email || !phone || !age || !gender) {
        return res.status(400).json({ message: "All guest patient details are required" });
      }
    }

    // Check if the appointment slot is already booked
    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      status: { $in: ["pending", "confirmed"] },
    });

    if (existingAppointment) {
      return res.status(400).json({ message: "This time slot is already booked" });
    }

    // Validate appointment date is not in the past
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    if (appointmentDateTime <= new Date()) {
      return res.status(400).json({ message: "Cannot book appointment in the past" });
    }

    // Create appointment
    const appointmentData = {
      doctor: doctorId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      reason,
      duration,
      fees: doctor.consultationFee,
    };

    // Add patient data based on appointment type
    if (isGuestAppointment) {
      appointmentData.guestPatient = guestPatient;
    } else {
      appointmentData.patient = userId;
    }

    const appointment = new Appointment(appointmentData);

    await appointment.save();

    // Populate doctor info
    await appointment.populate("doctor", "name specialization consultationFee");
    
    // Only populate patient info if it's not a guest appointment
    if (!isGuestAppointment) {
      await appointment.populate("patient", "fullName email");
    }

    // Create admin notification for new appointment
    res.status(201).json({
      message: "Appointment booked successfully",
      appointment,
    });
  } catch (error) {
    console.log("Error in createAppointment:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserAppointments = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { patient: userId };
    if (status && status !== "all") {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const appointments = await Appointment.find(query)
      .populate("doctor", "name specialization profileImage consultationFee")
      .populate("patient", "fullName email")
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(query);

    res.status(200).json({
      appointments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.log("Error in getUserAppointments:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const appointment = await Appointment.findOne({
      _id: id,
      patient: userId,
    })
      .populate("doctor", "name specialization profileImage qualification experience consultationFee")
      .populate("patient", "fullName email phone");

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.status(200).json(appointment);
  } catch (error) {
    console.log("Error in getAppointmentById:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const appointment = await Appointment.findOne({
      _id: id,
      patient: userId,
    });

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Check if appointment can be cancelled (not in the past and not already completed)
    const appointmentDateTime = new Date(`${appointment.appointmentDate.toISOString().split('T')[0]}T${appointment.appointmentTime}`);
    const now = new Date();
    const timeDifference = appointmentDateTime - now;
    const hoursDifference = timeDifference / (1000 * 60 * 60);

    if (hoursDifference < 2) {
      return res.status(400).json({ 
        message: "Cannot cancel appointment less than 2 hours before scheduled time" 
      });
    }

    if (appointment.status === "completed" || appointment.status === "cancelled") {
      return res.status(400).json({ 
        message: `Cannot cancel ${appointment.status} appointment` 
      });
    }

    appointment.status = "cancelled";
    await appointment.save();

    res.status(200).json({
      message: "Appointment cancelled successfully",
      appointment,
    });
  } catch (error) {
    console.log("Error in cancelAppointment:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { appointmentDate, appointmentTime } = req.body;
    const userId = req.user._id;

    const appointment = await Appointment.findOne({
      _id: id,
      patient: userId,
    });

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment.status === "completed" || appointment.status === "cancelled") {
      return res.status(400).json({ 
        message: `Cannot reschedule ${appointment.status} appointment` 
      });
    }

    // Check if the new slot is available
    const existingAppointment = await Appointment.findOne({
      doctor: appointment.doctor,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      status: { $in: ["pending", "confirmed"] },
      _id: { $ne: id },
    });

    if (existingAppointment) {
      return res.status(400).json({ message: "This time slot is already booked" });
    }

    // Validate new appointment date is not in the past
    const newAppointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    if (newAppointmentDateTime <= new Date()) {
      return res.status(400).json({ message: "Cannot reschedule to a past date/time" });
    }

    appointment.appointmentDate = new Date(appointmentDate);
    appointment.appointmentTime = appointmentTime;
    appointment.status = "pending";
    
    await appointment.save();

    await appointment.populate("doctor", "name specialization consultationFee");
    await appointment.populate("patient", "fullName email");

    res.status(200).json({
      message: "Appointment rescheduled successfully",
      appointment,
    });
  } catch (error) {
    console.log("Error in rescheduleAppointment:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getBookedSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    const bookedAppointments = await Appointment.find({
      doctor: doctorId,
      appointmentDate: new Date(date),
      status: { $in: ["pending", "confirmed"] },
    }).select("appointmentTime");

    const bookedSlots = bookedAppointments.map(apt => apt.appointmentTime);

    res.status(200).json({ bookedSlots });
  } catch (error) {
    console.log("Error in getBookedSlots:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
